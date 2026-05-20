import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExtractedNutrition = {
  name?: string;
  brand?: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
};

const InputSchema = z.object({
  imageUrl: z.string().url().max(2048),
});

const SYSTEM_PROMPT = `You extract nutrition facts from a food product label photo.

Return ONLY the values per 100g (or per 100ml if liquid). If the label only shows
"per serving", convert to per 100g using the serving size.

If a field is missing or unreadable, omit it. Do not guess.

Numbers must be plain numbers (no units, no strings). Calories in kcal.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "report_nutrition",
    description: "Report the extracted nutrition values per 100g.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Product name if clearly visible" },
        brand: { type: "string", description: "Brand name if visible" },
        calories_per_100g: { type: "number" },
        protein_per_100g: { type: "number" },
        carbs_per_100g: { type: "number" },
        fat_per_100g: { type: "number" },
      },
      additionalProperties: false,
    },
  },
};

export const extractNutritionFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ExtractedNutrition | null> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch image and inline as base64 (signed URL may not be reachable by the model)
    const imgRes = await fetch(data.imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image (${imgRes.status})`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract nutrition values per 100g from this label." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "report_nutrition" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      throw new Error(`AI request failed (${res.status})`);
    }

    const json = (await res.json()) as any;
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return null;

    try {
      const parsed = JSON.parse(call.function.arguments) as ExtractedNutrition;
      return parsed;
    } catch (e) {
      console.error("Failed to parse tool args", call.function.arguments);
      return null;
    }
  });

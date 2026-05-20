# Vision Extraction Setup

## Goal

Add nutrition-label extraction from product photos.

Implemented architecture:

```txt
Frontend
→ read selected photo as temporary local base64 data
→ call TanStack Start server function
→ server function calls Gemini directly
→ return structured nutrition JSON
→ frontend pre-fills ProductForm
→ user reviews and saves
```

The frontend must never call Gemini directly and must not expose `GEMINI_API_KEY`.
The selected label image is used only for analysis and local preview; it is not persisted when the product is saved.

## Recommended Model

Currently tried by the server function, in order:

```txt
gemini-2.5-flash-lite
gemini-2.5-flash
gemini-2.0-flash
```

Reason:

- Supports image input.
- Good enough for an MVP nutrition-label reader.
- The fallback list helps when Gemini returns temporary `503 UNAVAILABLE` high-demand errors.

Possible future upgrade:

```txt
OpenAI Vision model
```

The frontend should not need to change if the server response shape stays the same.

## Server Function

Implemented at:

```txt
src/lib/vision/extractNutrition.functions.ts
```

Expected request:

```json
{
  "image": {
    "mimeType": "image/jpeg",
    "data": "base64-without-data-url-prefix"
  }
}
```

The server function still accepts `imageUrl` for compatibility, but the active product creation flow sends inline image data so the label does not need to be uploaded to Supabase Storage first.

Expected response:

```ts
type ExtractedNutrition = {
  name?: string | null;
  brand?: string | null;
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fat_per_100g?: number | null;
  serving_size_g?: number | null;
  serving_basis?: "per_100g" | "per_serving" | "unknown";
  confidence?: "low" | "medium" | "high";
  notes?: string | null;
};
```

## Extraction Rules

1. Prefer per-100g values if visible.
2. If only per-serving values are visible, convert to per 100g only if serving size in grams is visible.
3. If conversion is impossible, return `null` rather than guessing.
4. Support English, Spanish, and Catalan nutrition labels.
5. Return valid JSON only.
6. Do not invent product name or brand.
7. Avoid `NaN` values.
8. Always require user review before saving.

## Frontend Flow

Implemented in:

```txt
src/routes/_app/products.new.tsx
src/lib/vision/extractNutrition.functions.ts
src/components/ProductForm.tsx
```

Behavior:

- The user chooses "Take or upload photo".
- The browser creates a temporary local preview URL and converts the image to base64.
- The browser calls the TanStack Start server function.
- The server function sends image bytes to Gemini using `GEMINI_API_KEY`.
- Extracted fields prefill the editable product form.
- If extraction fails or returns no useful fields, the user still gets the photo-backed form and can enter values manually.
- Saving is always explicit; extracted values are never auto-saved.
- Saving a photo-created product stores `source_type: "photo"` and `source_image_url: null`.

## Secrets

Use:

```txt
GEMINI_API_KEY
```

Local app env:

```txt
.env
```

Example:

```env
GEMINI_API_KEY=your_key_here
```

Never commit real API keys.

## Commands

Install dependencies:

```bash
npm install
```

Run app:

```bash
npm run dev
```

Link Supabase:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Apply database migrations:

```bash
supabase db push
```

## Notes

- TanStack Start server functions are protected by CSRF middleware in `src/start.ts`.
- Gemini `503 UNAVAILABLE` means temporary provider overload. The app retries and falls back to other Gemini models, then asks the user to try again if all attempts fail.
- Supabase Edge Function files may still exist in the repo as older/reference work, but the active app path uses the TanStack Start server function above.

// Placeholder for future vision API integration.
//
// FUTURE FLOW:
// 1. Frontend uploads image to Supabase Storage (already done in product photo flow).
// 2. Frontend calls a backend server function (e.g. createServerFn) with the image URL.
// 3. Backend calls a vision API (OpenAI / Gemini / etc.) — never from the browser.
// 4. Backend returns parsed nutrition values (per 100g) to the frontend.
// 5. Frontend pre-fills the editable product form with those values.
// 6. User reviews and confirms before saving.
//
// Until then, this function returns null and the user enters values manually.

export interface ExtractedNutrition {
  name?: string;
  brand?: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
}

export async function extractNutritionFromImage(
  _imageUrl: string,
): Promise<ExtractedNutrition | null> {
  // TODO: replace with a call to a backend server function that runs a vision API.
  // Example (future):
  //   const fn = useServerFn(extractNutritionServerFn);
  //   return await fn({ data: { imageUrl: _imageUrl } });
  return null;
}

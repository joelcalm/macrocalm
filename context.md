# MacroCalm — Context

## Goal

MacroCalm is a personal calorie and macro tracking app.

The app lets the user:

- Save food products with calories and macros.
- Add products manually or from a nutrition-label photo.
- Create reusable meal templates.
- Log meals/products for a specific day.
- Adjust quantities and recalculate calories/macros automatically.

The app is for personal use, so simplicity, speed, and mobile usability matter more than advanced analytics.

## Tech Stack

- React
- TypeScript
- TanStack Router / TanStack Start
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Vite
- npm by default, unless the project is intentionally switched fully to Bun

The project currently has both `bun.lock` and `package-lock.json`. Avoid mixing package managers during the same task.

## Core Nutrition Rule

All products should store nutrition values per 100g.

```ts
actualValue = (valuePer100g * quantityInGrams) / 100;
```

Examples:

```ts
calories = (calories_per_100g * quantity_g) / 100;
protein = (protein_per_100g * quantity_g) / 100;
carbs = (carbs_per_100g * quantity_g) / 100;
fat = (fat_per_100g * quantity_g) / 100;
```

Do not store meal totals unless explicitly needed for caching. Totals should be calculated from products and quantities.

## Main Data Model

### products

Stores saved food products.

Important fields:

- `id`
- `user_id`
- `name`
- `brand`
- `calories_per_100g`
- `protein_per_100g`
- `carbs_per_100g`
- `fat_per_100g`
- `source_type`: `"manual"` or `"photo"`
- `source_image_url`
- `notes`
- `created_at`
- `updated_at`

### meal_templates

Reusable saved meals.

Important fields:

- `id`
- `user_id`
- `name`
- `description`
- `created_at`
- `updated_at`

### meal_template_items

Products inside a meal template.

Important fields:

- `id`
- `meal_template_id`
- `product_id`
- `default_quantity_g`

### daily_logs

One daily log per user/date.

Important fields:

- `id`
- `user_id`
- `date`

### daily_log_items

Products actually logged for a day.

Important fields:

- `id`
- `daily_log_id`
- `product_id`
- `quantity_g`
- `meal_template_id`
- `meal_name`

### weight_logs

One body-weight entry per user/date.

Important fields:

- `id`
- `user_id`
- `date`
- `weight_kg`
- `notes`
- `created_at`
- `updated_at`

## Existing Structure

Important files:

- `src/routes/_app/products.new.tsx`
  - Product creation page.
  - Handles manual entry and photo analysis.
  - Reads the selected camera/upload image as temporary browser data.
  - Calls `extractNutritionFromImage` with base64 image data.
  - Shows analyze loading states.
  - Prefills `ProductForm` if extraction returns data.
  - Falls back to editable manual entry if extraction fails.
  - Does not persist the uploaded label image when saving the product.

- `src/lib/vision/extractNutrition.functions.ts`
  - TanStack Start server function for nutrition-label OCR/vision extraction.
  - Protected by Supabase auth middleware and TanStack Start CSRF middleware.
  - Calls Gemini directly with `GEMINI_API_KEY` from server-side env.
  - Sends temporary inline image bytes to Gemini.
  - Falls back across Gemini models when the primary model returns temporary `503` overload errors.
  - Returns normalized per-100g nutrition JSON.
  - Never calls Gemini/OpenAI directly from the browser.

- `src/lib/supabaseQueries.ts`
  - Central Supabase database queries.
  - Includes product CRUD, meal templates, daily logs, and weight logs.
  - Has an older `uploadProductLabel` helper, but the current product photo flow does not use it.

- `src/components/ProductForm.tsx`
  - Reusable editable product form.
  - Syncs with extracted initial values.
  - Must remain editable even after image extraction.

## UX Principles

The app should stay:

- Mobile-first.
- Simple.
- Fast.
- Clean.
- Personal-use focused.

For image extraction:

- Show loading while analyzing.
- Prefill the form if extraction works.
- Always let the user edit values before saving.
- If extraction fails, continue with manual entry.
- Never auto-save extracted values.
- Do not save label images by default. Product records created from photos should store `source_type: "photo"` and `source_image_url: null`.
- If Gemini returns `503 UNAVAILABLE`, treat it as temporary provider overload and let the user retry.

## Coding Rules

When modifying the app:

1. Do not rewrite working flows unnecessarily.
2. Keep manual product creation working.
3. Keep photo upload working.
4. Keep all nutrition values normalized per 100g.
5. Keep the product form editable.
6. Keep API keys out of frontend code.
7. Prefer small, focused changes.
8. Do not change the schema unless required.
9. Run lint/build after changes.
10. For vision extraction, set `GEMINI_API_KEY` in server-side runtime env.
11. Keep TanStack Start server functions protected by the CSRF middleware in `src/start.ts`.

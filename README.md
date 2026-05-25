# MacroCalm

I did not want to pay for meal tracking apps, so I made one. It is more limited in capabilities, but tailored to what I wanted: create meals, add new products, keep a database of meal templates and products, and track weight.

## What it does

- Create meals and log items
- Add products and reuse them
- Save meal templates for quick logging
- Track body weight over time

## Stack

- TanStack Start + React
- Vite + TypeScript
- Supabase (Auth, DB, Storage)

## Setup

1) Install dependencies

```bash
npm install
```

2) Create a Supabase project

- Enable email auth (or whichever auth provider you want).

3) Set environment variables

Create a local `.env` file in the project root:

```env
# Client (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Server (SSR / server functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: nutrition label extraction
GEMINI_API_KEY=your_gemini_api_key
```

Notes:

- The service role key is only needed for trusted server-side admin tasks. Never expose it to the client.
- The Gemini key is optional. If missing, the label extraction flow will be unavailable.

4) Apply database migrations

Use the Supabase CLI (recommended):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or run the SQL files in [supabase/migrations](supabase/migrations) in the Supabase SQL editor.

5) Run the app

```bash
npm run dev
```

## Optional: Nutrition label extraction

If you want photo-based extraction for product labels, set `GEMINI_API_KEY` and keep the server function enabled. The key is only used server-side.

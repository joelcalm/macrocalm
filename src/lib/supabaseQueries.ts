import { supabase } from "@/integrations/supabase/client";
import type { ProductCategory } from "@/lib/productCategories";
import { STARTER_PRODUCTS } from "@/lib/starterProducts";

const STARTER_PRODUCT_BRAND = "Common foods";
const STARTER_PRODUCT_NOTES = "Common raw food nutrition values per 100 g.";

let starterProductsPromise: Promise<void> | null = null;

export type Product = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: ProductCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source_type: "manual" | "photo";
  source_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MealTemplate = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type MealTemplateItem = {
  id: string;
  meal_template_id: string;
  product_id: string;
  default_quantity_g: number;
  product?: Product;
};

export type DailyLog = {
  id: string;
  user_id: string;
  date: string;
};

export type DailyLogItem = {
  id: string;
  daily_log_id: string;
  product_id: string;
  quantity_g: number;
  meal_template_id: string | null;
  meal_name: string | null;
  product?: Product;
};

export type WeightLog = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/* ---------------- products ---------------- */

export async function listProducts(options?: {
  category?: ProductCategory | "all";
  ensureStarterProducts?: boolean;
}): Promise<Product[]> {
  if (options?.ensureStarterProducts) {
    await ensureStarterProducts();
  }

  let query = supabase
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return dedupeStarterProducts((data ?? []) as Product[]);
}

export async function ensureStarterProducts(): Promise<void> {
  if (starterProductsPromise) return starterProductsPromise;

  starterProductsPromise = insertMissingStarterProducts().finally(() => {
    starterProductsPromise = null;
  });

  return starterProductsPromise;
}

async function insertMissingStarterProducts(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  const { data: existing, error } = await supabase.from("products").select("name, category");
  if (error) throw error;

  const existingKeys = new Set(
    (existing ?? []).map((p) => starterProductKey(p.name, p.category as ProductCategory)),
  );
  const missing = STARTER_PRODUCTS.filter(
    (p) => !existingKeys.has(starterProductKey(p.name, p.category)),
  );

  if (!missing.length) return;

  const { error: insertError } = await supabase.from("products").insert(
    missing.map((p) => ({
      ...p,
      user_id: u.user.id,
      brand: STARTER_PRODUCT_BRAND,
      source_type: "manual",
      source_image_url: null,
      notes: STARTER_PRODUCT_NOTES,
    })),
  );
  if (insertError && insertError.code === "23505") return;
  if (insertError) throw insertError;
}

function dedupeStarterProducts(products: Product[]) {
  const seenStarterKeys = new Set<string>();

  return products.filter((product) => {
    if (!isStarterProduct(product)) return true;

    const key = starterProductKey(product.name, product.category);
    if (seenStarterKeys.has(key)) return false;

    seenStarterKeys.add(key);
    return true;
  });
}

function isStarterProduct(product: Product) {
  return (
    product.brand === STARTER_PRODUCT_BRAND &&
    product.source_type === "manual" &&
    product.notes === STARTER_PRODUCT_NOTES
  );
}

function starterProductKey(name: string, category: ProductCategory) {
  return `${category}:${name.trim().toLowerCase()}`;
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function createProduct(
  input: Omit<Product, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<Product> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, user_id: u.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- storage ---------------- */

export async function uploadProductLabel(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${u.user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("product-labels").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage
    .from("product-labels")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? path;
}

/* ---------------- meal templates ---------------- */

export async function listMealTemplates(): Promise<MealTemplate[]> {
  const { data, error } = await supabase
    .from("meal_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MealTemplate[];
}

export async function getMealTemplate(
  id: string,
): Promise<{ template: MealTemplate; items: MealTemplateItem[] } | null> {
  const { data: tpl, error: e1 } = await supabase
    .from("meal_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!tpl) return null;
  const { data: items, error: e2 } = await supabase
    .from("meal_template_items")
    .select("*, product:products(*)")
    .eq("meal_template_id", id);
  if (e2) throw e2;
  return { template: tpl as MealTemplate, items: (items ?? []) as MealTemplateItem[] };
}

export async function createMealTemplate(
  name: string,
  description: string | null,
  items: { product_id: string; default_quantity_g: number }[],
): Promise<MealTemplate> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data: tpl, error } = await supabase
    .from("meal_templates")
    .insert({ name, description, user_id: u.user.id })
    .select("*")
    .single();
  if (error) throw error;
  if (items.length) {
    const { error: e2 } = await supabase
      .from("meal_template_items")
      .insert(items.map((i) => ({ ...i, meal_template_id: tpl.id })));
    if (e2) throw e2;
  }
  return tpl as MealTemplate;
}

export async function updateMealTemplate(
  id: string,
  patch: Pick<Partial<MealTemplate>, "name" | "description">,
): Promise<MealTemplate> {
  const { data, error } = await supabase
    .from("meal_templates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MealTemplate;
}

export async function addMealTemplateItem(
  meal_template_id: string,
  product_id: string,
  default_quantity_g = 100,
): Promise<MealTemplateItem> {
  const { data, error } = await supabase
    .from("meal_template_items")
    .insert({ meal_template_id, product_id, default_quantity_g })
    .select("*, product:products(*)")
    .single();
  if (error) throw error;
  return data as MealTemplateItem;
}

export async function updateMealTemplateItem(id: string, default_quantity_g: number) {
  const { error } = await supabase
    .from("meal_template_items")
    .update({ default_quantity_g })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMealTemplateItem(id: string) {
  const { error } = await supabase.from("meal_template_items").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteMealTemplate(id: string) {
  const { error } = await supabase.from("meal_templates").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- daily logs ---------------- */

export async function getOrCreateDailyLog(date: string): Promise<DailyLog> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data: existing, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", u.user.id)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as DailyLog;
  const { data, error: e2 } = await supabase
    .from("daily_logs")
    .insert({ date, user_id: u.user.id })
    .select("*")
    .single();
  if (e2) throw e2;
  return data as DailyLog;
}

export async function listDailyLogItems(date: string): Promise<DailyLogItem[]> {
  const log = await getOrCreateDailyLog(date);
  const { data, error } = await supabase
    .from("daily_log_items")
    .select("*, product:products(*)")
    .eq("daily_log_id", log.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyLogItem[];
}

export async function addDailyLogItem(input: {
  date: string;
  product_id: string;
  quantity_g: number;
  meal_template_id?: string | null;
  meal_name?: string | null;
}) {
  const log = await getOrCreateDailyLog(input.date);
  const { error } = await supabase.from("daily_log_items").insert({
    daily_log_id: log.id,
    product_id: input.product_id,
    quantity_g: input.quantity_g,
    meal_template_id: input.meal_template_id ?? null,
    meal_name: input.meal_name ?? null,
  });
  if (error) throw error;
}

export async function addMealTemplateToLog(
  date: string,
  templateId: string,
  overrides: { product_id: string; quantity_g: number }[],
) {
  const tpl = await getMealTemplate(templateId);
  if (!tpl) throw new Error("Template not found");
  const log = await getOrCreateDailyLog(date);
  const rows = overrides.map((o) => ({
    daily_log_id: log.id,
    product_id: o.product_id,
    quantity_g: o.quantity_g,
    meal_template_id: templateId,
    meal_name: tpl.template.name,
  }));
  const { error } = await supabase.from("daily_log_items").insert(rows);
  if (error) throw error;
}

export async function updateDailyLogItem(id: string, quantity_g: number) {
  const { error } = await supabase.from("daily_log_items").update({ quantity_g }).eq("id", id);
  if (error) throw error;
}

export async function deleteDailyLogItem(id: string) {
  const { error } = await supabase.from("daily_log_items").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- weight logs ---------------- */

export async function getWeightLog(date: string): Promise<WeightLog | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", u.user.id)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data as WeightLog | null;
}

export async function upsertWeightLog(input: {
  date: string;
  weight_kg: number;
  notes?: string | null;
}): Promise<WeightLog> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("weight_logs")
    .upsert(
      {
        user_id: u.user.id,
        date: input.date,
        weight_kg: input.weight_kg,
        notes: input.notes ?? null,
      },
      { onConflict: "user_id,date" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as WeightLog;
}

export async function listWeightLogs(startDate: string, endDate: string): Promise<WeightLog[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", u.user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeightLog[];
}

/* ---------------- export ---------------- */

export async function exportAllData() {
  const [
    products,
    templates,
    items,
    logs,
    logItems,
    weightLogs,
    workoutPlans,
    workoutDayPlans,
    workoutBlocks,
    workoutExercisePlans,
    workoutSessionLogs,
    workoutExerciseLogs,
  ] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("meal_templates").select("*"),
    supabase.from("meal_template_items").select("*"),
    supabase.from("daily_logs").select("*"),
    supabase.from("daily_log_items").select("*"),
    supabase.from("weight_logs").select("*"),
    supabase.from("workout_plans").select("*"),
    supabase.from("workout_day_plans").select("*"),
    supabase.from("workout_blocks").select("*"),
    supabase.from("workout_exercise_plans").select("*"),
    supabase.from("workout_session_logs").select("*"),
    supabase.from("workout_exercise_logs").select("*"),
  ]);
  return {
    products: products.data,
    meal_templates: templates.data,
    meal_template_items: items.data,
    daily_logs: logs.data,
    daily_log_items: logItems.data,
    weight_logs: weightLogs.data,
    workout_plans: workoutPlans.data,
    workout_day_plans: workoutDayPlans.data,
    workout_blocks: workoutBlocks.data,
    workout_exercise_plans: workoutExercisePlans.data,
    workout_session_logs: workoutSessionLogs.data,
    workout_exercise_logs: workoutExerciseLogs.data,
    exported_at: new Date().toISOString(),
  };
}

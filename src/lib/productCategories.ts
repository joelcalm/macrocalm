export const PRODUCT_CATEGORIES = ["fruits", "vegetables", "meats", "dairy", "other"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  fruits: "Fruits",
  vegetables: "Vegetables",
  meats: "Meats",
  dairy: "Dairy",
  other: "Other",
};

export function isProductCategory(value: string): value is ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory);
}

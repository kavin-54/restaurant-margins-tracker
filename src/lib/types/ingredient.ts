export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  primaryUnit: string;
  trimYield: number; // 0-100 percentage (AP to EP)
  cookingYield: number; // 0-100 percentage (raw to cooked)
  shelfLife: ShelfLife;
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
  customConversions: CustomConversion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  packSize: string; // display string e.g. "40 lb case"
  packQuantity: number; // numeric e.g. 40
  packQuantityUnit: string; // e.g. "lb"
  costPerPack: number;
  costPerBaseUnit: number; // auto-calculated
  leadTimeDays: number;
  isPreferred: boolean;
  updatedAt: Date;
}

export interface PriceHistoryEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  costPerPack: number;
  costPerBaseUnit: number;
  recordedAt: Date;
}

export interface CustomConversion {
  unit: string; // e.g. "cup"
  weightOz: number; // e.g. 4.25 for flour
}

export type IngredientCategory =
  | "protein" | "produce" | "vegetable" | "dairy" | "dry-goods" | "spice" | "condiment"
  | "oil-fat" | "grain-starch" | "beverage" | "disposable" | "packaging" | "other";

export type ShelfLife = "same-day" | "2-3-days" | "1-week" | "2-weeks" | "shelf-stable";

export type Allergen = "milk" | "eggs" | "fish" | "shellfish" | "tree-nuts" | "peanuts" | "wheat" | "soy" | "sesame";

export type DietaryTag = "vegan" | "vegetarian" | "gluten-free" | "halal" | "kosher";

import { Allergen, DietaryTag } from "./ingredient";

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  cuisineTags: string[];
  totalYieldQuantity: number;
  totalYieldUnit: string;
  portionSize: number;
  portionUnit: string;
  numberOfPortions: number; // calculated
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  equipment: string[];
  instructions: string;
  portionPhotoUrl: string;
  allergens: Allergen[]; // rolled up
  dietaryClassification: DietaryTag[]; // rolled up
  totalCost: number; // denormalized
  costPerPortion: number; // denormalized
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeLine {
  id: string;
  type: "ingredient" | "sub-recipe";
  referenceId: string;
  referenceName: string; // denormalized
  quantity: number;
  unit: string;
  prepNote: string;
  lineCost: number; // calculated
  sortOrder: number;
}

export interface RecipeVersion {
  id: string;
  versionNumber: number;
  changes: string;
  totalCost: number;
  costPerPortion: number;
  lines: RecipeLine[];
  createdAt: Date;
}

export type RecipeCategory =
  | "appetizer" | "main" | "side" | "dessert" | "sauce" | "base"
  | "marinade" | "beverage" | "bread" | "salad" | "soup" | "other";

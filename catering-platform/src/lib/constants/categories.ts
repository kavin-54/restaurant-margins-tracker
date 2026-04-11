import { IngredientCategory, RecipeCategory, FoodCategory } from "@/lib/types";

export const INGREDIENT_CATEGORIES: { value: IngredientCategory; label: string }[] = [
  { value: "protein", label: "Protein" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry Goods" },
  { value: "spice", label: "Spice" },
  { value: "condiment", label: "Condiment" },
  { value: "oil-fat", label: "Oil / Fat" },
  { value: "grain-starch", label: "Grain / Starch" },
  { value: "beverage", label: "Beverage" },
  { value: "disposable", label: "Disposable" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Other" },
];

export const RECIPE_CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "appetizer", label: "Appetizer" },
  { value: "main", label: "Main Course" },
  { value: "side", label: "Side Dish" },
  { value: "dessert", label: "Dessert" },
  { value: "sauce", label: "Sauce" },
  { value: "base", label: "Base / Stock" },
  { value: "marinade", label: "Marinade" },
  { value: "beverage", label: "Beverage" },
  { value: "bread", label: "Bread" },
  { value: "salad", label: "Salad" },
  { value: "soup", label: "Soup" },
  { value: "other", label: "Other" },
];

export const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: "protein", label: "Protein" },
  { value: "starch", label: "Starch / Grain" },
  { value: "vegetable", label: "Vegetable" },
  { value: "salad", label: "Salad" },
  { value: "dessert", label: "Dessert" },
  { value: "bread", label: "Bread / Rolls" },
  { value: "appetizer", label: "Appetizer / Dips" },
  { value: "beverage", label: "Beverage" },
  { value: "condiment", label: "Condiment / Sauce" },
];

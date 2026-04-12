import { RecipeLine } from "@/lib/types";
import { convert, convertToBaseUnit } from "./unitConversion";
import {
  calculateEPCost,
  calculateCookedCost,
  calculateFullYieldCost,
} from "./yield";

/**
 * Data structure for ingredient information needed for cost calculations
 */
export interface IngredientData {
  costPerBaseUnit: number; // Cost per oz, fl_oz, or each
  trimYield: number; // 0-100 percentage
  cookingYield: number; // 0-100 percentage
  primaryUnit: string; // The unit to use for display/conversion
}

/**
 * Data structure for sub-recipe information needed for cost calculations
 */
export interface SubRecipeData {
  costPerPortion: number; // Cost per portion unit
  portionUnit: string; // e.g., "each", "oz", "ml"
  totalYieldUnit: string; // The unit that yield is measured in
  totalCost: number; // Total cost to produce this recipe
  totalYieldQuantity: number; // Total quantity produced
}

/**
 * Result of a line cost calculation
 */
export interface LineCostResult {
  lineCost: number;
  quantity: number;
  unit: string;
}

/**
 * Calculates the cost of a single recipe line item.
 *
 * For ingredients: converts to base unit and multiplies by ingredient's
 * edible portion cost (accounting for trim and cooking yield).
 * For sub-recipes: calculates cost based on the recipe's cost per yield unit.
 *
 * @param line - The recipe line item
 * @param ingredientData - Map of ingredient IDs to ingredient cost/yield data
 * @param recipeData - Map of recipe IDs to recipe cost/yield data
 * @returns The total cost of this line item
 * @throws Error if ingredient/recipe not found or conversion fails
 */
export function calculateLineCost(
  line: RecipeLine,
  ingredientData: Map<string, IngredientData>,
  recipeData: Map<string, SubRecipeData>
): number {
  if (line.quantity < 0) {
    throw new Error(`Invalid quantity for line: ${line.quantity}`);
  }

  if (line.type === "ingredient") {
    const ingredient = ingredientData.get(line.referenceId);

    if (!ingredient) {
      throw new Error(`Ingredient not found: ${line.referenceId}`);
    }

    // Convert line quantity to base unit
    const baseQuantity = convert(
      line.quantity,
      line.unit,
      ingredient.primaryUnit
    );

    // Calculate the cost per unit at EP (edible portion after trim loss)
    const epCostPerUnit = calculateEPCost(
      ingredient.costPerBaseUnit,
      ingredient.trimYield
    );

    // Calculate final cost per unit (after cooking yield)
    const finalCostPerUnit = calculateCookedCost(
      epCostPerUnit,
      ingredient.cookingYield
    );

    return baseQuantity * finalCostPerUnit;
  }

  if (line.type === "sub-recipe") {
    const recipe = recipeData.get(line.referenceId);

    if (!recipe) {
      throw new Error(`Recipe not found: ${line.referenceId}`);
    }

    // Convert the line quantity to the recipe's yield unit
    const quantityInYieldUnit = convert(
      line.quantity,
      line.unit,
      recipe.totalYieldUnit
    );

    // Calculate cost per unit of yield
    const costPerYieldUnit = recipe.totalCost / recipe.totalYieldQuantity;

    return quantityInYieldUnit * costPerYieldUnit;
  }

  throw new Error(`Unknown line type: ${line.type}`);
}

/**
 * Result of recipe cost calculation
 */
export interface RecipeCostResult {
  totalCost: number;
  costPerPortion: number;
  portions: number;
}

/**
 * Calculates the total cost of a recipe and cost per portion.
 *
 * @param lines - All recipe line items
 * @param ingredientData - Map of ingredient IDs to ingredient cost/yield data
 * @param recipeData - Map of recipe IDs to recipe cost/yield data
 * @param portionCount - Number of portions this recipe yields
 * @returns Object containing total cost and cost per portion
 * @throws Error if portion count is invalid
 */
export function calculateRecipeCost(
  lines: RecipeLine[],
  ingredientData: Map<string, IngredientData>,
  recipeData: Map<string, SubRecipeData>,
  portionCount: number
): RecipeCostResult {
  if (portionCount <= 0) {
    throw new Error("Portion count must be greater than 0");
  }

  if (!Array.isArray(lines)) {
    throw new Error("Lines must be an array");
  }

  const totalCost = lines.reduce((sum, line) => {
    return sum + calculateLineCost(line, ingredientData, recipeData);
  }, 0);

  const costPerPortion = totalCost / portionCount;

  return {
    totalCost,
    costPerPortion,
    portions: portionCount,
  };
}

/**
 * Calculates the cost per unit of recipe yield.
 *
 * @param totalCost - The total cost to produce the recipe
 * @param totalYieldQuantity - The total quantity of the recipe produced
 * @returns The cost per unit of yield
 * @throws Error if total yield is 0
 */
export function calculateRecipeCostPerUnit(
  totalCost: number,
  totalYieldQuantity: number
): number {
  if (totalCost < 0) {
    throw new Error("Total cost cannot be negative");
  }

  if (totalYieldQuantity <= 0) {
    throw new Error("Total yield quantity must be greater than 0");
  }

  return totalCost / totalYieldQuantity;
}

/**
 * Calculates the cost contribution of a sub-recipe within a larger recipe.
 *
 * @param quantity - Quantity of the sub-recipe used
 * @param unit - Unit of the quantity
 * @param subRecipe - The sub-recipe's cost and yield data
 * @returns The cost of this sub-recipe line
 * @throws Error if conversion or calculation fails
 */
export function calculateSubRecipeCost(
  quantity: number,
  unit: string,
  subRecipe: SubRecipeData
): number {
  if (quantity < 0) {
    throw new Error("Quantity cannot be negative");
  }

  // Convert to the recipe's yield unit
  const quantityInYieldUnit = convert(quantity, unit, subRecipe.totalYieldUnit);

  // Calculate cost per unit of yield
  const costPerYieldUnit = subRecipe.totalCost / subRecipe.totalYieldQuantity;

  return quantityInYieldUnit * costPerYieldUnit;
}

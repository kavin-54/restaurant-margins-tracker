import { convert } from "./unitConversion";
import {
  calculateEPCost,
  calculateCookedCost,
} from "./yield";

/**
 * Data structure for ingredient information needed for cost calculations
 */
export interface IngredientData {
  costPerUnit: number;
  trimYield?: number; // 0-100 percentage
  cookingYield?: number; // 0-100 percentage
  unit: string;
}

/**
 * Data structure for sub-recipe information needed for cost calculations
 */
export interface SubRecipeData {
  costPerServing: number;
  servings: number;
  totalRecipeCost: number;
  totalCost: number;
  totalYieldQuantity: number;
  totalYieldUnit: string;
  unit?: string;
}

export interface LineCostResult {
  lineCost: number;
  quantity: number;
  unit: string;
}

export interface RecipeCostResult {
  totalCost: number;
  costPerPortion: number;
  portions: number;
}

/**
 * Simplified RecipeLine that matches the hook interface but allows for sub-recipes
 */
export interface RecipeLine {
  id: string;
  ingredientId: string;
  type?: "ingredient" | "sub-recipe";
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineCost: number;
}

/**
 * Explicit sub-recipe line for architectural clarity
 */
export interface SubRecipeLine extends Omit<RecipeLine, "type"> {
  type: "sub-recipe";
}

/**
 * Calculates the cost of a single recipe line item.
 */
export function calculateLineCost(
  line: RecipeLine,
  ingredientData: Map<string, IngredientData>,
  recipeData: Map<string, SubRecipeData>
): number {
  if (line.quantity < 0) {
    throw new Error(`Invalid quantity for line: ${line.quantity}`);
  }

  const type = line.type || "ingredient";

  if (type === "ingredient") {
    const ingredient = ingredientData.get(line.ingredientId);

    if (!ingredient) {
      // If we don't have the full ingredient data, fall back to the line's costPerUnit
      return line.quantity * (line.costPerUnit || 0);
    }

    // Convert line quantity to base unit if they differ
    let quantity = line.quantity;
    try {
      if (line.unit !== ingredient.unit) {
        quantity = convert(line.quantity, line.unit, ingredient.unit);
      }
    } catch (e) {
      console.warn(`Conversion failed for ${line.ingredientId}, using raw quantity:`, e);
    }

    // Calculate the cost per unit at EP (edible portion after trim loss)
    const epCostPerUnit = calculateEPCost(
      ingredient.costPerUnit,
      ingredient.trimYield || 100
    );

    // Calculate final cost per unit (after cooking yield)
    const finalCostPerUnit = calculateCookedCost(
      epCostPerUnit,
      ingredient.cookingYield || 100
    );

    return quantity * finalCostPerUnit;
  }

  if (type === "sub-recipe") {
    const recipe = recipeData.get(line.ingredientId);

    if (!recipe) {
      return line.quantity * (line.costPerUnit || 0);
    }

    // Sub-recipes are usually measured in servings or a yield unit
    return line.quantity * recipe.costPerServing;
  }

  return line.quantity * (line.costPerUnit || 0);
}

/**
 * Calculates the total cost of a recipe and cost per portion.
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

  const totalCost = (lines || []).reduce((sum, line) => {
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

import { RecipeLine } from "@/lib/types";
import { convert } from "./unitConversion";

/**
 * Ingredient info after explosion from a recipe
 */
export interface ExplodedIngredient {
  ingredientId: string;
  ingredientName: string;
  quantityNeeded: number;
  unit: string;
}

/**
 * Result of purchase aggregation with overage calculation
 */
export interface PurchaseRoundingResult {
  packsToOrder: number;
  quantityOrdered: number;
  overage: number;
  overagePercent: number;
}

/**
 * Recursively explodes a recipe into its component raw ingredients,
 * accounting for sub-recipes and scale factors.
 *
 * Algorithm:
 * 1. For each line in the recipe:
 *    - If it's an ingredient: add it to the result, scaled by the scale factor
 *    - If it's a sub-recipe: recursively explode it and scale the results
 * 2. Combine all ingredients, summing quantities for duplicates
 *
 * @param recipeId - The recipe to explode
 * @param lines - Recipe lines to process
 * @param scaleFactor - Scaling factor to apply (e.g., 2 = double the batch)
 * @param recipeLines - Map of recipe ID -> recipe lines (for looking up sub-recipes)
 * @returns Map of ingredient ID -> aggregated ingredient info
 * @throws Error if recipe not found or circular dependencies detected
 */
export function explodeRecipeToIngredients(
  recipeId: string,
  lines: RecipeLine[],
  scaleFactor: number,
  recipeLines: Map<string, RecipeLine[]>
): Map<string, ExplodedIngredient> {
  if (scaleFactor <= 0) {
    throw new Error("Scale factor must be greater than 0");
  }

  if (!Array.isArray(lines)) {
    throw new Error("Lines must be an array");
  }

  const result = new Map<string, ExplodedIngredient>();
  const visited = new Set<string>();

  function explodeRecursive(
    currentRecipeId: string,
    currentLines: RecipeLine[],
    currentScaleFactor: number
  ): void {
    // Detect circular dependencies
    if (visited.has(currentRecipeId)) {
      throw new Error(
        `Circular recipe dependency detected: ${currentRecipeId}`
      );
    }

    visited.add(currentRecipeId);

    for (const line of currentLines) {
      if (line.quantity < 0) {
        throw new Error(`Invalid quantity for line: ${line.quantity}`);
      }

      const scaledQuantity = line.quantity * currentScaleFactor;

      if (line.type === "ingredient") {
        const ingredientId = line.referenceId;

        if (result.has(ingredientId)) {
          // Sum with existing ingredient
          const existing = result.get(ingredientId)!;

          // Convert to common unit if different
          let totalQuantity: number;
          if (existing.unit === line.unit) {
            totalQuantity = existing.quantityNeeded + scaledQuantity;
          } else {
            // Convert scaled quantity to existing unit
            const convertedQuantity = convert(
              scaledQuantity,
              line.unit,
              existing.unit
            );
            totalQuantity = existing.quantityNeeded + convertedQuantity;
          }

          existing.quantityNeeded = totalQuantity;
        } else {
          result.set(ingredientId, {
            ingredientId,
            ingredientName: line.referenceName || ingredientId,
            quantityNeeded: scaledQuantity,
            unit: line.unit,
          });
        }
      } else if (line.type === "sub-recipe") {
        const subRecipeId = line.referenceId;
        const subRecipeLines = recipeLines.get(subRecipeId);

        if (!subRecipeLines) {
          throw new Error(`Sub-recipe not found: ${subRecipeId}`);
        }

        // Recursively explode sub-recipe
        explodeRecursive(subRecipeId, subRecipeLines, scaledQuantity);
      }
    }

    visited.delete(currentRecipeId);
  }

  explodeRecursive(recipeId, lines, scaleFactor);

  return result;
}

/**
 * Aggregates ingredient needs across multiple events/recipes.
 *
 * @param eventIngredientMaps - Array of maps, each mapping ingredient ID to quantity
 * @returns Aggregated map with total quantities per ingredient
 * @throws Error if inputs are invalid
 */
export function aggregateAcrossEvents(
  eventIngredientMaps: Map<string, number>[]
): Map<string, number> {
  if (!Array.isArray(eventIngredientMaps)) {
    throw new Error("Event ingredient maps must be an array");
  }

  const aggregated = new Map<string, number>();

  for (const eventMap of eventIngredientMaps) {
    if (!(eventMap instanceof Map)) {
      throw new Error("Each event must have a Map of ingredients");
    }

    for (const [ingredientId, quantity] of eventMap.entries()) {
      if (quantity < 0) {
        throw new Error(
          `Invalid quantity for ingredient ${ingredientId}: ${quantity}`
        );
      }

      if (aggregated.has(ingredientId)) {
        const existing = aggregated.get(ingredientId)!;
        aggregated.set(ingredientId, existing + quantity);
      } else {
        aggregated.set(ingredientId, quantity);
      }
    }
  }

  return aggregated;
}

/**
 * Calculates how many packs to order and the resulting overage.
 *
 * Algorithm:
 * 1. Divide quantity needed by pack size
 * 2. Round up to next whole number of packs
 * 3. Calculate actual quantity ordered and overage
 *
 * Example: Need 450g, pack size 200g
 * - Packs needed = ceil(450 / 200) = 3 packs
 * - Quantity ordered = 3 * 200 = 600g
 * - Overage = 600 - 450 = 150g
 *
 * @param quantityNeeded - Total quantity needed
 * @param packQuantity - Size of each pack
 * @returns Rounding result with pack count and overage
 * @throws Error if inputs are invalid
 */
export function roundToPackSize(
  quantityNeeded: number,
  packQuantity: number
): PurchaseRoundingResult {
  if (quantityNeeded < 0) {
    throw new Error("Quantity needed cannot be negative");
  }

  if (packQuantity <= 0) {
    throw new Error("Pack quantity must be greater than 0");
  }

  // Calculate packs needed, rounding up
  const packsNeeded = Math.ceil(quantityNeeded / packQuantity);

  // Calculate actual quantity ordered
  const quantityOrdered = packsNeeded * packQuantity;

  // Calculate overage
  const overage = quantityOrdered - quantityNeeded;
  const overagePercent =
    quantityNeeded > 0 ? (overage / quantityNeeded) * 100 : 0;

  return {
    packsToOrder: packsNeeded,
    quantityOrdered,
    overage,
    overagePercent,
  };
}

/**
 * Aggregates purchase quantities across multiple recipes/events
 * and rounds to pack sizes.
 *
 * @param ingredients - Map of ingredient ID to quantity needed
 * @param packSizes - Map of ingredient ID to pack size
 * @returns Map of ingredient ID to purchase rounding results
 * @throws Error if ingredient pack size not found
 */
export function calculatePurchaseOrders(
  ingredients: Map<string, number>,
  packSizes: Map<string, number>
): Map<string, PurchaseRoundingResult> {
  if (!(ingredients instanceof Map)) {
    throw new Error("Ingredients must be a Map");
  }

  if (!(packSizes instanceof Map)) {
    throw new Error("Pack sizes must be a Map");
  }

  const orders = new Map<string, PurchaseRoundingResult>();

  for (const [ingredientId, quantityNeeded] of ingredients.entries()) {
    const packSize = packSizes.get(ingredientId);

    if (!packSize) {
      throw new Error(
        `Pack size not defined for ingredient: ${ingredientId}`
      );
    }

    orders.set(
      ingredientId,
      roundToPackSize(quantityNeeded, packSize)
    );
  }

  return orders;
}

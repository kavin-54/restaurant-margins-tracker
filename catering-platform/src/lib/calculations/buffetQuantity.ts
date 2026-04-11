/**
 * Food category types for buffet service
 */
export type FoodCategory =
  | "appetizers"
  | "main_courses"
  | "sides"
  | "desserts"
  | "beverages";

/**
 * Quantity target for a food category
 */
export interface QuantityTarget {
  minOzPerPerson: number;
  maxOzPerPerson: number;
}

/**
 * Menu item for buffet quantity calculation
 */
export interface BuffetMenuItem {
  recipeId: string;
  category: FoodCategory;
  popularityWeight: number; // Relative weight for distribution within category
}

/**
 * Result of buffet quantity calculation
 */
export interface BuffetQuantityResult {
  recipeId: string;
  totalQuantityOz: number;
  portions: number;
}

/**
 * Calculates the buffet quantities needed for each menu item,
 * distributing category totals by popularity weight.
 *
 * Algorithm:
 * 1. For each category, calculate total oz = headcount * average of (min + max) oz per person
 * 2. Distribute the category total across items in that category by popularity weight
 * 3. Calculate portions needed from each recipe (based on recipe yield)
 *
 * @param menuItems - Array of menu items with categories and popularity weights
 * @param adjustedHeadcount - Number of guests (adjusted for factors like duration, time of day)
 * @param quantityTargets - Min/max oz per person for each category
 * @returns Array of quantities needed per recipe
 * @throws Error if inputs are invalid
 */
export function calculateBuffetQuantities(
  menuItems: BuffetMenuItem[],
  adjustedHeadcount: number,
  quantityTargets: Record<FoodCategory, QuantityTarget>
): BuffetQuantityResult[] {
  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    throw new Error("Menu items must be a non-empty array");
  }

  if (adjustedHeadcount <= 0) {
    throw new Error("Adjusted headcount must be greater than 0");
  }

  if (!quantityTargets || typeof quantityTargets !== "object") {
    throw new Error("Quantity targets must be provided");
  }

  // Group items by category
  const itemsByCategory = new Map<FoodCategory, BuffetMenuItem[]>();

  for (const item of menuItems) {
    if (!item.recipeId || !item.category || item.popularityWeight === undefined) {
      throw new Error("Menu item missing required fields");
    }

    if (item.popularityWeight < 0) {
      throw new Error("Popularity weight cannot be negative");
    }

    if (!itemsByCategory.has(item.category)) {
      itemsByCategory.set(item.category, []);
    }

    itemsByCategory.get(item.category)!.push(item);
  }

  const results: BuffetQuantityResult[] = [];

  // Process each category
  for (const [category, items] of itemsByCategory.entries()) {
    const target = quantityTargets[category];

    if (!target) {
      throw new Error(`No quantity target defined for category: ${category}`);
    }

    if (
      target.minOzPerPerson < 0 ||
      target.maxOzPerPerson < 0 ||
      target.minOzPerPerson > target.maxOzPerPerson
    ) {
      throw new Error(`Invalid quantity targets for category: ${category}`);
    }

    // Calculate average oz per person for this category
    const avgOzPerPerson =
      (target.minOzPerPerson + target.maxOzPerPerson) / 2;

    // Calculate total oz needed for this category
    const categoryTotalOz = adjustedHeadcount * avgOzPerPerson;

    // Calculate total popularity weight in this category
    const totalWeight = items.reduce((sum, item) => sum + item.popularityWeight, 0);

    if (totalWeight === 0) {
      throw new Error(
        `Total popularity weight is 0 for category: ${category}`
      );
    }

    // Distribute by popularity weight
    for (const item of items) {
      const proportion = item.popularityWeight / totalWeight;
      const itemQuantityOz = categoryTotalOz * proportion;

      results.push({
        recipeId: item.recipeId,
        totalQuantityOz: itemQuantityOz,
        portions: 0, // Portions will be calculated by the caller based on recipe yields
      });
    }
  }

  return results;
}

/**
 * Calculates portions from a buffet quantity result and recipe yield.
 *
 * @param quantityOz - The quantity in ounces
 * @param recipeYieldOz - The recipe's yield in ounces
 * @returns Number of portions needed
 * @throws Error if recipe yield is 0
 */
export function calculatePortionsFromBuffetQuantity(
  quantityOz: number,
  recipeYieldOz: number
): number {
  if (quantityOz < 0) {
    throw new Error("Quantity cannot be negative");
  }

  if (recipeYieldOz <= 0) {
    throw new Error("Recipe yield must be greater than 0");
  }

  return quantityOz / recipeYieldOz;
}

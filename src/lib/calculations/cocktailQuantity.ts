/**
 * Menu item for cocktail service quantity calculation
 */
export interface CocktailMenuItem {
  recipeId: string;
  popularityWeight: number; // Relative weight for distribution
}

/**
 * Result of cocktail quantity calculation
 */
export interface CocktailQuantityResult {
  recipeId: string;
  totalPieces: number;
}

/**
 * Calculates the cocktail quantities needed for each menu item,
 * following a tapering consumption model.
 *
 * Consumption model:
 * - First hour: 8 pieces (drinks) per person
 * - Subsequent hours: 5 pieces per person per hour
 * - Example: 100 guests for 3 hours = (100 * 8) + (100 * 5 * 2) = 800 + 1000 = 1800 pieces
 *
 * Distribution: Total pieces are split across menu items by popularity weight.
 *
 * @param menuItems - Array of cocktail menu items with popularity weights
 * @param adjustedHeadcount - Number of guests
 * @param durationHours - Duration of cocktail service in hours
 * @returns Array of pieces needed per cocktail recipe
 * @throws Error if inputs are invalid
 */
export function calculateCocktailQuantities(
  menuItems: CocktailMenuItem[],
  adjustedHeadcount: number,
  durationHours: number
): CocktailQuantityResult[] {
  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    throw new Error("Menu items must be a non-empty array");
  }

  if (adjustedHeadcount <= 0) {
    throw new Error("Adjusted headcount must be greater than 0");
  }

  if (durationHours <= 0) {
    throw new Error("Duration must be greater than 0");
  }

  // Validate menu items
  for (const item of menuItems) {
    if (!item.recipeId || item.popularityWeight === undefined) {
      throw new Error("Menu item missing required fields");
    }

    if (item.popularityWeight < 0) {
      throw new Error("Popularity weight cannot be negative");
    }
  }

  // Calculate total pieces needed
  // First hour: 8 pieces per person
  // Remaining hours: 5 pieces per person per hour
  const firstHourPieces = adjustedHeadcount * 8;
  const remainingHours = Math.max(0, durationHours - 1);
  const remainingHoursPieces = adjustedHeadcount * 5 * remainingHours;
  const totalPieces = firstHourPieces + remainingHoursPieces;

  // Calculate total popularity weight
  const totalWeight = menuItems.reduce((sum, item) => sum + item.popularityWeight, 0);

  if (totalWeight === 0) {
    throw new Error("Total popularity weight cannot be 0");
  }

  // Distribute pieces by popularity weight
  const results: CocktailQuantityResult[] = menuItems.map((item) => {
    const proportion = item.popularityWeight / totalWeight;
    return {
      recipeId: item.recipeId,
      totalPieces: totalPieces * proportion,
    };
  });

  return results;
}

/**
 * Calculates the consumption rate for a given time in the event.
 * Useful for mid-event adjustments or partial calculations.
 *
 * @param headcount - Number of guests
 * @param hourNumber - Which hour of the event (1-indexed)
 * @returns Pieces per person for that hour
 */
export function calculateCocktailConsumptionRate(
  headcount: number,
  hourNumber: number
): number {
  if (headcount <= 0) {
    throw new Error("Headcount must be greater than 0");
  }

  if (hourNumber < 1) {
    throw new Error("Hour number must be at least 1");
  }

  const piecesPerPerson = hourNumber === 1 ? 8 : 5;
  return headcount * piecesPerPerson;
}

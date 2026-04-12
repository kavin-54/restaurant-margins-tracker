/**
 * Recipe info needed for labor time estimation
 */
export interface RecipeWithTiming {
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  scaleFactor: number; // How much the recipe is scaled (e.g., 1 = normal, 2 = double)
}

/**
 * Calculates the blended labor rate (average hourly cost of labor).
 *
 * Formula: Blended Rate = Total Weekly Payroll / Total Weekly Hours
 *
 * @param weeklyPayroll - Total payroll for the week in dollars
 * @param weeklyHours - Total hours worked in the week
 * @returns Average hourly rate
 * @throws Error if inputs are invalid
 */
export function calculateBlendedRate(
  weeklyPayroll: number,
  weeklyHours: number
): number {
  if (weeklyPayroll < 0) {
    throw new Error("Weekly payroll cannot be negative");
  }

  if (weeklyHours <= 0) {
    throw new Error("Weekly hours must be greater than 0");
  }

  return weeklyPayroll / weeklyHours;
}

/**
 * Estimates the total prep and cooking hours needed for recipes.
 *
 * Scaling model: For large batch efficiency, time doesn't scale linearly.
 * Uses sqrt scaling: estimatedTime = baseTime * sqrt(scaleFactor)
 *
 * Example:
 * - baseTime = 2 hours (120 minutes)
 * - scaleFactor = 4 (quadruple batch)
 * - estimatedTime = 2 * sqrt(4) = 2 * 2 = 4 hours (not 8 hours, thanks to efficiency)
 *
 * @param recipes - Array of recipes with timing and scale information
 * @returns Total estimated hours (prep + cook time combined)
 * @throws Error if any recipe has invalid data
 */
export function estimatePrepHours(recipes: RecipeWithTiming[]): number {
  if (!Array.isArray(recipes)) {
    throw new Error("Recipes must be an array");
  }

  let totalMinutes = 0;

  for (const recipe of recipes) {
    if (recipe.prepTimeMinutes === undefined || recipe.cookTimeMinutes === undefined) {
      throw new Error("Recipe must have prepTimeMinutes and cookTimeMinutes");
    }

    if (recipe.prepTimeMinutes < 0) {
      throw new Error("Prep time cannot be negative");
    }

    if (recipe.cookTimeMinutes < 0) {
      throw new Error("Cook time cannot be negative");
    }

    if (recipe.scaleFactor === undefined) {
      throw new Error("Recipe must have scaleFactor");
    }

    if (recipe.scaleFactor < 0) {
      throw new Error("Scale factor cannot be negative");
    }

    // Base time is prep + cook
    const baseTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

    // Apply sqrt scaling for efficiency gains
    const scaledTime = baseTime * Math.sqrt(recipe.scaleFactor);

    totalMinutes += scaledTime;
  }

  // Convert minutes to hours
  return totalMinutes / 60;
}

/**
 * Calculates the total labor cost for an event.
 *
 * Formula: Labor Cost = Hours * Hourly Rate
 *
 * @param hours - Number of labor hours
 * @param blendedRate - Hourly labor rate
 * @returns Total labor cost
 * @throws Error if inputs are invalid
 */
export function calculateLaborCost(hours: number, blendedRate: number): number {
  if (hours < 0) {
    throw new Error("Hours cannot be negative");
  }

  if (blendedRate < 0) {
    throw new Error("Blended rate cannot be negative");
  }

  return hours * blendedRate;
}

/**
 * Estimates prep hours for a single recipe.
 * Useful for individual recipe planning or breakdown.
 *
 * @param prepTimeMinutes - Prep time in minutes
 * @param cookTimeMinutes - Cook time in minutes
 * @param scaleFactor - Scale factor for the batch
 * @returns Estimated hours
 * @throws Error if inputs are invalid
 */
export function estimateSingleRecipePrepHours(
  prepTimeMinutes: number,
  cookTimeMinutes: number,
  scaleFactor: number
): number {
  if (prepTimeMinutes < 0) {
    throw new Error("Prep time cannot be negative");
  }

  if (cookTimeMinutes < 0) {
    throw new Error("Cook time cannot be negative");
  }

  if (scaleFactor < 0) {
    throw new Error("Scale factor cannot be negative");
  }

  const baseTime = prepTimeMinutes + cookTimeMinutes;
  const scaledTime = baseTime * Math.sqrt(scaleFactor);
  return scaledTime / 60; // Convert to hours
}

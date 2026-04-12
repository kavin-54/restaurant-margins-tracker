/**
 * Calculates the edible portion (EP) cost from as-purchased (AP) cost
 * and trim yield percentage.
 *
 * Formula: EP Cost = AP Cost / (Trim Yield % / 100)
 *
 * @param apCostPerUnit - The cost per unit as purchased
 * @param trimYieldPercent - The trim yield percentage (0-100)
 * @returns The cost per unit of edible portion
 * @throws Error if trimYieldPercent is 0 or invalid
 */
export function calculateEPCost(
  apCostPerUnit: number,
  trimYieldPercent: number
): number {
  if (apCostPerUnit < 0) {
    throw new Error("AP cost cannot be negative");
  }

  if (trimYieldPercent <= 0 || trimYieldPercent > 100) {
    throw new Error("Trim yield must be between 0 and 100 percent");
  }

  return apCostPerUnit / (trimYieldPercent / 100);
}

/**
 * Calculates the cooked portion cost from edible portion (EP) cost
 * and cooking yield percentage.
 *
 * Formula: Cooked Cost = EP Cost / (Cooking Yield % / 100)
 *
 * @param epCostPerUnit - The edible portion cost per unit
 * @param cookingYieldPercent - The cooking yield percentage (0-100)
 * @returns The cost per unit after cooking loss
 * @throws Error if cookingYieldPercent is 0 or invalid
 */
export function calculateCookedCost(
  epCostPerUnit: number,
  cookingYieldPercent: number
): number {
  if (epCostPerUnit < 0) {
    throw new Error("EP cost cannot be negative");
  }

  if (cookingYieldPercent <= 0 || cookingYieldPercent > 100) {
    throw new Error("Cooking yield must be between 0 and 100 percent");
  }

  return epCostPerUnit / (cookingYieldPercent / 100);
}

/**
 * Calculates the fully-costed cost per unit, accounting for both
 * trim yield and cooking yield losses.
 *
 * @param apCostPerUnit - The cost per unit as purchased
 * @param trimYield - The trim yield percentage (0-100)
 * @param cookingYield - The cooking yield percentage (0-100)
 * @returns The final cost per serving unit
 * @throws Error if yields are invalid
 */
export function calculateFullYieldCost(
  apCostPerUnit: number,
  trimYield: number,
  cookingYield: number
): number {
  const epCost = calculateEPCost(apCostPerUnit, trimYield);
  return calculateCookedCost(epCost, cookingYield);
}

/**
 * Calculates the AP (as-purchased) quantity needed to achieve
 * a desired edible portion quantity, accounting for trim loss.
 *
 * Formula: AP Quantity = EP Quantity / (Trim Yield % / 100)
 *
 * @param epQuantity - The desired edible portion quantity
 * @param trimYield - The trim yield percentage (0-100)
 * @returns The AP quantity needed
 * @throws Error if inputs are invalid
 */
export function calculateAPQuantityNeeded(
  epQuantity: number,
  trimYield: number
): number {
  if (epQuantity < 0) {
    throw new Error("EP quantity cannot be negative");
  }

  if (trimYield <= 0 || trimYield > 100) {
    throw new Error("Trim yield must be between 0 and 100 percent");
  }

  return epQuantity / (trimYield / 100);
}

/**
 * Calculates the cooked quantity that results from a raw quantity,
 * accounting for cooking loss/moisture loss.
 *
 * Formula: Cooked Quantity = Raw Quantity * (Cooking Yield % / 100)
 *
 * @param rawQuantity - The raw (edible portion, before cooking) quantity
 * @param cookingYield - The cooking yield percentage (0-100)
 * @returns The quantity after cooking
 * @throws Error if inputs are invalid
 */
export function calculateCookedQuantityFromRaw(
  rawQuantity: number,
  cookingYield: number
): number {
  if (rawQuantity < 0) {
    throw new Error("Raw quantity cannot be negative");
  }

  if (cookingYield <= 0 || cookingYield > 100) {
    throw new Error("Cooking yield must be between 0 and 100 percent");
  }

  return rawQuantity * (cookingYield / 100);
}

/**
 * Calculates the AP quantity needed accounting for both
 * trim yield and cooking yield losses.
 *
 * @param cookedQuantity - The desired cooked portion quantity
 * @param trimYield - The trim yield percentage (0-100)
 * @param cookingYield - The cooking yield percentage (0-100)
 * @returns The AP quantity needed
 * @throws Error if inputs are invalid
 */
export function calculateFullAPQuantityNeeded(
  cookedQuantity: number,
  trimYield: number,
  cookingYield: number
): number {
  // Work backwards: cooked = raw * (cookingYield / 100)
  // So: raw = cooked / (cookingYield / 100)
  const rawQuantity = cookedQuantity / (cookingYield / 100);

  // Then apply trim yield
  return calculateAPQuantityNeeded(rawQuantity, trimYield);
}

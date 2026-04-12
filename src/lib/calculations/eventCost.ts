/**
 * Complete cost breakdown for an event
 */
export interface EventCosts {
  foodCost: number;
  laborCost: number;
  disposablesCost: number;
  transportCost: number;
  equipmentCost: number;
  overhead: number; // Calculated from overheadPercent
  totalVariableCost: number; // Sum of all above
  totalCost: number; // After markup/adjustments if any
}

/**
 * Calculates the total event cost from component costs.
 *
 * Formula:
 * - overhead = totalVariableCost * (overheadPercent / 100)
 * - totalVariableCost = foodCost + laborCost + disposables + transport + equipment
 * - totalCost = totalVariableCost + overhead
 *
 * @param foodCost - Cost of food/ingredients
 * @param laborHours - Number of labor hours
 * @param blendedRate - Labor cost per hour (e.g., average hourly rate)
 * @param disposablesCost - Cost of disposables (plates, napkins, etc.)
 * @param transportCost - Cost of transportation
 * @param equipmentCost - Cost of equipment rental/usage
 * @param overheadPercent - Overhead percentage applied to variable costs (0-100+)
 * @returns EventCosts object with detailed breakdown
 * @throws Error if any cost is negative or overhead percent is invalid
 */
export function calculateEventCosts(
  foodCost: number,
  laborHours: number,
  blendedRate: number,
  disposablesCost: number,
  transportCost: number,
  equipmentCost: number,
  overheadPercent: number
): EventCosts {
  // Validate inputs
  if (foodCost < 0) {
    throw new Error("Food cost cannot be negative");
  }

  if (laborHours < 0) {
    throw new Error("Labor hours cannot be negative");
  }

  if (blendedRate < 0) {
    throw new Error("Blended rate cannot be negative");
  }

  if (disposablesCost < 0) {
    throw new Error("Disposables cost cannot be negative");
  }

  if (transportCost < 0) {
    throw new Error("Transport cost cannot be negative");
  }

  if (equipmentCost < 0) {
    throw new Error("Equipment cost cannot be negative");
  }

  if (overheadPercent < 0) {
    throw new Error("Overhead percent cannot be negative");
  }

  // Calculate labor cost
  const laborCost = laborHours * blendedRate;

  // Calculate total variable cost
  const totalVariableCost =
    foodCost +
    laborCost +
    disposablesCost +
    transportCost +
    equipmentCost;

  // Calculate overhead
  const overhead = totalVariableCost * (overheadPercent / 100);

  // Calculate total cost
  const totalCost = totalVariableCost + overhead;

  return {
    foodCost,
    laborCost,
    disposablesCost,
    transportCost,
    equipmentCost,
    overhead,
    totalVariableCost,
    totalCost,
  };
}

/**
 * Calculates the profit margin percentage.
 *
 * Formula: Margin % = ((Total Price - Total Cost) / Total Price) * 100
 *
 * @param totalCost - The total cost of the event
 * @param totalPrice - The total price charged to the client
 * @returns Margin percentage (0-100+)
 * @throws Error if total price is less than or equal to cost
 */
export function calculateMargin(
  totalCost: number,
  totalPrice: number
): number {
  if (totalCost < 0) {
    throw new Error("Total cost cannot be negative");
  }

  if (totalPrice < 0) {
    throw new Error("Total price cannot be negative");
  }

  if (totalPrice === 0) {
    throw new Error("Total price cannot be zero");
  }

  const margin = ((totalPrice - totalCost) / totalPrice) * 100;
  return margin;
}

/**
 * Calculates the recommended price to achieve a target margin percentage.
 *
 * Formula: Price = Total Cost / (1 - (Target Margin % / 100))
 *
 * @param totalCost - The total cost of the event
 * @param targetMarginPercent - The desired margin percentage (0-100)
 * @returns The recommended price to charge
 * @throws Error if inputs are invalid
 */
export function calculateRecommendedPrice(
  totalCost: number,
  targetMarginPercent: number
): number {
  if (totalCost < 0) {
    throw new Error("Total cost cannot be negative");
  }

  if (targetMarginPercent < 0 || targetMarginPercent >= 100) {
    throw new Error("Target margin must be between 0 and 100 percent");
  }

  const marginFraction = 1 - targetMarginPercent / 100;

  if (marginFraction <= 0) {
    throw new Error("Target margin must be less than 100 percent");
  }

  return totalCost / marginFraction;
}

/**
 * Calculates the per-head price from total price and headcount.
 *
 * @param totalPrice - The total price charged
 * @param headcount - Number of guests
 * @returns Price per guest
 * @throws Error if headcount is 0
 */
export function calculatePerHeadPrice(
  totalPrice: number,
  headcount: number
): number {
  if (totalPrice < 0) {
    throw new Error("Total price cannot be negative");
  }

  if (headcount <= 0) {
    throw new Error("Headcount must be greater than 0");
  }

  return totalPrice / headcount;
}

/**
 * Calculates the per-head cost from total cost and headcount.
 *
 * @param totalCost - The total cost
 * @param headcount - Number of guests
 * @returns Cost per guest
 * @throws Error if headcount is 0
 */
export function calculatePerHeadCost(
  totalCost: number,
  headcount: number
): number {
  if (totalCost < 0) {
    throw new Error("Total cost cannot be negative");
  }

  if (headcount <= 0) {
    throw new Error("Headcount must be greater than 0");
  }

  return totalCost / headcount;
}

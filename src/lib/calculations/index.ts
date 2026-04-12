/**
 * Core calculation engine for catering operations platform.
 * Provides pure functions for cost tracking, quantity modeling, and pricing.
 */

// Unit conversion
export {
  convert,
  convertToBaseUnit,
  convertFromBaseUnit,
  isSameMeasurementType,
} from "./unitConversion";

// Yield and cost adjustments
export {
  calculateEPCost,
  calculateCookedCost,
  calculateFullYieldCost,
  calculateAPQuantityNeeded,
  calculateCookedQuantityFromRaw,
  calculateFullAPQuantityNeeded,
} from "./yield";

// Recipe cost calculations
export {
  calculateLineCost,
  calculateRecipeCost,
  calculateRecipeCostPerUnit,
  calculateSubRecipeCost,
  type IngredientData,
  type SubRecipeData,
  type LineCostResult,
  type RecipeCostResult,
} from "./recipeCost";

// Buffet quantity modeling
export {
  calculateBuffetQuantities,
  calculatePortionsFromBuffetQuantity,
  type FoodCategory,
  type QuantityTarget,
  type BuffetMenuItem,
  type BuffetQuantityResult,
} from "./buffetQuantity";

// Cocktail service modeling
export {
  calculateCocktailQuantities,
  calculateCocktailConsumptionRate,
  type CocktailMenuItem,
  type CocktailQuantityResult,
} from "./cocktailQuantity";

// Event costing and pricing
export {
  calculateEventCosts,
  calculateMargin,
  calculateRecommendedPrice,
  calculatePerHeadPrice,
  calculatePerHeadCost,
  type EventCosts,
} from "./eventCost";

// Labor allocation
export {
  calculateBlendedRate,
  estimatePrepHours,
  calculateLaborCost,
  estimateSingleRecipePrepHours,
  type RecipeWithTiming,
} from "./laborAllocation";

// Purchase aggregation and procurement
export {
  explodeRecipeToIngredients,
  aggregateAcrossEvents,
  roundToPackSize,
  calculatePurchaseOrders,
  type ExplodedIngredient,
  type PurchaseRoundingResult,
} from "./purchaseAggregation";

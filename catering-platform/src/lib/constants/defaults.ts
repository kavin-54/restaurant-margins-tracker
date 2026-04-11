import { FoodCategory } from "@/lib/types";
import { QuantityTarget, SystemConfig } from "@/lib/types/systemConfig";

export const DEFAULT_QUANTITY_TARGETS: Record<FoodCategory, QuantityTarget> = {
  protein: { min: 6, max: 8, unit: "oz" },
  starch: { min: 4, max: 6, unit: "oz" },
  vegetable: { min: 3, max: 4, unit: "oz" },
  salad: { min: 2, max: 3, unit: "oz" },
  dessert: { min: 4, max: 6, unit: "oz" },
  bread: { min: 1, max: 2, unit: "pieces" },
  appetizer: { min: 2, max: 3, unit: "oz" },
  beverage: { min: 2, max: 3, unit: "pieces" },
  condiment: { min: 1, max: 2, unit: "oz" },
};

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  bufferDefaults: {
    buffet: 7,
    plated: 5,
    cocktail: 8,
    "drop-off": 7,
    "family-style": 6,
    "food-stations": 7,
  },
  quantityTargets: DEFAULT_QUANTITY_TARGETS,
  weeklyPayroll: 0,
  weeklyLaborHours: 0,
  blendedHourlyRate: 0,
  defaultOverheadPercent: 15,
  priceDeviationThreshold: 5,
  equipmentCapacities: [
    { name: "Stock Pot", capacity: 20, unit: "gallon" },
    { name: "Sheet Pan", capacity: 5, unit: "lb" },
    { name: "Hotel Pan (Full)", capacity: 8, unit: "quart" },
    { name: "Oven", capacity: 6, unit: "sheet pans" },
  ],
};

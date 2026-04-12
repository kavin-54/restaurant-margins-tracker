export type MeasurementType = "weight" | "volume" | "count";

export interface UnitDefinition {
  value: string;
  label: string;
  type: MeasurementType;
  toBase: number; // multiply by this to get base unit (oz for weight, fl_oz for volume, each for count)
}

// Base units: oz (weight), fl_oz (volume), each (count)
export const UNITS: UnitDefinition[] = [
  // Weight — base: oz
  { value: "oz", label: "Ounces (oz)", type: "weight", toBase: 1 },
  { value: "lb", label: "Pounds (lb)", type: "weight", toBase: 16 },
  { value: "g", label: "Grams (g)", type: "weight", toBase: 0.035274 },
  { value: "kg", label: "Kilograms (kg)", type: "weight", toBase: 35.274 },
  // Volume — base: fl_oz
  { value: "tsp", label: "Teaspoon (tsp)", type: "volume", toBase: 0.166667 },
  { value: "tbsp", label: "Tablespoon (tbsp)", type: "volume", toBase: 0.5 },
  { value: "fl_oz", label: "Fluid Ounce (fl oz)", type: "volume", toBase: 1 },
  { value: "cup", label: "Cup", type: "volume", toBase: 8 },
  { value: "pint", label: "Pint", type: "volume", toBase: 16 },
  { value: "quart", label: "Quart", type: "volume", toBase: 32 },
  { value: "gallon", label: "Gallon", type: "volume", toBase: 128 },
  { value: "ml", label: "Milliliters (ml)", type: "volume", toBase: 0.033814 },
  { value: "liter", label: "Liters (L)", type: "volume", toBase: 33.814 },
  // Count — base: each
  { value: "each", label: "Each", type: "count", toBase: 1 },
  { value: "dozen", label: "Dozen", type: "count", toBase: 12 },
  { value: "case", label: "Case", type: "count", toBase: 1 }, // case size varies per ingredient
  { value: "bunch", label: "Bunch", type: "count", toBase: 1 }, // custom per ingredient
  { value: "head", label: "Head", type: "count", toBase: 1 }, // custom per ingredient
  { value: "piece", label: "Piece", type: "count", toBase: 1 },
];

export const WEIGHT_UNITS = UNITS.filter((u) => u.type === "weight");
export const VOLUME_UNITS = UNITS.filter((u) => u.type === "volume");
export const COUNT_UNITS = UNITS.filter((u) => u.type === "count");

export function getUnit(value: string): UnitDefinition | undefined {
  return UNITS.find((u) => u.value === value);
}

export function getUnitType(value: string): MeasurementType | undefined {
  return getUnit(value)?.type;
}

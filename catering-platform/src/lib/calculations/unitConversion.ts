import { UNITS, getUnit } from "@/lib/constants/units";
import { CustomConversion } from "@/lib/types";

/**
 * Converts a quantity from one unit to another.
 * Handles same-type conversions (weight↔weight, volume↔volume) via base units,
 * and cross-type conversions using custom conversions.
 *
 * @param quantity - The quantity to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @param customConversions - Optional custom conversions for bridging cross-type units
 * @returns The converted quantity
 * @throws Error if units don't match type and no custom conversion is available
 */
export function convert(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  customConversions?: CustomConversion[]
): number {
  if (quantity < 0) {
    throw new Error("Quantity cannot be negative");
  }

  if (fromUnit === toUnit) {
    return quantity;
  }

  const from = getUnit(fromUnit);
  const to = getUnit(toUnit);

  if (!from || !to) {
    throw new Error(`Invalid unit(s): ${fromUnit} or ${toUnit}`);
  }

  // Same measurement type conversion
  if (from.type === to.type) {
    const baseQuantity = convertToBaseUnit(quantity, fromUnit);
    return convertFromBaseUnit(baseQuantity, toUnit);
  }

  // Cross-type conversion: look for custom conversion
  // CustomConversion has { unit: string, weightOz: number }
  // e.g., { unit: "cup", weightOz: 4.25 } means 1 cup = 4.25 oz
  if (customConversions && customConversions.length > 0) {
    // If converting from a custom unit to weight
    const fromCustom = customConversions.find((cc) => cc.unit === fromUnit);
    if (fromCustom && to.type === "weight") {
      // Convert custom unit to oz, then to target weight unit
      const inOz = quantity * fromCustom.weightOz;
      return convertFromBaseUnit(inOz, toUnit);
    }

    const toCustom = customConversions.find((cc) => cc.unit === toUnit);
    if (toCustom && from.type === "weight") {
      // Convert from weight to custom unit
      const inOz = convertToBaseUnit(quantity, fromUnit);
      return inOz / toCustom.weightOz;
    }
  }

  throw new Error(
    `Cannot convert between ${from.type} (${fromUnit}) and ${to.type} (${toUnit}) without custom conversion`
  );
}

/**
 * Converts a quantity to its base unit.
 * Base units: oz (weight), fl_oz (volume), each (count)
 *
 * @param quantity - The quantity to convert
 * @param unit - The source unit
 * @returns The quantity in base units
 * @throws Error if unit is invalid
 */
export function convertToBaseUnit(quantity: number, unit: string): number {
  if (quantity < 0) {
    throw new Error("Quantity cannot be negative");
  }

  const unitDef = getUnit(unit);

  if (!unitDef) {
    throw new Error(`Invalid unit: ${unit}`);
  }

  // Already in base unit
  if (unitDef.toBase === 1) {
    return quantity;
  }

  return quantity * unitDef.toBase;
}

/**
 * Converts a quantity from base units to the target unit.
 *
 * @param baseQuantity - The quantity in base units
 * @param toUnit - The target unit
 * @returns The quantity in target units
 * @throws Error if unit is invalid
 */
export function convertFromBaseUnit(
  baseQuantity: number,
  toUnit: string
): number {
  if (baseQuantity < 0) {
    throw new Error("Quantity cannot be negative");
  }

  const unitDef = getUnit(toUnit);

  if (!unitDef) {
    throw new Error(`Invalid unit: ${toUnit}`);
  }

  // Already in base unit
  if (unitDef.toBase === 1) {
    return baseQuantity;
  }

  return baseQuantity / unitDef.toBase;
}

/**
 * Checks if two units are of the same measurement type.
 *
 * @param unit1 - First unit
 * @param unit2 - Second unit
 * @returns True if both units are the same type
 */
export function isSameMeasurementType(unit1: string, unit2: string): boolean {
  const u1 = getUnit(unit1);
  const u2 = getUnit(unit2);

  if (!u1 || !u2) {
    return false;
  }

  return u1.type === u2.type;
}

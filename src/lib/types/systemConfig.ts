import { ServiceStyle, FoodCategory } from "./event";

export interface SystemConfig {
  bufferDefaults: Record<ServiceStyle, number>; // percentage
  quantityTargets: Record<FoodCategory, QuantityTarget>;
  weeklyPayroll: number;
  weeklyLaborHours: number;
  blendedHourlyRate: number; // calculated
  defaultOverheadPercent: number;
  priceDeviationThreshold: number; // percentage
  equipmentCapacities: EquipmentCapacity[];
}

export interface QuantityTarget {
  min: number;
  max: number;
  unit: string; // "oz" for weight-based, "pieces" for count-based
}

export interface EquipmentCapacity {
  name: string;
  capacity: number;
  unit: string;
}

export interface CateringEvent {
  id: string;
  name: string;
  clientId: string;
  clientName: string; // denormalized
  date: Date;
  venue: string;
  serviceStyle: ServiceStyle;
  headcount: number;
  dietaryAccommodations: DietaryAccommodation[];
  bufferPercentage: number;
  adjustedHeadcount: number; // calculated
  eventDurationHours?: number; // required for cocktail
  tableSize?: number; // required for family-style
  costs: EventCosts;
  pricing: EventPricing;
  reconciliation?: EventReconciliation;
  status: EventStatus;
  notes: string;
  duplicatedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventMenuItem {
  id: string;
  recipeId: string;
  recipeName: string;
  category: FoodCategory;
  popularityWeight: number; // 0-100
  scaledQuantity: number;
  scaledUnit: string;
  portionsNeeded: number;
  cost: number;
  isDietaryAccommodation: boolean;
  dietaryType?: string;
  sortOrder: number;
}

export interface EventCosts {
  food: number;
  labor: number;
  laborHoursEstimated: number;
  laborHoursActual?: number;
  disposables: number;
  transport: number;
  equipmentRental: number;
  overhead: number;
  total: number;
}

export interface EventPricing {
  perHeadPrice: number;
  totalPrice: number;
  targetMarginPercent: number;
  actualMarginPercent?: number;
}

export interface EventReconciliation {
  actualHeadcount: number;
  actualFoodCost: number;
  actualLaborCost: number;
  notes: string;
  reconciledAt: Date;
  reconciledBy: string;
}

export interface DietaryAccommodation {
  type: string; // e.g. "vegan", "gluten-free"
  count: number;
}

export type ServiceStyle = "buffet" | "plated" | "cocktail" | "drop-off" | "family-style" | "food-stations";
export type EventStatus = "inquiry" | "proposed" | "confirmed" | "in-prep" | "in-progress" | "completed" | "reconciled";
export type FoodCategory = "protein" | "starch" | "vegetable" | "salad" | "dessert" | "bread" | "appetizer" | "beverage" | "condiment";

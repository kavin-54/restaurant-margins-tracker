export interface InventoryRecord {
  ingredientId: string;
  ingredientName: string;
  quantityOnHand: number;
  unit: string;
  lastUpdated: Date;
  lastPhysicalCount?: Date;
}

export interface InventoryAdjustment {
  id: string;
  type: "received" | "event-deduction" | "reconciliation-correction" | "manual-adjustment";
  quantity: number; // positive for additions, negative for deductions
  reason: string;
  relatedEventId?: string;
  relatedPOId?: string;
  adjustedBy: string;
  adjustedAt: Date;
}

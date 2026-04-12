export interface PurchaseOrder {
  id: string;
  weekStartDate: Date;
  vendorId: string;
  vendorName: string;
  status: POStatus;
  eventIds: string[];
  estimatedTotal: number;
  actualTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface POLine {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantityNeeded: number;
  quantityNeededUnit: string;
  packSize: string;
  packsToOrder: number;
  quantityOrdered: number;
  overageQuantity: number;
  overageCost: number;
  expectedCostPerPack: number;
  expectedTotalCost: number;
  actualQuantityReceived?: number;
  actualCostPerPack?: number;
  actualTotalCost?: number;
  qualityFlag?: "good" | "acceptable" | "poor" | "rejected";
  receivingNotes?: string;
}

export type POStatus = "draft" | "sent" | "partially-received" | "fully-received";

export interface WasteEntry {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  category: WasteCategory;
  costOfWaste: number;
  note: string;
  eventId?: string;
  loggedBy: string;
  loggedAt: Date;
}

export type WasteCategory = "trim" | "overproduction" | "spoilage" | "error";

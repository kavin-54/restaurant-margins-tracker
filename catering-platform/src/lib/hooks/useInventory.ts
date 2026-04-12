"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { orderBy, where } from "firebase/firestore";

export interface InventoryItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  currentQuantity: number;
  unit: string;
  reorderPoint: number;
  lastRestockedAt: Date;
  expiryDate?: Date;
  costPerUnit?: number;
  location?: string;
  notes?: string;
  updatedAt: Date;
}

export interface InventoryAdjustment {
  id: string;
  ingredientId: string;
  adjustmentQuantity: number;
  reason: string; // "restock", "waste", "use", "adjustment"
  notes?: string;
  adjustedAt: Date;
}

export function useInventory() {
  return useCollection<InventoryItem>("inventory", orderBy("ingredientName"));
}

export function useInventoryItem(ingredientId: string) {
  return useDocument<InventoryItem>("inventory", ingredientId);
}

export function useInventoryAdjustments(ingredientId?: string) {
  const constraints = ingredientId
    ? [where("ingredientId", "==", ingredientId), orderBy("adjustedAt", "desc")]
    : [orderBy("adjustedAt", "desc")];
  return useCollection<InventoryAdjustment>(
    "inventoryAdjustments",
    ...constraints
  );
}

export async function adjustInventory(
  ingredientId: string,
  quantity: number,
  reason: "restock" | "waste" | "use" | "adjustment",
  notes?: string
) {
  // Record adjustment
  const adjustment = await addDocument<InventoryAdjustment>(
    "inventoryAdjustments",
    {
      ingredientId,
      adjustmentQuantity: quantity,
      reason,
      notes,
      adjustedAt: new Date(),
    }
  );

  // Update inventory item
  const inventoryItem = await getInventoryItem(ingredientId);
  if (inventoryItem) {
    const newQuantity = inventoryItem.currentQuantity + quantity;
    await updateDocument<InventoryItem>("inventory", ingredientId, {
      currentQuantity: Math.max(0, newQuantity),
      updatedAt: new Date(),
      ...(reason === "restock" && {
        lastRestockedAt: new Date(),
      }),
    });
  }

  return adjustment;
}

// Helper function
async function getInventoryItem(
  ingredientId: string
): Promise<InventoryItem | null> {
  const { getDocument } = await import("@/lib/firebase/firestore");
  return getDocument<InventoryItem>("inventory", ingredientId);
}

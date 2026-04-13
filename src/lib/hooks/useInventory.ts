"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { orderBy, where, QueryConstraint } from "firebase/firestore";
import { useMemo } from "react";

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

export function useInventory(additionalConstraints: QueryConstraint[] = []) {
  const constraints = useMemo(() => [orderBy("ingredientName"), ...additionalConstraints], [additionalConstraints]);
  return useCollection<InventoryItem>("inventory", constraints);
}

export function useInventoryItem(ingredientId: string) {
  return useDocument<InventoryItem>("inventory", ingredientId);
}

export function useInventoryAdjustments(ingredientId?: string) {
  const constraints = useMemo(() =>
    ingredientId
      ? [where("ingredientId", "==", ingredientId), orderBy("adjustedAt", "desc")]
      : [orderBy("adjustedAt", "desc")],
    [ingredientId]
  );
  return useCollection<InventoryAdjustment>(
    "inventoryAdjustments",
    constraints
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

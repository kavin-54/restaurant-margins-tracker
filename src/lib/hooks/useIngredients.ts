"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getDocuments,
} from "@/lib/firebase/firestore";
import { orderBy, query, QueryConstraint, where } from "firebase/firestore";

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  supplier: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorRecord {
  id: string;
  vendorName: string;
  pricePerUnit: number;
  quantity: number;
  unit: string;
  totalCost: number;
  purchaseDate: Date;
  notes?: string;
}

import { useMemo } from "react";

export function useIngredients(additionalConstraints: QueryConstraint[] = []) {
  const constraints = useMemo(() => [orderBy("name"), ...additionalConstraints], [additionalConstraints]);
  return useCollection<Ingredient>("ingredients", constraints);
}

export function useIngredient(id: string) {
  return useDocument<Ingredient>("ingredients", id);
}

const VENDOR_RECORDS_ORDER = [orderBy("purchaseDate", "desc")];
export function useVendorRecords(ingredientId: string) {
  return useCollection<VendorRecord>(
    `ingredients/${ingredientId}/vendorRecords`,
    VENDOR_RECORDS_ORDER
  );
}

export async function addIngredient(data: Omit<Ingredient, "id">) {
  const now = new Date();
  return addDocument<Ingredient>("ingredients", {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateIngredient(
  id: string,
  data: Partial<Omit<Ingredient, "id" | "createdAt">>
) {
  return updateDocument<Ingredient>("ingredients", id, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteIngredient(id: string) {
  return deleteDocument("ingredients", id);
}

export async function addVendorRecord(
  ingredientId: string,
  data: Omit<VendorRecord, "id">
) {
  return addDocument<VendorRecord>(
    `ingredients/${ingredientId}/vendorRecords`,
    data
  );
}

export async function updateVendorRecord(
  ingredientId: string,
  vendorRecordId: string,
  data: Partial<Omit<VendorRecord, "id">>
) {
  return updateDocument<VendorRecord>(
    `ingredients/${ingredientId}/vendorRecords`,
    vendorRecordId,
    data
  );
}

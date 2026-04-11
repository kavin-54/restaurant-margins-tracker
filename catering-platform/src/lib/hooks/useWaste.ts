"use client";

import { useCollection } from "./useFirestore";
import { addDocument } from "@/lib/firebase/firestore";
import { orderBy, where } from "firebase/firestore";

export interface WasteEntry {
  id: string;
  eventId?: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  reason: string; // "spoilage", "accident", "prep-loss", "other"
  date: Date;
  notes?: string;
}

export function useWasteLog(eventId?: string) {
  const constraints = eventId
    ? [where("eventId", "==", eventId), orderBy("date", "desc")]
    : [orderBy("date", "desc")];
  return useCollection<WasteEntry>("wasteLog", ...constraints);
}

export async function addWasteEntry(data: Omit<WasteEntry, "id">) {
  return addDocument<WasteEntry>("wasteLog", {
    ...data,
    date: data.date || new Date(),
  });
}

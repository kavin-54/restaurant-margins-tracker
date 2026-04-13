"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactPerson?: string;
  specialties?: string[];
  leadTime?: number; // in days
  minimumOrder?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

import { useMemo } from "react";
import { QueryConstraint } from "firebase/firestore";

export function useVendors(additionalConstraints: QueryConstraint[] = []) {
  const constraints = useMemo(() => [orderBy("name"), ...additionalConstraints], [additionalConstraints]);
  return useCollection<Vendor>("vendors", constraints);
}

export function useVendor(id: string) {
  return useDocument<Vendor>("vendors", id);
}

export async function addVendor(data: Omit<Vendor, "id">) {
  const now = new Date();
  return addDocument<Vendor>("vendors", {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateVendor(
  id: string,
  data: Partial<Omit<Vendor, "id" | "createdAt">>
) {
  return updateDocument<Vendor>("vendors", id, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteVendor(id: string) {
  return deleteDocument("vendors", id);
}

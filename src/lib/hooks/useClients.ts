"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

import { useMemo } from "react";
import { QueryConstraint } from "firebase/firestore";

export function useClients(additionalConstraints: QueryConstraint[] = []) {
  const constraints = useMemo(() => [orderBy("name"), ...additionalConstraints], [additionalConstraints]);
  return useCollection<Client>("clients", constraints);
}

export function useClient(id: string) {
  return useDocument<Client>("clients", id);
}

export async function addClient(data: Omit<Client, "id">) {
  const now = new Date();
  return addDocument<Client>("clients", {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt">>
) {
  return updateDocument<Client>("clients", id, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteClient(id: string) {
  return deleteDocument("clients", id);
}

"use client";

import { useDocument } from "./useFirestore";
import { updateDocument } from "@/lib/firebase/firestore";

export interface SystemConfig {
  id: string;
  businessName: string;
  taxRate: number;
  defaultMarkupPercentage: number;
  defaultMinMarginPercentage: number;
  laborCostPerHour: number;
  prepTimeMinutesPerServing: number;
  currency: string;
  timezone: string;
  contactEmail: string;
  contactPhone: string;
  updatedAt: Date;
}

const CONFIG_ID = "default";

export function useSystemConfig() {
  return useDocument<SystemConfig>("systemConfig", CONFIG_ID);
}

export async function updateSystemConfig(
  data: Partial<Omit<SystemConfig, "id" | "updatedAt">>
) {
  return updateDocument<SystemConfig>("systemConfig", CONFIG_ID, {
    ...data,
    updatedAt: new Date(),
  });
}

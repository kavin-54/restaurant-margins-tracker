"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";

export interface RecipeLine {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineCost: number;
  sortOrder: number;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  costPerServing: number;
  totalRecipeCost: number;
  category: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useRecipes() {
  return useCollection<Recipe>("recipes", orderBy("name"));
}

export function useRecipe(id: string) {
  return useDocument<Recipe>("recipes", id);
}

export function useRecipeLines(recipeId: string) {
  return useCollection<RecipeLine>(
    `recipes/${recipeId}/lines`,
    orderBy("sortOrder")
  );
}

export async function addRecipe(data: Omit<Recipe, "id">) {
  const now = new Date();
  return addDocument<Recipe>("recipes", {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateRecipe(
  id: string,
  data: Partial<Omit<Recipe, "id" | "createdAt">>
) {
  return updateDocument<Recipe>("recipes", id, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteRecipe(id: string) {
  return deleteDocument("recipes", id);
}

export async function addRecipeLine(
  recipeId: string,
  data: Omit<RecipeLine, "id">
) {
  return addDocument<RecipeLine>(`recipes/${recipeId}/lines`, data);
}

export async function updateRecipeLine(
  recipeId: string,
  lineId: string,
  data: Partial<Omit<RecipeLine, "id">>
) {
  return updateDocument<RecipeLine>(
    `recipes/${recipeId}/lines`,
    lineId,
    data
  );
}

export async function deleteRecipeLine(
  recipeId: string,
  lineId: string
) {
  return deleteDocument(`recipes/${recipeId}/lines`, lineId);
}

export async function duplicateRecipe(recipeId: string) {
  const recipe = await getRecipeData(recipeId);
  if (!recipe) throw new Error("Recipe not found");

  const newRecipe = await addRecipe({
    ...recipe,
    name: `${recipe.name} (Copy)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  // Copy recipe lines
  const lines = await getRecipeLines(recipeId);
  for (const line of lines) {
    const { id, ...lineData } = line;
    await addRecipeLine(newRecipe.id, lineData);
  }

  return newRecipe;
}

// Helper functions to get data
async function getRecipeData(recipeId: string): Promise<Recipe | null> {
  const { getDocument } = await import("@/lib/firebase/firestore");
  return getDocument<Recipe>("recipes", recipeId);
}

async function getRecipeLines(recipeId: string): Promise<RecipeLine[]> {
  const { getDocuments } = await import("@/lib/firebase/firestore");
  return getDocuments<RecipeLine>(`recipes/${recipeId}/lines`, orderBy("sortOrder"));
}

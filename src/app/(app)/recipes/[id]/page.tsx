"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  useRecipe,
  useRecipeLines,
  updateRecipe,
  deleteRecipe,
  addRecipeLine,
  updateRecipeLine,
  deleteRecipeLine,
  duplicateRecipe,
  type RecipeLine,
} from "@/lib/hooks/useRecipes";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { UNITS, getUnit } from "@/lib/constants/units";

function convertCostPerUnit(
  baseUnit: string,
  baseCostPerUnit: number,
  targetUnit: string,
): number {
  if (baseUnit === targetUnit) return baseCostPerUnit;
  const base = getUnit(baseUnit);
  const target = getUnit(targetUnit);
  if (!base || !target || base.type !== target.type) return baseCostPerUnit;
  return baseCostPerUnit * (target.toBase / base.toBase);
}

function unitsForIngredient(ingredientUnit: string) {
  const base = getUnit(ingredientUnit);
  if (!base) return UNITS;
  return UNITS.filter((u) => u.type === base.type);
}

const CATEGORIES = [
  { value: "appetizer", label: "Appetizer" },
  { value: "main", label: "Main" },
  { value: "side", label: "Side" },
  { value: "dessert", label: "Dessert" },
  { value: "sauce", label: "Sauce" },
  { value: "base", label: "Base" },
  { value: "marinade", label: "Marinade" },
  { value: "beverage", label: "Beverage" },
  { value: "bread", label: "Bread" },
  { value: "salad", label: "Salad" },
  { value: "soup", label: "Soup" },
  { value: "other", label: "Other" },
];

const categoryBadgeColors: Record<string, string> = {
  appetizer: "bg-purple-600 text-white",
  main: "bg-blue-600 text-white",
  side: "bg-green-600 text-white",
  dessert: "bg-red-600 text-white",
  sauce: "bg-orange-600 text-white",
  base: "bg-slate-600 text-white",
  marinade: "bg-purple-600 text-white",
  beverage: "bg-cyan-600 text-white",
  bread: "bg-yellow-600 text-white",
  salad: "bg-emerald-600 text-white",
  soup: "bg-red-600 text-white",
  other: "bg-gray-600 text-white",
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const recipeId = params.id as string;

  const { data: recipe, loading: recipeLoading } = useRecipe(recipeId);
  const { data: lines, loading: linesLoading } = useRecipeLines(recipeId);
  const { data: ingredients } = useIngredients();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editServings, setEditServings] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const [lineIngredientId, setLineIngredientId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("");
  const [lineUnit, setLineUnit] = useState("");
  const [lineNotes, setLineNotes] = useState("");

  const [editLineQuantity, setEditLineQuantity] = useState("");
  const [editLineUnit, setEditLineUnit] = useState("");
  const [editLineNotes, setEditLineNotes] = useState("");

  useEffect(() => {
    if (recipe) {
      setEditName(recipe.name);
      setEditCategory(recipe.category);
      setEditServings(String(recipe.servings));
      setEditDescription(recipe.description || "");
    }
  }, [recipe]);

  if (recipeLoading) return <LoadingScreen />;

  if (!recipe) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500 font-medium">Recipe not found.</p>
      </div>
    );
  }

  const badgeColor = categoryBadgeColors[recipe.category] || categoryBadgeColors.other;

  async function recalculateCosts(updatedLines: RecipeLine[], servings?: number) {
    const totalRecipeCost = updatedLines.reduce((sum, l) => sum + l.lineCost, 0);
    const srv = servings ?? recipe!.servings;
    const costPerServing = srv > 0 ? totalRecipeCost / srv : 0;
    await updateRecipe(recipeId, { totalRecipeCost, costPerServing });
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      toast({ title: "Recipe name is required", variant: "destructive" });
      return;
    }
    const newServings = Number(editServings);
    if (!newServings || newServings <= 0) {
      toast({ title: "Servings must be greater than zero", variant: "destructive" });
      return;
    }

    try {
      const totalRecipeCost = (lines || []).reduce((sum, l) => sum + l.lineCost, 0);
      const costPerServing = newServings > 0 ? totalRecipeCost / newServings : 0;

      await updateRecipe(recipeId, {
        name: editName.trim(),
        category: editCategory,
        servings: newServings,
        description: editDescription.trim() || undefined,
        totalRecipeCost,
        costPerServing,
      });
      toast({ title: "Recipe updated" });
      setEditing(false);
    } catch {
      toast({ title: "Failed to update recipe", variant: "destructive" });
    }
  }

  async function handleDelete() {
    try {
      await deleteRecipe(recipeId);
      toast({ title: "Recipe deleted" });
      router.push("/recipes");
    } catch {
      toast({ title: "Failed to delete recipe", variant: "destructive" });
    }
  }

  async function handleDuplicate() {
    try {
      const newRecipe = await duplicateRecipe(recipeId);
      toast({ title: "Recipe duplicated" });
      router.push(`/recipes/${newRecipe.id}`);
    } catch {
      toast({ title: "Failed to duplicate recipe", variant: "destructive" });
    }
  }

  async function handleAddLine() {
    if (!lineIngredientId) {
      toast({ title: "Select an ingredient", variant: "destructive" });
      return;
    }
    const qty = Number(lineQuantity);
    if (!qty || qty <= 0) {
      toast({ title: "Quantity must be greater than zero", variant: "destructive" });
      return;
    }

    const ingredient = ingredients?.find((i) => i.id === lineIngredientId);
    if (!ingredient) return;

    const chosenUnit = lineUnit || ingredient.unit;
    const convertedCostPerUnit = convertCostPerUnit(
      ingredient.unit,
      ingredient.costPerUnit,
      chosenUnit,
    );
    const lineCost = qty * convertedCostPerUnit;
    const maxSort = (lines || []).reduce(
      (max, l) => Math.max(max, l.sortOrder),
      0
    );

    try {
      await addRecipeLine(recipeId, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: qty,
        unit: chosenUnit,
        costPerUnit: convertedCostPerUnit,
        lineCost,
        sortOrder: maxSort + 1,
        notes: lineNotes.trim() || undefined,
      });

      const updatedLines = [
        ...(lines || []),
        { lineCost } as RecipeLine,
      ];
      await recalculateCosts(updatedLines);

      toast({ title: "Ingredient added" });
      setAddLineOpen(false);
      resetLineForm();
    } catch {
      toast({ title: "Failed to add ingredient", variant: "destructive" });
    }
  }

  async function handleUpdateLine(line: RecipeLine) {
    const qty = Number(editLineQuantity);
    if (!qty || qty <= 0) {
      toast({ title: "Quantity must be greater than zero", variant: "destructive" });
      return;
    }

    const ingredient = ingredients?.find((i) => i.id === line.ingredientId);
    const chosenUnit = editLineUnit || line.unit;
    const convertedCostPerUnit = ingredient
      ? convertCostPerUnit(ingredient.unit, ingredient.costPerUnit, chosenUnit)
      : line.costPerUnit;
    const lineCost = qty * convertedCostPerUnit;
    try {
      await updateRecipeLine(recipeId, line.id, {
        quantity: qty,
        unit: chosenUnit,
        costPerUnit: convertedCostPerUnit,
        lineCost,
        notes: editLineNotes.trim() || undefined,
      });

      const updatedLines = (lines || []).map((l) =>
        l.id === line.id
          ? { ...l, quantity: qty, unit: chosenUnit, costPerUnit: convertedCostPerUnit, lineCost }
          : l
      );
      await recalculateCosts(updatedLines);

      toast({ title: "Line updated" });
      setEditingLineId(null);
    } catch {
      toast({ title: "Failed to update line", variant: "destructive" });
    }
  }

  async function handleDeleteLine(lineId: string) {
    try {
      await deleteRecipeLine(recipeId, lineId);

      const updatedLines = (lines || []).filter((l) => l.id !== lineId);
      await recalculateCosts(updatedLines);

      toast({ title: "Ingredient removed" });
    } catch {
      toast({ title: "Failed to remove ingredient", variant: "destructive" });
    }
  }

  function resetLineForm() {
    setLineIngredientId("");
    setLineQuantity("");
    setLineUnit("");
    setLineNotes("");
  }

  function startEditLine(line: RecipeLine) {
    setEditingLineId(line.id);
    setEditLineQuantity(String(line.quantity));
    setEditLineUnit(line.unit);
    setEditLineNotes(line.notes || "");
  }

  function handleIngredientChange(id: string) {
    setLineIngredientId(id);
    const ing = ingredients?.find((i) => i.id === id);
    setLineUnit(ing?.unit ?? "");
  }

  const totalCost = (lines || []).reduce((sum, l) => sum + l.lineCost, 0);
  const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;

  return (
    <div>
      <PageHeader title={recipe.name} backHref="/recipes" />

      {editing ? (
        /* Edit mode */
        <div className="bg-white rounded-2xl ambient-shadow p-6 mb-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipe Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Servings</Label>
                <Input
                  type="number"
                  min="1"
                  value={editServings}
                  onChange={(e) => setEditServings(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="h-10 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl px-5 flex items-center gap-2 hover:shadow-md active:scale-95 transition-all duration-150"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="h-10 bg-white text-gray-600 text-sm font-bold rounded-xl border border-gray-200 px-5 flex items-center gap-2 hover:bg-gray-50 transition-all duration-150"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Two-column layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Image placeholder */}
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
              <div className="h-56 bg-gray-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-6xl">restaurant</span>
              </div>
              <div className="p-4 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>
                  {recipe.category}
                </span>
                {recipe.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">{recipe.description}</p>
                )}
              </div>
            </div>

            {/* Cost summary card */}
            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-4">Cost Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">Servings</span>
                  <span className="text-sm font-bold text-gray-900">{recipe.servings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">Total Cost</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">Cost per Serving</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(costPerServing)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">Ingredients</span>
                  <span className="text-sm font-bold text-gray-900">{lines?.length ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setEditing(true)}
                className="h-10 bg-white text-gray-700 text-sm font-bold rounded-xl border border-gray-200 px-4 flex items-center gap-2 hover:bg-gray-50 transition-all duration-150 w-full"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Recipe
              </button>
              <button
                onClick={handleDuplicate}
                className="h-10 bg-white text-gray-700 text-sm font-bold rounded-xl border border-gray-200 px-4 flex items-center gap-2 hover:bg-gray-50 transition-all duration-150 w-full"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                Duplicate
              </button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <button className="h-10 bg-white text-red-600 text-sm font-bold rounded-xl border border-red-200 px-4 flex items-center gap-2 hover:bg-red-50 transition-all duration-150 w-full">
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Delete Recipe
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Recipe</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete &quot;{recipe.name}&quot;? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ingredient lines */}
            <div className="bg-white rounded-2xl ambient-shadow">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-lg font-bold text-gray-900">Ingredient Lines</h2>
                <Dialog open={addLineOpen} onOpenChange={(open) => {
                  setAddLineOpen(open);
                  if (!open) resetLineForm();
                }}>
                  <DialogTrigger asChild>
                    <button className="h-9 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl px-4 flex items-center gap-1.5 hover:shadow-md active:scale-95 transition-all duration-150">
                      <span className="material-symbols-outlined text-base">add</span>
                      Add Ingredient
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Ingredient</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Ingredient</Label>
                        <Select value={lineIngredientId} onValueChange={handleIngredientChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {(ingredients || []).map((ing) => (
                              <SelectItem key={ing.id} value={ing.id}>
                                {ing.name} ({formatCurrency(ing.costPerUnit)}/{ing.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="e.g., 2.5"
                            value={lineQuantity}
                            onChange={(e) => setLineQuantity(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Select
                            value={lineUnit}
                            onValueChange={setLineUnit}
                            disabled={!lineIngredientId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {(lineIngredientId
                                ? unitsForIngredient(
                                    ingredients?.find((i) => i.id === lineIngredientId)?.unit ?? "",
                                  )
                                : UNITS
                              ).map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Input
                          placeholder="e.g., diced, room temperature"
                          value={lineNotes}
                          onChange={(e) => setLineNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAddLineOpen(false);
                            resetLineForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddLine}>Add</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="p-5">
                {linesLoading ? (
                  <div className="flex justify-center py-8">
                    <p className="text-sm text-gray-400 font-medium">Loading...</p>
                  </div>
                ) : !lines || lines.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 font-medium">
                    No ingredients added yet. Click &quot;Add Ingredient&quot; to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Ingredient</th>
                          <th className="text-left pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[80px]">Qty</th>
                          <th className="text-left pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[70px]">Unit</th>
                          <th className="text-left pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[100px]">Cost/Unit</th>
                          <th className="text-left pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[100px]">Line Cost</th>
                          <th className="text-left pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Notes</th>
                          <th className="text-right pb-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr key={line.id} className="border-b border-gray-50 last:border-0">
                            {editingLineId === line.id ? (
                              (() => {
                                const editIng = ingredients?.find((i) => i.id === line.ingredientId);
                                const editCostPerUnit = editIng
                                  ? convertCostPerUnit(editIng.unit, editIng.costPerUnit, editLineUnit || line.unit)
                                  : line.costPerUnit;
                                const editUnitOptions = editIng ? unitsForIngredient(editIng.unit) : UNITS;
                                return (
                              <>
                                <td className="py-3 text-sm font-medium text-gray-900">{line.ingredientName}</td>
                                <td className="py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="h-8 w-20"
                                    value={editLineQuantity}
                                    onChange={(e) => setEditLineQuantity(e.target.value)}
                                  />
                                </td>
                                <td className="py-3">
                                  <Select value={editLineUnit} onValueChange={setEditLineUnit}>
                                    <SelectTrigger className="h-8 w-[90px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {editUnitOptions.map((u) => (
                                        <SelectItem key={u.value} value={u.value}>
                                          {u.value}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-3 text-sm text-gray-500">{formatCurrency(editCostPerUnit)}</td>
                                <td className="py-3 text-sm font-bold text-blue-700">
                                  {formatCurrency(Number(editLineQuantity) * editCostPerUnit)}
                                </td>
                                <td className="py-3">
                                  <Input
                                    className="h-8"
                                    value={editLineNotes}
                                    onChange={(e) => setEditLineNotes(e.target.value)}
                                    placeholder="Notes"
                                  />
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => handleUpdateLine(line)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-lg">check</span>
                                    </button>
                                    <button
                                      onClick={() => setEditingLineId(null)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                  </div>
                                </td>
                              </>
                                );
                              })()
                            ) : (
                              <>
                                <td className="py-3 text-sm font-medium text-gray-900">{line.ingredientName}</td>
                                <td className="py-3 text-sm text-gray-700">{line.quantity}</td>
                                <td className="py-3 text-sm text-gray-500">{line.unit}</td>
                                <td className="py-3 text-sm text-gray-500">{formatCurrency(line.costPerUnit)}</td>
                                <td className="py-3 text-sm font-bold text-blue-700">{formatCurrency(line.lineCost)}</td>
                                <td className="py-3 text-sm text-gray-400">{line.notes || "-"}</td>
                                <td className="py-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => startEditLine(line)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLine(line.id)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions placeholder */}
            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-4">Instructions</h3>
              {recipe.description ? (
                <p className="text-sm text-gray-600 leading-relaxed">{recipe.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No instructions added yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useIngredients, type Ingredient } from "@/lib/hooks/useIngredients";

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

const categoryColors: Record<string, string> = {
  appetizer: "bg-amber-100 text-amber-800",
  main: "bg-blue-100 text-blue-800",
  side: "bg-green-100 text-green-800",
  dessert: "bg-pink-100 text-pink-800",
  sauce: "bg-orange-100 text-orange-800",
  base: "bg-slate-100 text-slate-800",
  marinade: "bg-purple-100 text-purple-800",
  beverage: "bg-cyan-100 text-cyan-800",
  bread: "bg-yellow-100 text-yellow-800",
  salad: "bg-emerald-100 text-emerald-800",
  soup: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
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

  // Add line form state
  const [lineIngredientId, setLineIngredientId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("");
  const [lineNotes, setLineNotes] = useState("");

  // Edit line form state
  const [editLineQuantity, setEditLineQuantity] = useState("");
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
        <p className="text-muted-foreground">Recipe not found.</p>
      </div>
    );
  }

  const colorClass = categoryColors[recipe.category] || categoryColors.other;

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

    const lineCost = qty * ingredient.costPerUnit;
    const maxSort = (lines || []).reduce(
      (max, l) => Math.max(max, l.sortOrder),
      0
    );

    try {
      await addRecipeLine(recipeId, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: qty,
        unit: ingredient.unit,
        costPerUnit: ingredient.costPerUnit,
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

    const lineCost = qty * line.costPerUnit;
    try {
      await updateRecipeLine(recipeId, line.id, {
        quantity: qty,
        lineCost,
        notes: editLineNotes.trim() || undefined,
      });

      const updatedLines = (lines || []).map((l) =>
        l.id === line.id ? { ...l, quantity: qty, lineCost } : l
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
    setLineNotes("");
  }

  function startEditLine(line: RecipeLine) {
    setEditingLineId(line.id);
    setEditLineQuantity(String(line.quantity));
    setEditLineNotes(line.notes || "");
  }

  return (
    <div>
      <PageHeader title={recipe.name} backHref="/recipes" />

      {/* Recipe Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {editing ? (
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
                <Button size="sm" onClick={handleSaveEdit}>
                  <Check className="mr-1 h-4 w-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="secondary" className={colorClass}>
                    {recipe.category}
                  </Badge>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground">
                      {recipe.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDuplicate}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Duplicate
                  </Button>
                  <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Recipe</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete &quot;{recipe.name}
                        &quot;? This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteDialogOpen(false)}
                        >
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

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Servings</p>
                  <p className="text-lg font-semibold">{recipe.servings}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(recipe.totalRecipeCost)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Cost per Serving
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(recipe.costPerServing)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Ingredients</p>
                  <p className="text-lg font-semibold">
                    {lines?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingredient Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Ingredient Lines</CardTitle>
          <Dialog open={addLineOpen} onOpenChange={(open) => {
            setAddLineOpen(open);
            if (!open) resetLineForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Ingredient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Ingredient</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Ingredient</Label>
                  <Select
                    value={lineIngredientId}
                    onValueChange={setLineIngredientId}
                  >
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
                  {lineIngredientId && (
                    <p className="text-xs text-muted-foreground">
                      Unit:{" "}
                      {ingredients?.find((i) => i.id === lineIngredientId)?.unit}
                    </p>
                  )}
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
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {linesLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : !lines || lines.length === 0 ? (
            <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
              No ingredients added yet. Click &quot;Add Ingredient&quot; to get
              started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[70px]">Unit</TableHead>
                    <TableHead className="w-[100px]">Cost/Unit</TableHead>
                    <TableHead className="w-[100px]">Line Cost</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      {editingLineId === line.id ? (
                        <>
                          <TableCell className="font-medium">
                            {line.ingredientName}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              className="h-8 w-20"
                              value={editLineQuantity}
                              onChange={(e) =>
                                setEditLineQuantity(e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>{line.unit}</TableCell>
                          <TableCell>
                            {formatCurrency(line.costPerUnit)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              Number(editLineQuantity) * line.costPerUnit
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8"
                              value={editLineNotes}
                              onChange={(e) =>
                                setEditLineNotes(e.target.value)
                              }
                              placeholder="Notes"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleUpdateLine(line)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setEditingLineId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">
                            {line.ingredientName}
                          </TableCell>
                          <TableCell>{line.quantity}</TableCell>
                          <TableCell>{line.unit}</TableCell>
                          <TableCell>
                            {formatCurrency(line.costPerUnit)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(line.lineCost)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {line.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => startEditLine(line)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteLine(line.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {lines && lines.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Recipe Cost
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    lines.reduce((sum, l) => sum + l.lineCost, 0)
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Cost per Serving ({recipe.servings} servings)
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    recipe.servings > 0
                      ? lines.reduce((sum, l) => sum + l.lineCost, 0) /
                          recipe.servings
                      : 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";
import { addRecipe } from "@/lib/hooks/useRecipes";

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

export default function NewRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [servings, setServings] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Recipe name is required", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    if (!servings || Number(servings) <= 0) {
      toast({ title: "Servings must be greater than zero", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await addRecipe({
        name: name.trim(),
        category,
        servings: Number(servings),
        description: description.trim() || undefined,
        costPerServing: 0,
        totalRecipeCost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      toast({ title: "Recipe created" });
      router.push(`/recipes/${result.id}`);
    } catch (err) {
      toast({
        title: "Failed to create recipe",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Create Recipe" backHref="/recipes" />

      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name</Label>
              <Input
                id="name"
                placeholder="e.g., Grilled Chicken Breast"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
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
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 10"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description, prep notes, or special instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/recipes")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Recipe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

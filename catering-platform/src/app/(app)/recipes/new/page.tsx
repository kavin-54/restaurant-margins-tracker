"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
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

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="border-l-4 border-blue-700 p-8">
              <div className="space-y-5">
                {/* Recipe Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Recipe Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Grilled Chicken Breast"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-50 border-none h-12 rounded-lg"
                  />
                </div>

                {/* Category + Servings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg">
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Servings <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g., 10"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Description
                  </label>
                  <Textarea
                    placeholder="Brief description, prep notes, or special instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-gray-50 border-none rounded-lg resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => router.push("/recipes")}
              className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

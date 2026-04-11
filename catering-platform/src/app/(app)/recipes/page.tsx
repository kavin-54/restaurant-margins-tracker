"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, BookOpen, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecipes, type Recipe } from "@/lib/hooks/useRecipes";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
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

export default function RecipesPage() {
  const { data: recipes, loading } = useRecipes();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter((r) => {
      const matchesSearch = r.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || r.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, search, categoryFilter]);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Recipes"
        description="Manage your recipe catalog and track costs"
        action={{
          label: "New Recipe",
          href: "/recipes/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {recipes && recipes.length > 0 ? (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
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

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No recipes match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No recipes yet"
          description="Create your first recipe to start tracking ingredient costs and portion pricing."
          action={{
            label: "Create Recipe",
            href: "/recipes/new",
          }}
        />
      )}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const colorClass = categoryColors[recipe.category] || categoryColors.other;

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2">
              {recipe.name}
            </h3>
            <Badge variant="secondary" className={`ml-2 shrink-0 ${colorClass}`}>
              {recipe.category}
            </Badge>
          </div>

          {recipe.description && (
            <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Servings</p>
              <p className="text-sm font-medium">{recipe.servings}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per Serving</p>
              <p className="text-sm font-medium">
                {formatCurrency(recipe.costPerServing)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-sm font-medium">
                {formatCurrency(recipe.totalRecipeCost)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

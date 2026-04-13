"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
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

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "cost-asc", label: "Cost: Low" },
  { value: "cost-desc", label: "Cost: High" },
  { value: "servings", label: "Servings" },
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

const VISIBLE_COUNT = 9;

import { limit } from "firebase/firestore";
import Loading from "../loading";

export default function RecipesPage() {
  const constraints = useMemo(() => [limit(100)], []);
  const { data: recipes, loading } = useRecipes(constraints);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!recipes) return [];
    let result = recipes.filter((r) => {
      return categoryFilter === "all" || r.category === categoryFilter;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "cost-asc":
          return a.totalRecipeCost - b.totalRecipeCost;
        case "cost-desc":
          return b.totalRecipeCost - a.totalRecipeCost;
        case "servings":
          return b.servings - a.servings;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [recipes, categoryFilter, sortBy]);

  const visible = showAll ? filtered : filtered.slice(0, VISIBLE_COUNT);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Recipe Catalog"
        description="Discover and manage your culinary creations"
        action={{
          label: "New Recipe",
          href: "/recipes/new",
          icon: "add",
        }}
      />

      {recipes && recipes.length > 0 ? (
        <>
          {/* Filter bar */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-white border">
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

            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 ${
                    sortBy === opt.value
                      ? "bg-blue-700 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-medium">
              No recipes match your filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visible.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              {filtered.length > VISIBLE_COUNT && !showAll && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="bg-white rounded-xl border border-gray-200 px-6 py-3 font-bold text-blue-700 hover:bg-blue-50 transition-colors duration-150"
                  >
                    Show More Recipes
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon="menu_book"
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
  const badgeColor = categoryBadgeColors[recipe.category] || categoryBadgeColors.other;

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden ambient-shadow group cursor-pointer">
        {/* Image area */}
        <div className="h-48 bg-gray-200 relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <span className="material-symbols-outlined text-gray-400 text-5xl">restaurant</span>
          </div>
          <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>
            {recipe.category}
          </span>
        </div>

        {/* Card body */}
        <div className="p-5">
          <h3 className="font-bold text-lg text-gray-900">{recipe.name}</h3>
          {recipe.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {recipe.description}
            </p>
          )}

          {/* Cost breakdown */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Servings</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{recipe.servings}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cost/Srv</p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">
                {formatCurrency(recipe.costPerServing)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Cost</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {formatCurrency(recipe.totalRecipeCost)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

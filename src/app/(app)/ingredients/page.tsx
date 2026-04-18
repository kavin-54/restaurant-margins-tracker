"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useIngredients, deleteIngredient } from "@/lib/hooks/useIngredients";
import { useInventory, type InventoryItem } from "@/lib/hooks/useInventory";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: "protein", label: "Meat / Protein" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry Goods" },
  { value: "spice", label: "Spice" },
  { value: "condiment", label: "Condiment" },
  { value: "oil-fat", label: "Oil & Fat" },
  { value: "grain-starch", label: "Grain & Starch" },
  { value: "beverage", label: "Beverage" },
  { value: "disposable", label: "Disposable" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "cost-asc", label: "Cost: Low to High" },
  { value: "cost-desc", label: "Cost: High to Low" },
  { value: "category", label: "Category" },
];

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function getCategoryBadgeClasses(category: string): string {
  switch (category) {
    case "produce":
      return "bg-green-100 text-green-700";
    case "dairy":
      return "bg-blue-100 text-blue-700";
    case "dry-goods":
      return "bg-purple-100 text-purple-700";
    case "protein":
      return "bg-red-100 text-red-700";
    case "spice":
      return "bg-amber-100 text-amber-700";
    case "grain-starch":
      return "bg-orange-100 text-orange-700";
    case "oil-fat":
      return "bg-yellow-100 text-yellow-700";
    case "condiment":
      return "bg-teal-100 text-teal-700";
    case "beverage":
      return "bg-cyan-100 text-cyan-700";
    case "disposable":
    case "packaging":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getStockIndicator(inv: InventoryItem | undefined): { color: string; label: string } {
  if (!inv) return { color: "bg-gray-300", label: "No data" };
  const reorder = inv.reorderPoint ?? 0;
  if (inv.currentQuantity <= 0) return { color: "bg-red-500", label: "Out of stock" };
  if (reorder > 0 && inv.currentQuantity <= reorder) return { color: "bg-red-500", label: "Critical" };
  if (reorder > 0 && inv.currentQuantity <= reorder * 1.5) return { color: "bg-yellow-500", label: "Low" };
  return { color: "bg-green-500", label: "In stock" };
}

import { limit } from "firebase/firestore";
import Loading from "../loading";

const ITEMS_PER_PAGE = 15;

export default function IngredientsPage() {
  const constraints = useMemo(() => [limit(200)], []);
  const { data: ingredients, loading, error } = useIngredients(constraints);
  const { data: inventory } = useInventory();
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);

  // Map ingredientId → InventoryItem for quick stock lookup
  const inventoryByIngredient = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const inv of inventory ?? []) map.set(inv.ingredientId, inv);
    return map;
  }, [inventory]);

  // "Most expensive" top 10 — labelled as such since we don't yet track recipe usage frequency
  const topByCost = useMemo(() => {
    if (!ingredients || ingredients.length === 0) return [];
    return [...ingredients]
      .sort((a, b) => b.costPerUnit - a.costPerUnit)
      .slice(0, 10);
  }, [ingredients]);

  const filtered = useMemo(() => {
    if (!ingredients) return [];

    let result = ingredients.filter((ing) => {
      const matchesCategory =
        categoryFilter === "all" || ing.category === categoryFilter;
      return matchesCategory;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "cost-asc":
          return a.costPerUnit - b.costPerUnit;
        case "cost-desc":
          return b.costPerUnit - a.costPerUnit;
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return result;
  }, [ingredients, categoryFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteIngredient(id);
      toast({ title: "Deleted", description: `${name} has been removed.` });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete ingredient.",
        variant: "destructive",
      });
    }
  }

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="p-6 text-red-600">
        Failed to load ingredients. Please try again.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ingredients"
        description="Master your ingredient catalog"
        action={{
          label: "Add Ingredient",
          href: "/ingredients/new",
          icon: "add",
        }}
      />

      {ingredients && ingredients.length > 0 ? (
        <>
          {/* Most Expensive top 10 */}
          {topByCost.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setFavoritesCollapsed(!favoritesCollapsed)}
                className="flex items-center gap-2 mb-3 group"
              >
                <span className="material-symbols-outlined text-gray-400 text-lg transition-transform duration-200" style={{ transform: favoritesCollapsed ? "rotate(-90deg)" : "rotate(0)" }}>
                  expand_more
                </span>
                <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                  Most Expensive
                </h3>
                <span className="text-[10px] text-gray-300 font-medium">
                  ({topByCost.length})
                </span>
              </button>

              {!favoritesCollapsed && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {topByCost.map((ing) => {
                    const stock = getStockIndicator(inventoryByIngredient.get(ing.id));
                    return (
                      <Link
                        key={ing.id}
                        href={`/ingredients/${ing.id}`}
                        className="flex-shrink-0 w-44 bg-white rounded-2xl p-4 hover:shadow-md transition-all duration-150 group/card"
                        style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
                          <div className={`w-2.5 h-2.5 rounded-full ${stock.color}`} title={stock.label} />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover/card:text-blue-700 transition-colors">
                          {ing.name}
                        </p>
                        <p className="text-xs font-bold text-blue-700 mt-1">
                          {formatCurrency(ing.costPerUnit)}
                          <span className="text-gray-400 font-medium"> / {ing.unit}</span>
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center gap-3 mb-6">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-4 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-4 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              No ingredients match your filters.
            </div>
          ) : (
            <>
              {/* Data Table */}
              <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Name
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Category
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Unit
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Cost/Unit
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Stock
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Supplier
                      </th>
                      <th className="text-right px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedItems.map((ing) => {
                      const stock = getStockIndicator(inventoryByIngredient.get(ing.id));
                      return (
                        <tr
                          key={ing.id}
                          className="group hover:bg-gray-50 transition cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/ingredients/${ing.id}`}
                              className="flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-900">
                                {ing.name}
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClasses(ing.category)}`}
                            >
                              {getCategoryLabel(ing.category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {ing.unit}
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-700 font-bold">
                            {formatCurrency(ing.costPerUnit)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                              <span className={`w-2 h-2 rounded-full ${stock.color}`} />
                              {stock.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {ing.supplier || "\u2014"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                              <Link
                                href={`/ingredients/${ing.id}`}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              >
                                <span className="material-symbols-outlined text-lg">
                                  edit
                                </span>
                              </Link>
                              <button
                                onClick={(e) => handleDelete(e, ing.id, ing.name)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                <span className="material-symbols-outlined text-lg">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-sm text-gray-400 font-medium">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    {"\u2013"}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
                    {filtered.length} ingredients
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-lg">
                        chevron_left
                      </span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                            page === currentPage
                              ? "bg-blue-700 text-white"
                              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-lg">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon="egg_alt"
          title="No ingredients yet"
          description="Add your first ingredient to start tracking costs and building recipes."
          action={{ label: "Add Ingredient", href: "/ingredients/new" }}
        />
      )}
    </div>
  );
}

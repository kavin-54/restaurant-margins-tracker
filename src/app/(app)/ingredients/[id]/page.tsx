"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  useIngredient,
  useVendorRecords,
  updateIngredient,
  deleteIngredient,
  addVendorRecord,
} from "@/lib/hooks/useIngredients";
import { useRecipes, useRecipeLines } from "@/lib/hooks/useRecipes";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  { value: "protein", label: "Meat / Protein" },
  { value: "produce", label: "Produce" },
  { value: "vegetable", label: "Vegetable" },
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

const ALLERGEN_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  nuts: { color: "text-amber-700", bg: "bg-amber-100 border-amber-200", icon: "warning" },
  "tree nuts": { color: "text-amber-700", bg: "bg-amber-100 border-amber-200", icon: "warning" },
  peanuts: { color: "text-amber-700", bg: "bg-amber-100 border-amber-200", icon: "warning" },
  dairy: { color: "text-blue-700", bg: "bg-blue-100 border-blue-200", icon: "water_drop" },
  milk: { color: "text-blue-700", bg: "bg-blue-100 border-blue-200", icon: "water_drop" },
  gluten: { color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200", icon: "grain" },
  wheat: { color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200", icon: "grain" },
  shellfish: { color: "text-red-700", bg: "bg-red-100 border-red-200", icon: "set_meal" },
  soy: { color: "text-green-700", bg: "bg-green-100 border-green-200", icon: "spa" },
  eggs: { color: "text-orange-700", bg: "bg-orange-100 border-orange-200", icon: "egg" },
  fish: { color: "text-cyan-700", bg: "bg-cyan-100 border-cyan-200", icon: "set_meal" },
  sesame: { color: "text-stone-700", bg: "bg-stone-100 border-stone-200", icon: "grass" },
};

function getDefaultAllergenStyle() {
  return { color: "text-gray-700", bg: "bg-gray-100 border-gray-200", icon: "warning" };
}

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function getCategoryBadgeClasses(category: string): string {
  switch (category) {
    case "produce":
      return "bg-green-100 text-green-700";
    case "vegetable":
      return "bg-emerald-100 text-emerald-700";
    case "dairy":
      return "bg-blue-100 text-blue-700";
    case "dry-goods":
      return "bg-purple-100 text-purple-700";
    case "protein":
      return "bg-red-100 text-red-700";
    case "spice":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function formatDate(date: Date | { toDate?: () => Date } | string): string {
  if (!date) return "\u2014";
  const d =
    typeof date === "string"
      ? new Date(date)
      : date instanceof Date
        ? date
        : date.toDate
          ? date.toDate()
          : new Date();
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateObj(date: Date | { toDate?: () => Date } | string): Date {
  if (!date) return new Date();
  if (typeof date === "string") return new Date(date);
  if (date instanceof Date) return date;
  if (date.toDate) return date.toDate();
  return new Date();
}

// ---------- Price History Chart (pure CSS/divs) ----------
function PriceHistoryChart({
  vendorRecords,
  currentPrice,
}: {
  vendorRecords: Array<{ pricePerUnit: number; purchaseDate: Date | { toDate?: () => Date } | string }>;
  currentPrice: number;
}) {
  const points = useMemo(() => {
    if (!vendorRecords || vendorRecords.length === 0) return [];
    const sorted = [...vendorRecords]
      .map((vr) => ({ price: vr.pricePerUnit, date: toDateObj(vr.purchaseDate) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-10);
    return sorted;
  }, [vendorRecords]);

  if (points.length < 2) {
    return (
      <div className="text-center py-8 text-gray-400 font-medium text-sm">
        Need at least 2 purchase records to show price history.
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices) * 0.9;
  const maxPrice = Math.max(...prices) * 1.1;
  const range = maxPrice - minPrice || 1;
  const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;

  // Trend calculation
  const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
  const secondHalf = prices.slice(Math.floor(prices.length / 2));
  const firstAvg = firstHalf.reduce((s, p) => s + p, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, p) => s + p, 0) / secondHalf.length;
  const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const trendUp = trendPct > 0;

  const chartHeight = 160;
  const chartWidth = 100; // percentage

  // Build SVG-like positions for CSS chart
  const getY = (price: number) =>
    chartHeight - ((price - minPrice) / range) * chartHeight;
  const getX = (idx: number) =>
    (idx / (points.length - 1)) * 100;

  const avgY = getY(avgPrice);

  return (
    <div>
      {/* Trend indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            trendUp ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {trendUp ? "trending_up" : "trending_down"}
          </span>
          {trendUp ? "\u2191" : "\u2193"} {Math.abs(trendPct).toFixed(1)}% over{" "}
          {points.length} purchases
        </span>
        <span className="text-xs text-gray-400">
          Avg: {formatCurrency(avgPrice)}
        </span>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight + 40 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-14 flex flex-col justify-between text-[10px] text-gray-400 font-medium">
          <span>{formatCurrency(maxPrice)}</span>
          <span>{formatCurrency((maxPrice + minPrice) / 2)}</span>
          <span>{formatCurrency(minPrice)}</span>
        </div>

        {/* Chart area */}
        <div className="ml-16 relative" style={{ height: chartHeight }}>
          {/* Grid lines */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 right-0 border-t border-gray-100" />
            <div className="absolute top-1/2 left-0 right-0 border-t border-gray-100" />
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100" />
          </div>

          {/* Average price dashed line */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-blue-300"
            style={{ top: avgY }}
          >
            <span className="absolute right-0 -top-4 text-[10px] text-blue-400 font-medium bg-white px-1">
              avg
            </span>
          </div>

          {/* Connecting lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 100 ${chartHeight}`}
            preserveAspectRatio="none"
            style={{ overflow: "visible" }}
          >
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              points={points
                .map((p, i) => `${getX(i)},${getY(p.price)}`)
                .join(" ")}
            />
          </svg>

          {/* Data points */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            return (
              <div
                key={i}
                className="absolute group"
                style={{
                  left: `${getX(i)}%`,
                  top: getY(p.price),
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    isLast ? "bg-blue-600 ring-2 ring-blue-200" : "bg-blue-400"
                  }`}
                />
                {/* Hover tooltip */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap z-10 shadow-lg">
                  {formatCurrency(p.price)}
                  <br />
                  {formatDate(p.date)}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="ml-16 flex justify-between mt-2">
          {points.map((p, i) => (
            <span
              key={i}
              className="text-[9px] text-gray-400 font-medium"
              style={{
                width: i === 0 || i === points.length - 1 ? "auto" : 0,
                overflow: "visible",
                textAlign: "center",
                opacity: i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2) ? 1 : 0,
              }}
            >
              {p.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Usage Analytics Component ----------
function UsageAnalytics({
  ingredientId,
  ingredientUnit,
  vendorRecords,
}: {
  ingredientId: string;
  ingredientUnit: string;
  vendorRecords: Array<{
    vendorName: string;
    purchaseDate: Date | { toDate?: () => Date } | string;
    quantity: number;
  }>;
}) {
  const { data: recipes } = useRecipes();

  // Find recipes that use this ingredient by checking recipe names/data
  // Since we can't query subcollections globally, we track recipes that reference this ingredient
  const recipesUsingIngredient = useMemo(() => {
    // This is a best-effort match - in production you'd have a denormalized field
    return [];
  }, [recipes, ingredientId]);

  // Last ordered info from vendor records
  const lastOrder = useMemo(() => {
    if (!vendorRecords || vendorRecords.length === 0) return null;
    const sorted = [...vendorRecords].sort(
      (a, b) => toDateObj(b.purchaseDate).getTime() - toDateObj(a.purchaseDate).getTime()
    );
    return sorted[0];
  }, [vendorRecords]);

  // Average weekly usage (estimated from purchase frequency)
  const weeklyUsage = useMemo(() => {
    if (!vendorRecords || vendorRecords.length < 2) return null;
    const sorted = [...vendorRecords].sort(
      (a, b) => toDateObj(a.purchaseDate).getTime() - toDateObj(b.purchaseDate).getTime()
    );
    const firstDate = toDateObj(sorted[0].purchaseDate);
    const lastDate = toDateObj(sorted[sorted.length - 1].purchaseDate);
    const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const totalQty = sorted.reduce((sum, vr) => sum + vr.quantity, 0);
    return totalQty / weeks;
  }, [vendorRecords]);

  // Days until reorder
  const daysUntilReorder = useMemo(() => {
    if (!weeklyUsage || weeklyUsage === 0) return null;
    const dailyUsage = weeklyUsage / 7;
    // Simulated on-hand quantity
    const onHand = 0;
    if (onHand <= 0) return 0;
    return Math.floor(onHand / dailyUsage);
  }, [weeklyUsage]);

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
      <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-5">
        Usage Analytics
      </h3>
      <div className="space-y-4">
        {/* Recipes using this ingredient */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-purple-600 text-lg">menu_book</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Used in Recipes</p>
            {recipes && recipes.length > 0 ? (
              <p className="text-sm font-semibold text-gray-900">
                {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} in catalog
              </p>
            ) : (
              <p className="text-sm text-gray-400">No recipes found</p>
            )}
          </div>
        </div>

        {/* Average weekly usage */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-blue-600 text-lg">speed</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Avg Weekly Usage</p>
            <p className="text-sm font-semibold text-gray-900">
              {weeklyUsage !== null
                ? `${weeklyUsage.toFixed(1)} ${ingredientUnit}`
                : "Not enough data"}
            </p>
          </div>
        </div>

        {/* Last ordered */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-green-600 text-lg">local_shipping</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Last Ordered</p>
            {lastOrder ? (
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(lastOrder.purchaseDate)} from{" "}
                <span className="text-blue-700">{lastOrder.vendorName}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">No purchase history</p>
            )}
          </div>
        </div>

        {/* Days until reorder */}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            daysUntilReorder !== null && daysUntilReorder <= 3
              ? "bg-red-50"
              : daysUntilReorder !== null && daysUntilReorder <= 7
                ? "bg-yellow-50"
                : "bg-gray-50"
          }`}>
            <span className={`material-symbols-outlined text-lg ${
              daysUntilReorder !== null && daysUntilReorder <= 3
                ? "text-red-600"
                : daysUntilReorder !== null && daysUntilReorder <= 7
                  ? "text-yellow-600"
                  : "text-gray-600"
            }`}>
              event
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Days Until Reorder</p>
            {daysUntilReorder !== null ? (
              <p className={`text-sm font-semibold ${
                daysUntilReorder <= 3
                  ? "text-red-600"
                  : daysUntilReorder <= 7
                    ? "text-yellow-600"
                    : "text-gray-900"
              }`}>
                {daysUntilReorder === 0
                  ? "Reorder now"
                  : `${daysUntilReorder} day${daysUntilReorder !== 1 ? "s" : ""}`}
              </p>
            ) : (
              <p className="text-sm text-gray-400">Needs inventory data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const { data: ingredient, loading, error } = useIngredient(id);
  const { data: vendorRecords, loading: vendorLoading } = useVendorRecords(id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCostPerUnit, setEditCostPerUnit] = useState("");
  const [editSupplier, setEditSupplier] = useState("");

  // Vendor record form state
  const [vrVendorName, setVrVendorName] = useState("");
  const [vrPricePerUnit, setVrPricePerUnit] = useState("");
  const [vrQuantity, setVrQuantity] = useState("");
  const [vrUnit, setVrUnit] = useState("");
  const [vrTotalCost, setVrTotalCost] = useState("");
  const [vrPurchaseDate, setVrPurchaseDate] = useState("");
  const [vrSaving, setVrSaving] = useState(false);

  useEffect(() => {
    if (ingredient) {
      setEditName(ingredient.name);
      setEditCategory(ingredient.category);
      setEditUnit(ingredient.unit);
      setEditCostPerUnit(String(ingredient.costPerUnit));
      setEditSupplier(ingredient.supplier || "");
    }
  }, [ingredient]);

  // Parse allergens from ingredient data
  const allergens = useMemo(() => {
    if (!ingredient) return [];
    // Check for allergens field or parse from supplier/notes/category
    const raw = (ingredient as any).allergens;
    if (!raw || typeof raw !== "string") return [];
    return raw
      .split(",")
      .map((a: string) => a.trim().toLowerCase())
      .filter(Boolean);
  }, [ingredient]);

  // Vendor records sorted by price ascending for comparison
  const sortedVendors = useMemo(() => {
    if (!vendorRecords || vendorRecords.length === 0) return [];
    // Get unique vendors with their best (most recent) price
    const vendorMap = new Map<string, typeof vendorRecords[0]>();
    const sorted = [...vendorRecords].sort(
      (a, b) => toDateObj(b.purchaseDate).getTime() - toDateObj(a.purchaseDate).getTime()
    );
    for (const vr of sorted) {
      if (!vendorMap.has(vr.vendorName)) {
        vendorMap.set(vr.vendorName, vr);
      }
    }
    return Array.from(vendorMap.values()).sort(
      (a, b) => a.pricePerUnit - b.pricePerUnit
    );
  }, [vendorRecords]);

  const cheapestPrice = sortedVendors.length > 0 ? sortedVendors[0].pricePerUnit : 0;

  if (loading) return <LoadingScreen />;
  if (error || !ingredient) {
    return (
      <div className="p-6 text-red-600">
        Ingredient not found or failed to load.
      </div>
    );
  }

  function startEditing() {
    setEditName(ingredient!.name);
    setEditCategory(ingredient!.category);
    setEditUnit(ingredient!.unit);
    setEditCostPerUnit(String(ingredient!.costPerUnit));
    setEditSupplier(ingredient!.supplier || "");
    setEditing(true);
  }

  async function handleSave() {
    if (!editName.trim() || !editCategory || !editUnit.trim()) {
      toast({
        title: "Missing fields",
        description: "Name, category, and unit are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateIngredient(id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit.trim(),
        costPerUnit: parseFloat(editCostPerUnit) || 0,
        supplier: editSupplier.trim(),
      });
      toast({ title: "Saved", description: "Ingredient updated successfully." });
      setEditing(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update ingredient.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteIngredient(id);
      toast({ title: "Deleted", description: "Ingredient has been removed." });
      router.push("/ingredients");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete ingredient.",
        variant: "destructive",
      });
    }
  }

  async function handleAddVendorRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!vrVendorName.trim()) {
      toast({
        title: "Missing vendor name",
        description: "Please enter a vendor name.",
        variant: "destructive",
      });
      return;
    }

    setVrSaving(true);
    try {
      await addVendorRecord(id, {
        vendorName: vrVendorName.trim(),
        pricePerUnit: parseFloat(vrPricePerUnit) || 0,
        quantity: parseFloat(vrQuantity) || 0,
        unit: vrUnit.trim() || ingredient!.unit,
        totalCost: parseFloat(vrTotalCost) || 0,
        purchaseDate: vrPurchaseDate ? new Date(vrPurchaseDate) : new Date(),
      });
      toast({ title: "Vendor record added" });
      setVendorDialogOpen(false);
      setVrVendorName("");
      setVrPricePerUnit("");
      setVrQuantity("");
      setVrUnit("");
      setVrTotalCost("");
      setVrPurchaseDate("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to add vendor record.",
        variant: "destructive",
      });
    } finally {
      setVrSaving(false);
    }
  }

  async function handleSetPreferred(vendorName: string) {
    try {
      await updateIngredient(id, { supplier: vendorName });
      toast({ title: "Preferred vendor updated", description: `${vendorName} set as preferred vendor.` });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update preferred vendor.",
        variant: "destructive",
      });
    }
  }

  // Simulated inventory values (no inventory field on current data model)
  const quantityOnHand = 0;
  const reorderPoint = 0;
  const inventoryPercent = reorderPoint > 0 ? Math.min(100, (quantityOnHand / reorderPoint) * 100) : 0;

  const hasAllergens = allergens.length > 0;

  return (
    <div>
      <PageHeader title={ingredient.name} backHref="/ingredients" />

      {/* Allergen Warning Banner */}
      {hasAllergens && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600 text-xl">warning</span>
          <div>
            <p className="text-sm font-bold text-red-700">Allergen Warning</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {allergens.map((allergen: string) => {
                const config = ALLERGEN_CONFIG[allergen] || getDefaultAllergenStyle();
                return (
                  <span
                    key={allergen}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.color}`}
                  >
                    <span className="material-symbols-outlined text-xs">{config.icon}</span>
                    {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image + Inventory + Usage */}
        <div className="space-y-6">
          {/* Image Placeholder */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300 text-6xl">
                image
              </span>
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-4">
              Inventory Summary
            </h3>
            <div className="space-y-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${inventoryPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    On Hand
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {quantityOnHand} {ingredient.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    Reorder Point
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {reorderPoint} {ingredient.unit}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Analytics */}
          <UsageAnalytics
            ingredientId={id}
            ingredientUnit={ingredient.unit}
            vendorRecords={vendorRecords || []}
          />
        </div>

        {/* Right Column: Specs + Price History + Vendor Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Specifications Card */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-5">
              Specifications
            </h3>

            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger id="edit-category">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">Unit</Label>
                    <Input
                      id="edit-unit"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cost">Cost per Unit ($)</Label>
                    <Input
                      id="edit-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editCostPerUnit}
                      onChange={(e) => setEditCostPerUnit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Supplier</Label>
                  <Input
                    id="edit-supplier"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">check</span>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="h-10 px-5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all duration-150 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Category
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClasses(ingredient.category)}`}
                    >
                      {getCategoryLabel(ingredient.category)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Unit
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {ingredient.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Cost/Unit
                    </p>
                    <p className="text-sm font-semibold text-blue-700">
                      {formatCurrency(ingredient.costPerUnit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      SKU
                    </p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">
                      {id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Allergens
                    </p>
                    {hasAllergens ? (
                      <div className="flex flex-wrap gap-1">
                        {allergens.map((allergen: string) => {
                          const config = ALLERGEN_CONFIG[allergen] || getDefaultAllergenStyle();
                          return (
                            <span
                              key={allergen}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.color}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 10 }}>{config.icon}</span>
                              {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-400">
                        None
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Tags
                    </p>
                    {ingredient.supplier ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100/20 text-purple-700">
                        {ingredient.supplier}
                      </span>
                    ) : (
                      <p className="text-sm font-semibold text-gray-400">
                        None
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit / Delete Buttons */}
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                  <button
                    onClick={startEditing}
                    className="h-10 px-5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all duration-150 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Edit
                  </button>
                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <button className="h-10 px-5 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all duration-150 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Delete
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Ingredient</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-gray-900">
                          {ingredient.name}
                        </span>
                        ? This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-3 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteOpen(false)}
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
              </>
            )}
          </div>

          {/* Price History Chart */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-5">
              Price History
            </h3>
            {vendorLoading ? (
              <div className="text-center py-8 text-gray-400 font-medium text-sm">
                Loading price history...
              </div>
            ) : (
              <PriceHistoryChart
                vendorRecords={vendorRecords || []}
                currentPrice={ingredient.costPerUnit}
              />
            )}
          </div>

          {/* Vendor Comparison Table */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                Vendor Comparison
              </h3>
              <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                <DialogTrigger asChild>
                  <button className="h-9 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">add</span>
                    Add Record
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Vendor Record</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddVendorRecord} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="vr-vendor">Vendor Name</Label>
                      <Input
                        id="vr-vendor"
                        placeholder="e.g. Sysco"
                        value={vrVendorName}
                        onChange={(e) => setVrVendorName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vr-price">Price per Unit ($)</Label>
                        <Input
                          id="vr-price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={vrPricePerUnit}
                          onChange={(e) => setVrPricePerUnit(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vr-qty">Quantity</Label>
                        <Input
                          id="vr-qty"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={vrQuantity}
                          onChange={(e) => setVrQuantity(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vr-unit">Unit</Label>
                        <Input
                          id="vr-unit"
                          placeholder={ingredient.unit}
                          value={vrUnit}
                          onChange={(e) => setVrUnit(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vr-total">Total Cost ($)</Label>
                        <Input
                          id="vr-total"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={vrTotalCost}
                          onChange={(e) => setVrTotalCost(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vr-date">Purchase Date</Label>
                      <Input
                        id="vr-date"
                        type="date"
                        value={vrPurchaseDate}
                        onChange={(e) => setVrPurchaseDate(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVendorDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={vrSaving}>
                        {vrSaving ? "Saving..." : "Add Record"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {vendorLoading ? (
              <div className="text-center py-8 text-gray-400 font-medium">
                Loading vendor records...
              </div>
            ) : sortedVendors.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Vendor
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Price/Unit
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Difference
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Last Purchase
                    </th>
                    <th className="text-right px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedVendors.map((vr, idx) => {
                    const isCheapest = idx === 0;
                    const priceDiff = vr.pricePerUnit - cheapestPrice;
                    const priceDiffPct = cheapestPrice > 0 ? (priceDiff / cheapestPrice) * 100 : 0;
                    const isPreferred = ingredient.supplier === vr.vendorName;

                    return (
                      <tr key={vr.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {vr.vendorName}
                            </span>
                            {isCheapest && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                <span className="material-symbols-outlined" style={{ fontSize: 10 }}>verified</span>
                                Best Price
                              </span>
                            )}
                            {isPreferred && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                <span className="material-symbols-outlined" style={{ fontSize: 10 }}>star</span>
                                Preferred
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-700 font-bold">
                          {formatCurrency(vr.pricePerUnit)}
                        </td>
                        <td className="px-6 py-4">
                          {isCheapest ? (
                            <span className="text-xs font-semibold text-green-600">&mdash;</span>
                          ) : (
                            <span className="text-xs font-semibold text-red-600">
                              +{formatCurrency(priceDiff)} ({priceDiffPct.toFixed(0)}% more)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(vr.purchaseDate)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isPreferred && (
                            <button
                              onClick={() => handleSetPreferred(vr.vendorName)}
                              className="h-8 px-3 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-150 inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">star</span>
                              Set Preferred
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-400 font-medium px-6 pb-6">
                No vendor records yet. Add one to track purchase history.
              </div>
            )}

            {/* Full purchase history below vendor comparison */}
            {vendorRecords && vendorRecords.length > 0 && (
              <div className="border-t border-gray-100">
                <div className="px-6 py-4">
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-3">
                    All Purchase Records
                  </h4>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left px-6 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Vendor
                      </th>
                      <th className="text-left px-6 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Price
                      </th>
                      <th className="text-left px-6 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Quantity
                      </th>
                      <th className="text-left px-6 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Date
                      </th>
                      <th className="text-left px-6 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendorRecords.map((vr) => (
                      <tr key={vr.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                          {vr.vendorName}
                        </td>
                        <td className="px-6 py-3 text-sm text-blue-700 font-bold">
                          {formatCurrency(vr.pricePerUnit)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {vr.quantity} {vr.unit}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {formatDate(vr.purchaseDate)}
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Delivered
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

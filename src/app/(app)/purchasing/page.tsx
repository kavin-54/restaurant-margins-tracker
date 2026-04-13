"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollection } from "@/lib/hooks/useFirestore";
import { addDocument, getDocuments } from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrder, POLine, POStatus } from "@/lib/types/purchaseOrder";

// Hook types from local hooks
import { useIngredients } from "@/lib/hooks/useIngredients";
import { useInventory } from "@/lib/hooks/useInventory";
import { useEvents } from "@/lib/hooks/useEvents";
import { useRecipes } from "@/lib/hooks/useRecipes";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially-received", label: "Partially Received" },
  { value: "fully-received", label: "Fully Received" },
];

const statusBadgeStyles: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  "partially-received": "bg-amber-100 text-amber-700",
  "fully-received": "bg-green-100 text-green-700",
};

const statusLabels: Record<POStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  "partially-received": "Partially Received",
  "fully-received": "Fully Received",
};

const WEEKLY_BUDGET = 5000; // default target

function formatDate(date: Date | any): string {
  if (!date) return "\u2014";
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDate(val: any): Date {
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

function getStartOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDayName(dayIndex: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIndex];
}

const ITEMS_PER_PAGE = 10;

// ─── Smart Order Types ───────────────────────────────────────────────────────

interface AggregatedIngredient {
  ingredientId: string;
  ingredientName: string;
  totalQuantityNeeded: number;
  unit: string;
  currentInventory: number;
  quantityToOrder: number;
  vendorName: string;
  costPerUnit: number;
  estimatedCost: number;
}

interface VendorAggregation {
  vendorName: string;
  items: AggregatedIngredient[];
  totalEstimatedCost: number;
}

import { limit, where } from "firebase/firestore";
import Loading from "../loading";

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PurchasingPage() {
  const router = useRouter();
  const poConstraints = useMemo(() => [orderBy("createdAt", "desc"), limit(100)], []);
  const { data: orders, loading } = useCollection<PurchaseOrder>(
    "purchaseOrders",
    poConstraints
  );
  const { data: ingredients } = useIngredients();
  const { data: inventoryItems } = useInventory();
  const { data: events } = useEvents();
  const { data: recipes } = useRecipes();

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSmartOrderModal, setShowSmartOrderModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newWeekStart, setNewWeekStart] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingPOs, setGeneratingPOs] = useState(false);
  const [smartOrderData, setSmartOrderData] = useState<VendorAggregation[]>([]);
  const [smartOrderLoading, setSmartOrderLoading] = useState(false);

  // ─── Filtered & Paginated Orders ─────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((po) => {
      const matchesStatus =
        statusFilter === "all" || po.status === statusFilter;
      const matchesSearch = po.vendorName
        ?.toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ─── Weekly Spend by Day ─────────────────────────────────────────────────

  const { dailySpend, weeklySpend, lastWeekSpend } = useMemo(() => {
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const daily = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    let thisWeek = 0;
    let lastWeek = 0;

    if (orders) {
      for (const po of orders) {
        const d = toDate(po.createdAt);
        const amount = po.actualTotal || po.estimatedTotal || 0;

        if (d >= startOfWeek) {
          daily[d.getDay()] += amount;
          thisWeek += amount;
        } else if (d >= startOfLastWeek && d < startOfWeek) {
          lastWeek += amount;
        }
      }
    }

    return { dailySpend: daily, weeklySpend: thisWeek, lastWeekSpend: lastWeek };
  }, [orders]);

  const weekOverWeekChange = useMemo(() => {
    if (lastWeekSpend === 0) return null;
    const pct = ((weeklySpend - lastWeekSpend) / lastWeekSpend) * 100;
    return pct;
  }, [weeklySpend, lastWeekSpend]);

  const maxDailySpend = Math.max(...dailySpend, 1);

  // ─── Reorder Suggestions ────────────────────────────────────────────────

  const reorderSuggestions = useMemo(() => {
    if (!inventoryItems || !ingredients) return [];
    return inventoryItems
      .filter((inv) => inv.currentQuantity < inv.reorderPoint)
      .map((inv) => {
        const ingredient = ingredients.find((i) => i.id === inv.ingredientId);
        return {
          id: inv.id,
          ingredientId: inv.ingredientId,
          ingredientName: inv.ingredientName,
          currentStock: inv.currentQuantity,
          reorderPoint: inv.reorderPoint,
          unit: inv.unit,
          preferredVendor: ingredient?.supplier || "Unknown",
          lastPrice: inv.costPerUnit || ingredient?.costPerUnit || 0,
        };
      });
  }, [inventoryItems, ingredients]);

  // ─── Smart Order: Aggregate ingredients from upcoming events ─────────────

  const handleSmartOrder = useCallback(async () => {
    setShowSmartOrderModal(true);
    setSmartOrderLoading(true);

    try {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Filter upcoming events
      const upcomingEvents = (events || []).filter((ev) => {
        const eventDate = toDate(ev.eventDate || (ev as any).date);
        return eventDate >= now && eventDate <= nextWeek;
      });

      if (upcomingEvents.length === 0) {
        setSmartOrderData([]);
        setSmartOrderLoading(false);
        return;
      }

      // For each event, get menu items and their recipe lines
      const ingredientMap: Record<string, AggregatedIngredient> = {};

      for (const event of upcomingEvents) {
        try {
          const menuItems = await getDocuments<any>(
            `events/${event.id}/menuItems`,
            orderBy("recipeName")
          );

          for (const menuItem of menuItems) {
            const recipeId = menuItem.recipeId;
            if (!recipeId) continue;

            const servingsNeeded = menuItem.servings || menuItem.quantity || event.guestCount || 1;
            const recipe = recipes?.find((r) => r.id === recipeId);
            const recipeServings = recipe?.servings || 1;
            const scaleFactor = servingsNeeded / recipeServings;

            try {
              const recipeLines = await getDocuments<any>(
                `recipes/${recipeId}/lines`,
                orderBy("sortOrder")
              );

              for (const line of recipeLines) {
                const ingId = line.ingredientId || line.referenceName || line.ingredientName;
                const key = ingId || line.ingredientName;
                if (!key) continue;

                const quantityNeeded = (line.quantity || 0) * scaleFactor;

                if (ingredientMap[key]) {
                  ingredientMap[key].totalQuantityNeeded += quantityNeeded;
                } else {
                  const ingredient = ingredients?.find(
                    (i) => i.id === line.ingredientId || i.name === line.ingredientName
                  );
                  const invItem = inventoryItems?.find(
                    (inv) => inv.ingredientId === line.ingredientId || inv.ingredientName === line.ingredientName
                  );

                  ingredientMap[key] = {
                    ingredientId: line.ingredientId || "",
                    ingredientName: line.ingredientName || line.referenceName || "Unknown",
                    totalQuantityNeeded: quantityNeeded,
                    unit: line.unit || ingredient?.unit || "ea",
                    currentInventory: invItem?.currentQuantity || 0,
                    quantityToOrder: 0,
                    vendorName: ingredient?.supplier || "Unassigned",
                    costPerUnit: line.costPerUnit || ingredient?.costPerUnit || 0,
                    estimatedCost: 0,
                  };
                }
              }
            } catch {
              // Recipe lines not found, skip
            }
          }
        } catch {
          // Menu items not found, skip
        }
      }

      // Calculate order quantities (needed - on hand)
      for (const key of Object.keys(ingredientMap)) {
        const item = ingredientMap[key];
        item.quantityToOrder = Math.max(0, item.totalQuantityNeeded - item.currentInventory);
        item.estimatedCost = item.quantityToOrder * item.costPerUnit;
      }

      // Group by vendor
      const vendorMap: Record<string, VendorAggregation> = {};
      for (const item of Object.values(ingredientMap)) {
        if (item.quantityToOrder <= 0) continue;
        const vendor = item.vendorName || "Unassigned";
        if (!vendorMap[vendor]) {
          vendorMap[vendor] = { vendorName: vendor, items: [], totalEstimatedCost: 0 };
        }
        vendorMap[vendor].items.push(item);
        vendorMap[vendor].totalEstimatedCost += item.estimatedCost;
      }

      setSmartOrderData(Object.values(vendorMap));
    } catch (err) {
      console.error("Smart order aggregation failed:", err);
      setSmartOrderData([]);
    } finally {
      setSmartOrderLoading(false);
    }
  }, [events, recipes, ingredients, inventoryItems]);

  // ─── Generate POs from Smart Order ───────────────────────────────────────

  async function handleGeneratePOs() {
    if (smartOrderData.length === 0) return;
    setGeneratingPOs(true);

    try {
      const weekStart = getStartOfWeek(new Date());

      for (const vendorGroup of smartOrderData) {
        const newPO = await addDocument<PurchaseOrder>("purchaseOrders", {
          weekStartDate: weekStart,
          vendorId: "",
          vendorName: vendorGroup.vendorName,
          status: "draft",
          eventIds: [],
          estimatedTotal: vendorGroup.totalEstimatedCost,
          actualTotal: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        for (const item of vendorGroup.items) {
          await addDocument<POLine>(`purchaseOrders/${newPO.id}/lines`, {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            quantityNeeded: item.totalQuantityNeeded,
            quantityNeededUnit: item.unit,
            packSize: "",
            packsToOrder: Math.ceil(item.quantityToOrder),
            quantityOrdered: Math.ceil(item.quantityToOrder),
            overageQuantity: 0,
            overageCost: 0,
            expectedCostPerPack: item.costPerUnit,
            expectedTotalCost: item.estimatedCost,
          });
        }
      }

      setShowSmartOrderModal(false);
      setSmartOrderData([]);
    } catch (err) {
      console.error("Failed to generate POs:", err);
    } finally {
      setGeneratingPOs(false);
    }
  }

  // ─── Create PO ──────────────────────────────────────────────────────────

  async function handleCreatePO() {
    if (!newVendorName.trim() || !newWeekStart) return;
    setCreating(true);
    try {
      const newPO = await addDocument<PurchaseOrder>("purchaseOrders", {
        weekStartDate: new Date(newWeekStart),
        vendorId: "",
        vendorName: newVendorName.trim(),
        status: "draft",
        eventIds: [],
        estimatedTotal: 0,
        actualTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setShowCreateDialog(false);
      setNewVendorName("");
      setNewWeekStart("");
      router.push(`/purchasing/${newPO.id}`);
    } catch (err) {
      console.error("Failed to create PO:", err);
    } finally {
      setCreating(false);
    }
  }

  // ─── Repeat Last Order ──────────────────────────────────────────────────

  async function handleRepeatOrder(po: PurchaseOrder) {
    try {
      const existingLines = await getDocuments<POLine>(
        `purchaseOrders/${po.id}/lines`,
        orderBy("ingredientName")
      );

      const newPO = await addDocument<PurchaseOrder>("purchaseOrders", {
        weekStartDate: new Date(),
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        status: "draft",
        eventIds: [],
        estimatedTotal: po.estimatedTotal,
        actualTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const line of existingLines) {
        await addDocument<POLine>(`purchaseOrders/${newPO.id}/lines`, {
          ingredientId: line.ingredientId,
          ingredientName: line.ingredientName,
          quantityNeeded: line.quantityNeeded,
          quantityNeededUnit: line.quantityNeededUnit,
          packSize: line.packSize,
          packsToOrder: line.packsToOrder,
          quantityOrdered: line.quantityOrdered,
          overageQuantity: 0,
          overageCost: 0,
          expectedCostPerPack: line.expectedCostPerPack,
          expectedTotalCost: line.expectedTotalCost,
        });
      }

      router.push(`/purchasing/${newPO.id}`);
    } catch (err) {
      console.error("Failed to repeat order:", err);
    }
  }

  // ─── Create PO from Reorder Suggestions ─────────────────────────────────

  async function handleCreatePOFromReorders() {
    if (reorderSuggestions.length === 0) return;

    // Group by vendor
    const vendorGroups: Record<string, typeof reorderSuggestions> = {};
    for (const item of reorderSuggestions) {
      const vendor = item.preferredVendor || "Unassigned";
      if (!vendorGroups[vendor]) vendorGroups[vendor] = [];
      vendorGroups[vendor].push(item);
    }

    try {
      for (const [vendorName, items] of Object.entries(vendorGroups)) {
        const estimatedTotal = items.reduce(
          (sum, item) => sum + (item.reorderPoint - item.currentStock) * item.lastPrice,
          0
        );

        const newPO = await addDocument<PurchaseOrder>("purchaseOrders", {
          weekStartDate: new Date(),
          vendorId: "",
          vendorName,
          status: "draft",
          eventIds: [],
          estimatedTotal,
          actualTotal: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        for (const item of items) {
          const qty = Math.max(0, item.reorderPoint - item.currentStock);
          await addDocument<POLine>(`purchaseOrders/${newPO.id}/lines`, {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            quantityNeeded: qty,
            quantityNeededUnit: item.unit,
            packSize: "",
            packsToOrder: Math.ceil(qty),
            quantityOrdered: Math.ceil(qty),
            overageQuantity: 0,
            overageCost: 0,
            expectedCostPerPack: item.lastPrice,
            expectedTotalCost: qty * item.lastPrice,
          });
        }
      }
    } catch (err) {
      console.error("Failed to create PO from reorder suggestions:", err);
    }
  }

  // ─── Add single reorder item to new PO ──────────────────────────────────

  async function handleAddReorderToPO(item: typeof reorderSuggestions[0]) {
    try {
      const qty = Math.max(0, item.reorderPoint - item.currentStock);
      const estimatedTotal = qty * item.lastPrice;

      const newPO = await addDocument<PurchaseOrder>("purchaseOrders", {
        weekStartDate: new Date(),
        vendorId: "",
        vendorName: item.preferredVendor,
        status: "draft",
        eventIds: [],
        estimatedTotal,
        actualTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await addDocument<POLine>(`purchaseOrders/${newPO.id}/lines`, {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        quantityNeeded: qty,
        quantityNeededUnit: item.unit,
        packSize: "",
        packsToOrder: Math.ceil(qty),
        quantityOrdered: Math.ceil(qty),
        overageQuantity: 0,
        overageCost: 0,
        expectedCostPerPack: item.lastPrice,
        expectedTotalCost: estimatedTotal,
      });

      router.push(`/purchasing/${newPO.id}`);
    } catch (err) {
      console.error("Failed to create PO for reorder item:", err);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) return <Loading />;

  return (
    <div>
      {/* Header with two action buttons */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Purchase Orders</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Track and manage vendor orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSmartOrder}
              className="h-11 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 px-5"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Smart Order
            </button>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="h-11 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 px-5"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create PO
            </button>
          </div>
        </div>
      </div>

      {orders && orders.length > 0 ? (
        <>
          {/* Filter Pills */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setCurrentPage(1); }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-150 ${
                  statusFilter === s.value
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ─── Weekly Spend Tracking (Enhanced) ─────────────────────────── */}
          <div className="mb-6">
            <div
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                    Weekly Spend
                  </p>
                  <p className="text-3xl font-extrabold text-blue-700 mt-1">
                    {formatCurrency(weeklySpend)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    of {formatCurrency(WEEKLY_BUDGET)} budget
                  </p>
                </div>
                <div className="text-right">
                  {weekOverWeekChange !== null && (
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
                        weekOverWeekChange > 0
                          ? "bg-red-50 text-red-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {weekOverWeekChange > 0 ? "trending_up" : "trending_down"}
                      </span>
                      {weekOverWeekChange > 0 ? "+" : ""}
                      {weekOverWeekChange.toFixed(1)}% vs last week
                    </div>
                  )}
                </div>
              </div>

              {/* Bar Chart */}
              <div className="flex items-end gap-2 h-24">
                {dailySpend.map((amount, i) => {
                  const height = maxDailySpend > 0 ? (amount / maxDailySpend) * 100 : 0;
                  const isToday = i === new Date().getDay();
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative flex items-end justify-center h-20">
                        {amount > 0 && (
                          <span className="absolute -top-5 text-[9px] font-bold text-gray-400">
                            {formatCurrency(amount)}
                          </span>
                        )}
                        <div
                          className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 ${
                            isToday
                              ? "bg-gradient-to-t from-blue-700 to-blue-500"
                              : "bg-gray-200"
                          }`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          isToday ? "text-blue-700" : "text-gray-400"
                        }`}
                      >
                        {getDayName(i)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Budget Progress Bar */}
              <div className="mt-4">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weeklySpend > WEEKLY_BUDGET
                        ? "bg-red-500"
                        : weeklySpend > WEEKLY_BUDGET * 0.8
                        ? "bg-amber-500"
                        : "bg-blue-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        (weeklySpend / WEEKLY_BUDGET) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400 font-medium">₹0</span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {formatCurrency(WEEKLY_BUDGET)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                placeholder="Search by vendor..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-medium">
              No purchase orders match your filters.
            </div>
          ) : (
            <>
              {/* Data Table */}
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
              >
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">PO #</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Vendor</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">Week / Date</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Status</th>
                      <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">Est. Total</th>
                      <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">Actual Total</th>
                      <th className="text-center px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden lg:table-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((po) => (
                      <tr
                        key={po.id}
                        className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 group transition-colors duration-100"
                        onClick={() => router.push(`/purchasing/${po.id}`)}
                      >
                        <td className="px-5 py-3.5 text-sm text-blue-700 font-bold font-mono">
                          {po.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                          {po.vendorName}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">
                          {formatDate(po.weekStartDate)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeStyles[po.status]}`}>
                            {statusLabels[po.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700 text-right hidden md:table-cell">
                          {formatCurrency(po.estimatedTotal)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700 text-right hidden md:table-cell">
                          {po.actualTotal ? formatCurrency(po.actualTotal) : "\u2014"}
                        </td>
                        <td className="px-5 py-3.5 text-center hidden lg:table-cell">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRepeatOrder(po);
                            }}
                            title="Repeat this order"
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                            Repeat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    &ndash;
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                            page === currentPage
                              ? "bg-blue-700 text-white"
                              : "text-gray-500 hover:bg-gray-100"
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Reorder Suggestions ────────────────────────────────────── */}
          {reorderSuggestions.length > 0 && (
            <div
              className="mt-6 bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg">
                    warning
                  </span>
                  <h2 className="text-sm font-bold text-gray-900">
                    Reorder Suggestions
                  </h2>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {reorderSuggestions.length}
                  </span>
                </div>
                <button
                  onClick={handleCreatePOFromReorders}
                  className="h-9 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                  Create PO for All
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Ingredient
                    </th>
                    <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">
                      Current Stock
                    </th>
                    <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">
                      Reorder Point
                    </th>
                    <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">
                      Vendor
                    </th>
                    <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">
                      Last Price
                    </th>
                    <th className="text-center px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reorderSuggestions.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                        {item.ingredientName}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right hidden sm:table-cell">
                        <span className="text-red-600 font-bold">
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-right hidden sm:table-cell">
                        {item.reorderPoint} {item.unit}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                        {item.preferredVendor}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 text-right hidden md:table-cell">
                        {formatCurrency(item.lastPrice)}/{item.unit}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleAddReorderToPO(item)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          Add to PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="shopping_cart"
          title="No purchase orders yet"
          description="Create your first purchase order to start tracking vendor orders and receiving."
          action={{
            label: "Create PO",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}

      {/* ─── Create PO Dialog ──────────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label
                htmlFor="vendorName"
                className="text-xs font-bold text-gray-600 uppercase tracking-wider"
              >
                Vendor Name
              </Label>
              <input
                id="vendorName"
                placeholder="e.g. Sysco, US Foods"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="weekStart"
                className="text-xs font-bold text-gray-600 uppercase tracking-wider"
              >
                Week Starting
              </Label>
              <input
                id="weekStart"
                type="date"
                value={newWeekStart}
                onChange={(e) => setNewWeekStart(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={!newVendorName.trim() || !newWeekStart || creating}
                className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create PO"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Smart Order Modal ─────────────────────────────────────────── */}
      <Dialog open={showSmartOrderModal} onOpenChange={setShowSmartOrderModal}>
        <DialogContent className="rounded-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">auto_awesome</span>
              Smart Order — Next 7 Days
            </DialogTitle>
          </DialogHeader>

          {smartOrderLoading ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <span className="text-sm font-medium">Scanning upcoming events and recipes...</span>
              </div>
            </div>
          ) : smartOrderData.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-gray-400 text-2xl">
                  check_circle
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">All stocked up</p>
              <p className="text-xs text-gray-500 mt-1">
                No ingredients needed for upcoming events, or no events found in the next 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {smartOrderData.map((vendor) => (
                <div
                  key={vendor.vendorName}
                  className="rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-500 text-lg">
                        local_shipping
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {vendor.vendorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({vendor.items.length} items)
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-blue-700">
                      {formatCurrency(vendor.totalEstimatedCost)}
                    </span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          Ingredient
                        </th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          Needed
                        </th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden sm:table-cell">
                          On Hand
                        </th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          To Order
                        </th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden sm:table-cell">
                          Est. Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendor.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                            {item.ingredientName}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600 text-right">
                            {item.totalQuantityNeeded.toFixed(1)} {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 text-right hidden sm:table-cell">
                            {item.currentInventory.toFixed(1)} {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-bold text-blue-700 text-right">
                            {item.quantityToOrder.toFixed(1)} {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right hidden sm:table-cell">
                            {formatCurrency(item.estimatedCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Grand Total & Generate Button */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                    Total Estimated
                  </p>
                  <p className="text-xl font-extrabold text-gray-900">
                    {formatCurrency(
                      smartOrderData.reduce(
                        (sum, v) => sum + v.totalEstimatedCost,
                        0
                      )
                    )}
                  </p>
                </div>
                <button
                  onClick={handleGeneratePOs}
                  disabled={generatingPOs}
                  className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">
                    {generatingPOs ? "progress_activity" : "receipt_long"}
                  </span>
                  {generatingPOs
                    ? "Generating..."
                    : `Generate ${smartOrderData.length} PO${
                        smartOrderData.length !== 1 ? "s" : ""
                      }`}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useEvents, type EventStatus } from "@/lib/hooks/useEvents";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { useInventory } from "@/lib/hooks/useInventory";
import { useWasteLog } from "@/lib/hooks/useWaste";
import { useCollection } from "@/lib/hooks/useFirestore";
import { orderBy, limit, where } from "firebase/firestore";
import type { PurchaseOrder } from "@/lib/types/purchaseOrder";
import { formatCurrency } from "@/lib/utils";
import Loading from "./loading";

// --- Helpers ---

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const AMBIENT_SHADOW = "0px 10px 40px rgba(45,51,53,0.06)";
const TARGET_FOOD_COST = 35;
const TARGET_MARGIN = 35;

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  proposal: { label: "Proposed", className: "bg-amber-50 text-amber-700" },
  inquiry: { label: "In Planning", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

// --- Sub-components ---

function FoodCostCard({
  foodCostPct,
  target,
}: {
  foodCostPct: number;
  target: number;
}) {
  const status =
    foodCostPct <= target - 5
      ? "green"
      : foodCostPct <= target
        ? "amber"
        : "red";
  const colors = {
    green: {
      bg: "bg-green-100",
      text: "text-green-700",
      ring: "text-green-500",
      label: "On Track",
    },
    amber: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      ring: "text-amber-500",
      label: "Watch",
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-700",
      ring: "text-red-500",
      label: "Over Target",
    },
  }[status];

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Food Cost %
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {foodCostPct.toFixed(1)}%
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}
            >
              {colors.label}
            </span>
            <span className="text-xs text-gray-400">
              vs {target}% target
            </span>
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}>
          <span className={`material-symbols-outlined text-xl ${colors.text}`}>
            monitoring
          </span>
        </div>
      </div>
    </div>
  );
}

function RevenueCard({
  todayRevenue,
  weekRevenue,
  trendUp,
}: {
  todayRevenue: number;
  weekRevenue: number;
  trendUp: boolean;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Revenue
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {formatCurrency(todayRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className={`material-symbols-outlined text-sm ${trendUp ? "text-green-600" : "text-red-500"}`}
            >
              {trendUp ? "trending_up" : "trending_down"}
            </span>
            <span className="text-xs font-semibold text-gray-500">
              {formatCurrency(weekRevenue)} WTD
            </span>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
          <span className="material-symbols-outlined text-xl text-green-600">
            payments
          </span>
        </div>
      </div>
    </div>
  );
}

function MarginCard({
  margin,
  target,
}: {
  margin: number;
  target: number;
}) {
  const diff = margin - target;
  const isAbove = diff >= 0;

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Avg Margin
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {margin.toFixed(1)}%
          </p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className={`material-symbols-outlined text-sm ${isAbove ? "text-green-600" : "text-red-500"}`}
            >
              {isAbove ? "arrow_upward" : "arrow_downward"}
            </span>
            <span
              className={`text-xs font-semibold ${isAbove ? "text-green-600" : "text-red-500"}`}
            >
              {Math.abs(diff).toFixed(1)}% {isAbove ? "above" : "below"} target
            </span>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
          <span className="material-symbols-outlined text-xl text-purple-600">
            trending_up
          </span>
        </div>
      </div>
    </div>
  );
}

function PendingOrdersCard({
  count,
  totalValue,
}: {
  count: number;
  totalValue: number;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Open POs
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {count}
          </p>
          <p className="mt-2 text-xs font-semibold text-gray-500">
            {formatCurrency(totalValue)} total value
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
          <span className="material-symbols-outlined text-xl text-amber-600">
            local_shipping
          </span>
        </div>
      </div>
    </div>
  );
}

interface Alert {
  id: string;
  type: "margin" | "price" | "inventory";
  message: string;
  href: string;
  icon: string;
  colorClass: string;
}

function AlertsSection({
  alerts,
  onDismiss,
}: {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-xl text-red-500">
          notifications_active
        </span>
        <h2 className="text-lg font-bold text-gray-900">Margin Alerts</h2>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${alert.colorClass}`}
          >
            <span className="material-symbols-outlined text-lg">
              {alert.icon}
            </span>
            <Link
              href={alert.href}
              className="flex-1 text-sm font-medium hover:underline"
            >
              {alert.message}
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDismiss(alert.id);
              }}
              className="rounded-lg p-1 transition-colors hover:bg-black/5"
            >
              <span className="material-symbols-outlined text-base opacity-60">
                close
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipeProfitabilitySection({
  recipes,
}: {
  recipes: { id: string; name: string; costPerServing: number; estimatedPrice: number; marginPct: number }[];
}) {
  if (recipes.length === 0) return null;

  const topPerformers = [...recipes]
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 5);
  const underperformers = [...recipes]
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 5)
    .filter((r) => r.marginPct < 40);

  function marginColor(pct: number) {
    if (pct >= 40) return { bar: "bg-green-500", badge: "bg-green-100 text-green-700" };
    if (pct >= 25) return { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700" };
    return { bar: "bg-red-500", badge: "bg-red-100 text-red-700" };
  }

  function RecipeRow({ recipe }: { recipe: typeof topPerformers[0] }) {
    const colors = marginColor(recipe.marginPct);
    return (
      <Link
        href={`/recipes/${recipe.id}`}
        className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">
            {recipe.name}
          </p>
          <p className="text-xs text-gray-400">
            Cost: {formatCurrency(recipe.costPerServing)} / Sell: {formatCurrency(recipe.estimatedPrice)}
          </p>
        </div>
        <div className="flex w-24 items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${colors.bar}`}
              style={{ width: `${Math.min(recipe.marginPct, 100)}%` }}
            />
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${colors.badge}`}
        >
          {recipe.marginPct.toFixed(0)}%
        </span>
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Top Performers */}
      <div
        className="rounded-2xl bg-white"
        style={{ boxShadow: AMBIENT_SHADOW }}
      >
        <div className="flex items-center gap-2 px-6 pt-6 pb-2">
          <span className="material-symbols-outlined text-lg text-green-600">
            emoji_events
          </span>
          <h2 className="text-lg font-bold text-gray-900">Top Performers</h2>
        </div>
        <div className="px-2 pb-4">
          {topPerformers.map((r) => (
            <RecipeRow key={r.id} recipe={r} />
          ))}
        </div>
      </div>

      {/* Underperformers */}
      <div
        className="rounded-2xl bg-white"
        style={{ boxShadow: AMBIENT_SHADOW }}
      >
        <div className="flex items-center gap-2 px-6 pt-6 pb-2">
          <span className="material-symbols-outlined text-lg text-red-500">
            trending_down
          </span>
          <h2 className="text-lg font-bold text-gray-900">Underperformers</h2>
        </div>
        <div className="px-2 pb-4">
          {underperformers.length > 0 ? (
            underperformers.map((r) => (
              <RecipeRow key={r.id} recipe={r} />
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              All recipes above 40% margin
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductionSummary({
  totalMeals,
  eventCount,
  totalGuests,
  topIngredients,
}: {
  totalMeals: number;
  eventCount: number;
  totalGuests: number;
  topIngredients: { name: string; quantity: number; unit: string }[];
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-xl text-blue-600">
          restaurant
        </span>
        <h2 className="text-lg font-bold text-gray-900">
          Today&apos;s Production
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-blue-50 p-4 text-center">
          <p className="text-2xl font-extrabold text-blue-900">{totalMeals}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Meals
          </p>
        </div>
        <div className="rounded-xl bg-purple-50 p-4 text-center">
          <p className="text-2xl font-extrabold text-purple-900">
            {eventCount}
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
            Events
          </p>
        </div>
        <div className="rounded-xl bg-green-50 p-4 text-center">
          <p className="text-2xl font-extrabold text-green-900">
            {totalGuests}
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-green-600">
            Guests
          </p>
        </div>
      </div>
      {topIngredients.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            Key Ingredients Needed
          </p>
          <div className="space-y-1.5">
            {topIngredients.map((ing, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-700">
                  {ing.name}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {ing.quantity.toFixed(1)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  href: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl bg-white p-5 transition-all duration-150 hover:scale-[1.02] hover:shadow-md"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        <span className={`material-symbols-outlined text-lg ${iconColor}`}>
          {icon}
        </span>
      </div>
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
    </Link>
  );
}

// --- Main Dashboard ---

export default function DashboardPage() {
  // Memoize constraints to prevent re-subscriptions
  const recentEventsConstraints = useMemo(() => [limit(50)], []);
  const topRecipesConstraints = useMemo(() => [limit(20)], []);
  const inventoryAlertsConstraints = useMemo(() => [limit(100)], []);
  const recentWasteConstraints = useMemo(() => [limit(50)], []);
  const poConstraints = useMemo(() => [orderBy("createdAt", "desc"), limit(20)], []);

  const { data: events, loading: eventsLoading } = useEvents(undefined, recentEventsConstraints);
  const { data: recipes, loading: recipesLoading } = useRecipes(topRecipesConstraints);
  const { data: ingredients, loading: ingredientsLoading } = useIngredients([limit(50)]);
  const { data: inventoryItems, loading: inventoryLoading } = useInventory(inventoryAlertsConstraints);
  const { data: wasteEntries, loading: wasteLoading } = useWasteLog(undefined, recentWasteConstraints);
  const { data: purchaseOrders, loading: posLoading } = useCollection<PurchaseOrder>(
    "purchaseOrders",
    poConstraints
  );

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  const loading =
    eventsLoading ||
    recipesLoading ||
    ingredientsLoading ||
    inventoryLoading ||
    wasteLoading ||
    posLoading;

  // Memoize "now" once per mount so date objects are stable across renders
  const now = useMemo(() => new Date(), []);

  // --- Derived metrics ---
  const metrics = useMemo(() => {
    const todayStartVal = startOfDay(now);
    const todayEndVal = endOfDay(now);
    const weekStartVal = startOfWeek(now);
    const weekEndVal = endOfWeek(now);
    const monthStartVal = startOfMonth(now);

    const allEvents = events ?? [];
    const allWaste = wasteEntries ?? [];
    const allPOs = purchaseOrders ?? [];

    // Today's events
    const todayEvents = allEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d >= todayStartVal && d <= todayEndVal && e.status !== "cancelled";
    });

    // This week's events
    const weekEvents = allEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d >= weekStartVal && d < weekEndVal && e.status !== "cancelled";
    });

    // This month events for food cost calc
    const monthEvents = allEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d >= monthStartVal && d <= now && e.status !== "cancelled";
    });

    const todayRevenue = todayEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const weekRevenue = weekEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const monthRevenue = monthEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const monthCost = monthEvents.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0
    );

    // Food cost % = total cost / total revenue
    const foodCostPct = monthRevenue > 0 ? (monthCost / monthRevenue) * 100 : 0;

    // Weighted avg margin across active events
    const activeEvents = allEvents.filter(
      (e) => e.status !== "cancelled" && e.status !== "completed"
    );
    const activeRevenue = activeEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const activeCost = activeEvents.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0
    );
    const avgMargin =
      activeRevenue > 0
        ? ((activeRevenue - activeCost) / activeRevenue) * 100
        : 0;

    // Open POs
    const openPOs = allPOs.filter(
      (po) => po.status === "draft" || po.status === "sent" || po.status === "partially-received"
    );
    const openPOCount = openPOs.length;
    const openPOValue = openPOs.reduce(
      (sum, po) => sum + (po.estimatedTotal || 0),
      0
    );

    // Week waste
    const weekWasteCost = allWaste
      .filter((w) => {
        const d = new Date(w.date);
        return d >= weekStartVal && d < weekEndVal;
      })
      .reduce((sum, w) => sum + (w.totalCost || 0), 0);

    // Today production
    const todayGuests = todayEvents.reduce(
      (sum, e) => sum + (e.guestCount || 0),
      0
    );
    // Estimate meals = guests (1 meal per guest as baseline)
    const todayMeals = todayGuests;

    // Week-over-week trend: compare this week revenue with a simple estimate
    const lastWeekStart = new Date(weekStartVal);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStartVal);
    const lastWeekRevenue = allEvents
      .filter((e) => {
        const d = new Date(e.eventDate);
        return d >= lastWeekStart && d < lastWeekEnd && e.status !== "cancelled";
      })
      .reduce((sum, e) => sum + (e.totalPrice || 0), 0);
    const trendUp = weekRevenue >= lastWeekRevenue;

    return {
      foodCostPct,
      todayRevenue,
      weekRevenue,
      avgMargin,
      openPOCount,
      openPOValue,
      weekWasteCost,
      todayEvents,
      todayGuests,
      todayMeals,
      trendUp,
    };
  }, [events, wasteEntries, purchaseOrders, now]);

  // --- Recipe profitability ---
  const recipeProfitability = useMemo(() => {
    if (!recipes) return [];
    return recipes.map((r) => {
      // Estimated selling price: cost / (1 - target margin) i.e. a 35% margin markup
      const estimatedPrice =
        r.costPerServing > 0 ? r.costPerServing / (1 - TARGET_MARGIN / 100) : 0;
      const marginPct =
        estimatedPrice > 0
          ? ((estimatedPrice - r.costPerServing) / estimatedPrice) * 100
          : 0;
      return {
        id: r.id,
        name: r.name,
        costPerServing: r.costPerServing,
        estimatedPrice,
        marginPct,
      };
    });
  }, [recipes]);

  // --- Alerts ---
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const allEvents = events ?? [];
    const allIngredients = ingredients ?? [];
    const allInventory = inventoryItems ?? [];

    // Events below target margin
    allEvents
      .filter(
        (e) =>
          e.status !== "cancelled" &&
          e.status !== "completed" &&
          e.totalPrice > 0 &&
          e.marginPercentage < TARGET_MARGIN
      )
      .forEach((e) => {
        result.push({
          id: `margin-${e.id}`,
          type: "margin",
          message: `${e.eventType || "Event"} for ${e.clientName} is at ${e.marginPercentage.toFixed(1)}% margin (target: ${TARGET_MARGIN}%)`,
          href: `/events/${e.id}`,
          icon: "warning",
          colorClass: "border-red-200 bg-red-50 text-red-800",
        });
      });

    // Low inventory items below reorder point
    allInventory
      .filter((inv) => inv.currentQuantity <= inv.reorderPoint)
      .forEach((inv) => {
        result.push({
          id: `inventory-${inv.id}`,
          type: "inventory",
          message: `${inv.ingredientName} is low: ${inv.currentQuantity.toFixed(1)} ${inv.unit} (reorder at ${inv.reorderPoint})`,
          href: "/inventory",
          icon: "inventory_2",
          colorClass: "border-amber-200 bg-amber-50 text-amber-800",
        });
      });

    // Ingredients with high cost (flag any that cost > $10/unit as a proxy for price alerts)
    allIngredients
      .filter((ing) => ing.costPerUnit > 10)
      .slice(0, 3)
      .forEach((ing) => {
        result.push({
          id: `price-${ing.id}`,
          type: "price",
          message: `${ing.name} at ${formatCurrency(ing.costPerUnit)}/${ing.unit} -- review pricing`,
          href: `/ingredients/${ing.id}`,
          icon: "price_change",
          colorClass: "border-amber-200 bg-amber-50 text-amber-800",
        });
      });

    return result.filter((a) => !dismissedAlerts.has(a.id));
  }, [events, ingredients, inventoryItems, dismissedAlerts]);

  // --- Today's top ingredients (from today's events, estimated) ---
  const topIngredients = useMemo(() => {
    // Since we don't load event menu items in bulk, use inventory items sorted by usage as a proxy
    const inv = inventoryItems ?? [];
    return inv
      .filter((item) => item.currentQuantity > 0)
      .sort((a, b) => b.currentQuantity - a.currentQuantity)
      .slice(0, 5)
      .map((item) => ({
        name: item.ingredientName,
        quantity: item.currentQuantity,
        unit: item.unit,
      }));
  }, [inventoryItems]);

  // --- Upcoming events ---
  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter(
        (e) =>
          new Date(e.eventDate) >= now &&
          e.status !== "cancelled" &&
          e.status !== "completed"
      )
      .sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      )
      .slice(0, 5);
  }, [events, now]);

  function handleDismissAlert(id: string) {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Operations Dashboard
        </h1>
        <p className="mt-1 font-medium text-gray-500">
          Real-time food cost, margin, and production overview
        </p>
      </div>

      {/* Margin Alerts */}
      <AlertsSection alerts={alerts} onDismiss={handleDismissAlert} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <FoodCostCard
          foodCostPct={metrics.foodCostPct}
          target={TARGET_FOOD_COST}
        />
        <RevenueCard
          todayRevenue={metrics.todayRevenue}
          weekRevenue={metrics.weekRevenue}
          trendUp={metrics.trendUp}
        />
        <MarginCard margin={metrics.avgMargin} target={TARGET_MARGIN} />
        <PendingOrdersCard
          count={metrics.openPOCount}
          totalValue={metrics.openPOValue}
        />
      </div>

      {/* Production Summary + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductionSummary
            totalMeals={metrics.todayMeals}
            eventCount={metrics.todayEvents.length}
            totalGuests={metrics.todayGuests}
            topIngredients={topIngredients}
          />
        </div>
        <div className="space-y-4">
          <h2 className="px-1 text-lg font-bold text-gray-900">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionCard
              href="/recipes/new"
              icon="menu_book"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title="New Recipe"
              subtitle="Create a dish"
            />
            <QuickActionCard
              href="/waste/log"
              icon="delete_sweep"
              iconBg="bg-red-100"
              iconColor="text-red-500"
              title="Log Waste"
              subtitle="Record waste"
            />
            <QuickActionCard
              href="/inventory"
              icon="fact_check"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              title="Inventory Count"
              subtitle="Start count"
            />
            <QuickActionCard
              href="/events/prep"
              icon="description"
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              title="View Prep Sheets"
              subtitle="Today's prep"
            />
            <QuickActionCard
              href="/events?status=proposal"
              icon="request_quote"
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              title="Review Proposals"
              subtitle="Pending quotes"
            />
            <QuickActionCard
              href="/purchasing"
              icon="local_shipping"
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              title="Purchase Orders"
              subtitle="Manage POs"
            />
          </div>
        </div>
      </div>

      {/* Menu Item Profitability */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Menu Item Profitability
        </h2>
        <RecipeProfitabilitySection recipes={recipeProfitability} />
      </div>

      {/* Upcoming Events */}
      <div
        className="rounded-2xl bg-white"
        style={{ boxShadow: AMBIENT_SHADOW }}
      >
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 className="text-lg font-bold text-gray-900">Upcoming Events</h2>
          <Link
            href="/events"
            className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900"
          >
            View All
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="px-6 pb-6">
            <p className="py-8 text-center text-sm text-gray-400">
              No upcoming events
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingEvents.map((event) => {
              const d = new Date(event.eventDate);
              const month = d
                .toLocaleDateString("en-US", { month: "short" })
                .toUpperCase();
              const day = d.getDate();
              const status = STATUS_MAP[event.status] ?? {
                label: event.status,
                className: "bg-gray-100 text-gray-700",
              };
              const marginOk = event.marginPercentage >= TARGET_MARGIN;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                >
                  {/* Date box */}
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {month}
                    </span>
                    <span className="text-xl font-extrabold leading-none text-gray-900">
                      {day}
                    </span>
                  </div>

                  {/* Event info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-900">
                      {event.eventType || "Event"}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {event.clientName}
                    </p>
                  </div>

                  {/* Guest count */}
                  <div className="hidden items-center gap-1 text-sm text-gray-500 sm:flex">
                    <span className="material-symbols-outlined text-base text-gray-400">
                      group
                    </span>
                    {event.guestCount}
                  </div>

                  {/* Margin indicator */}
                  {event.totalPrice > 0 && (
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-bold sm:inline-flex ${
                        marginOk
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {event.marginPercentage.toFixed(0)}%
                    </span>
                  )}

                  {/* Status badge */}
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase ${status.className}`}
                  >
                    {status.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

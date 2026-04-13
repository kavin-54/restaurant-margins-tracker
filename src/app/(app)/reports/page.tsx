"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useEvents } from "@/lib/hooks/useEvents";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { useWasteLog } from "@/lib/hooks/useWaste";
import { useClients } from "@/lib/hooks/useClients";
import { useVendors } from "@/lib/hooks/useVendors";
import { formatCurrency } from "@/lib/utils";

type DateRange = "7" | "30" | "90" | "all";

const DATE_FILTERS: { label: string; value: DateRange }[] = [
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
  { label: "All Time", value: "all" },
];

function getDateThreshold(range: DateRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(range, 10));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInRange(date: Date, threshold: Date | null): boolean {
  if (!threshold) return true;
  if (!(date instanceof Date) || isNaN(date.getTime())) return false;
  return date >= threshold;
}

// ---------- Color palette for charts ----------
const CHART_COLORS = [
  "#005bc4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

export default function ReportsPage() {
  const { data: events, loading: eventsLoading } = useEvents();
  const { data: recipes, loading: recipesLoading } = useRecipes();
  const { data: ingredients, loading: ingredientsLoading } = useIngredients();
  const { data: wasteEntries, loading: wasteLoading } = useWasteLog();
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: vendors, loading: vendorsLoading } = useVendors();

  const [dateRange, setDateRange] = useState<DateRange>("30");

  const loading = eventsLoading || recipesLoading || ingredientsLoading || wasteLoading || clientsLoading || vendorsLoading;

  const threshold = useMemo(() => getDateThreshold(dateRange), [dateRange]);

  // ---------- Filtered data ----------
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => isInRange(e.eventDate, threshold));
  }, [events, threshold]);

  const completedEvents = useMemo(
    () => filteredEvents.filter((e) => e.status === "completed"),
    [filteredEvents]
  );

  const filteredWaste = useMemo(() => {
    if (!wasteEntries) return [];
    return wasteEntries.filter((w) => isInRange(w.date, threshold));
  }, [wasteEntries, threshold]);

  // ---------- Margin Report ----------
  const marginData = useMemo(() => {
    if (completedEvents.length === 0) return { avg: 0, events: [] };
    const avg = completedEvents.reduce((s, e) => s + e.marginPercentage, 0) / completedEvents.length;
    const sorted = [...completedEvents].sort((a, b) => a.marginPercentage - b.marginPercentage);
    return { avg, events: sorted };
  }, [completedEvents]);

  // ---------- Cost Breakdown ----------
  const costData = useMemo(() => {
    const totalRevenue = filteredEvents.reduce((s, e) => s + (e.totalPrice || 0), 0);
    const totalCost = filteredEvents.reduce((s, e) => s + (e.totalCost || 0), 0);
    const foodPct = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;
    const laborPct = 25; // placeholder
    const overheadPct = 15; // placeholder
    return { totalRevenue, totalCost, foodPct, laborPct, overheadPct };
  }, [filteredEvents]);

  // ---------- Waste Analytics ----------
  const wasteData = useMemo(() => {
    const totalCost = filteredWaste.reduce((s, w) => s + w.totalCost, 0);
    const totalQty = filteredWaste.reduce((s, w) => s + w.quantity, 0);

    const byCategory: Record<string, number> = {};
    filteredWaste.forEach((w) => {
      const cat = w.reason || "other";
      byCategory[cat] = (byCategory[cat] || 0) + w.totalCost;
    });

    const categories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, cost]) => ({ name, cost, pct: totalCost > 0 ? (cost / totalCost) * 100 : 0 }));

    // Compare with previous period
    let prevTotal = 0;
    if (threshold && wasteEntries) {
      const prevThreshold = new Date(threshold);
      const daysDiff = parseInt(dateRange, 10) || 30;
      prevThreshold.setDate(prevThreshold.getDate() - daysDiff);
      const prevWaste = wasteEntries.filter(
        (w) => w.date >= prevThreshold && w.date < threshold
      );
      prevTotal = prevWaste.reduce((s, w) => s + w.totalCost, 0);
    }

    const trend = prevTotal > 0 ? ((totalCost - prevTotal) / prevTotal) * 100 : 0;

    return { totalCost, totalQty, categories, trend };
  }, [filteredWaste, wasteEntries, threshold, dateRange]);

  // ---------- Vendor Spend ----------
  const vendorSpend = useMemo(() => {
    // Derive vendor spend from ingredients' supplier field + costPerUnit as a proxy
    // Since we don't have purchase orders hook, we approximate from ingredient data
    if (!ingredients || !vendors) return [];

    const spendMap: Record<string, { name: string; total: number }> = {};
    ingredients.forEach((ing) => {
      if (ing.supplier) {
        const vendor = vendors.find((v) => v.name === ing.supplier || v.id === ing.supplier);
        const name = vendor?.name || ing.supplier;
        if (!spendMap[name]) spendMap[name] = { name, total: 0 };
        spendMap[name].total += ing.costPerUnit * 100; // Approximate volume
      }
    });

    const sorted = Object.values(spendMap).sort((a, b) => b.total - a.total).slice(0, 5);
    const totalSpend = sorted.reduce((s, v) => s + v.total, 0);
    return sorted.map((v) => ({
      ...v,
      pct: totalSpend > 0 ? (v.total / totalSpend) * 100 : 0,
    }));
  }, [ingredients, vendors]);

  // ---------- Top Ingredients by Cost ----------
  const topIngredients = useMemo(() => {
    if (!ingredients) return [];
    return [...ingredients]
      .sort((a, b) => b.costPerUnit - a.costPerUnit)
      .slice(0, 10)
      .map((ing) => ({
        name: ing.name,
        cost: ing.costPerUnit,
      }));
  }, [ingredients]);

  const maxIngredientCost = useMemo(
    () => Math.max(...topIngredients.map((i) => i.cost), 1),
    [topIngredients]
  );

  // ---------- Client Revenue ----------
  const clientRevenue = useMemo(() => {
    if (!filteredEvents || !clients) return [];

    const map: Record<string, { name: string; revenue: number; eventCount: number; totalMargin: number }> = {};
    filteredEvents.forEach((e) => {
      if (!map[e.clientId]) {
        map[e.clientId] = { name: e.clientName, revenue: 0, eventCount: 0, totalMargin: 0 };
      }
      map[e.clientId].revenue += e.totalPrice || 0;
      map[e.clientId].eventCount += 1;
      map[e.clientId].totalMargin += e.marginPercentage || 0;
    });

    return Object.values(map)
      .map((c) => ({
        ...c,
        avgMargin: c.eventCount > 0 ? c.totalMargin / c.eventCount : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredEvents, clients]);

  if (loading) return <LoadingScreen />;

  const maxMargin = Math.max(...(marginData.events.map((e) => Math.abs(e.marginPercentage))), 1);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Insights and analytics for your operations"
      />

      {/* Date Range Filter */}
      <div className="flex gap-2 mb-8">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setDateRange(filter.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${
              dateRange === filter.value
                ? "bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-sm"
                : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={dateRange !== filter.value ? { boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" } : undefined}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 1. Margin Report */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-lg">trending_up</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Margin Report</h3>
          </div>
          <div className="p-6">
            {completedEvents.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">bar_chart</span>
                <p className="text-sm text-gray-400 font-medium">No completed events in this period</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-extrabold text-gray-900">{marginData.avg.toFixed(1)}%</span>
                  <span className="text-sm text-gray-400 font-medium">avg margin</span>
                </div>
                <div className="space-y-2">
                  {marginData.events.slice(0, 8).map((ev) => {
                    const barWidth = Math.abs(ev.marginPercentage) / maxMargin * 100;
                    const isBelowTarget = ev.marginPercentage < 35;
                    return (
                      <div key={ev.id} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-medium w-24 truncate">{ev.eventType}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBelowTarget ? "bg-red-400" : "bg-green-400"
                            }`}
                            style={{ width: `${Math.max(barWidth, 2)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold w-12 text-right ${
                            isBelowTarget ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {ev.marginPercentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                {marginData.events.filter((e) => e.marginPercentage < 35).length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-red-600 font-semibold">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {marginData.events.filter((e) => e.marginPercentage < 35).length} event(s) below 35% target
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 2. Cost Breakdown */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-lg">payments</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Cost Breakdown</h3>
          </div>
          <div className="p-6">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">pie_chart</span>
                <p className="text-sm text-gray-400 font-medium">No events in this period</p>
              </div>
            ) : (
              <>
                {/* Pie chart via conic gradient */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div
                      className="w-36 h-36 rounded-full"
                      style={{
                        background: `conic-gradient(
                          #005bc4 0% ${costData.foodPct}%,
                          #10b981 ${costData.foodPct}% ${costData.foodPct + costData.laborPct}%,
                          #f59e0b ${costData.foodPct + costData.laborPct}% ${costData.foodPct + costData.laborPct + costData.overheadPct}%,
                          #e5e7eb ${costData.foodPct + costData.laborPct + costData.overheadPct}% 100%
                        )`,
                      }}
                    >
                      <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-gray-900">{costData.foodPct.toFixed(0)}%</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Food</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-[#005bc4]" />
                      <span className="text-gray-600 font-medium">Food Cost</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">{costData.foodPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                      <span className="text-gray-600 font-medium">Labor</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">{costData.laborPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                      <span className="text-gray-600 font-medium">Overhead</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">{costData.overheadPct}%</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Total Revenue</span>
                    <span className="font-bold text-gray-900">{formatCurrency(costData.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Total Cost</span>
                    <span className="font-bold text-gray-900">{formatCurrency(costData.totalCost)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. Waste Analytics */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-lg">delete_sweep</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Waste Analytics</h3>
          </div>
          <div className="p-6">
            {filteredWaste.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">eco</span>
                <p className="text-sm text-gray-400 font-medium">No waste logged in this period</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-4 mb-2">
                  <div>
                    <span className="text-3xl font-extrabold text-gray-900">{formatCurrency(wasteData.totalCost)}</span>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">total waste cost</p>
                  </div>
                </div>

                {wasteData.trend !== 0 && (
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                    wasteData.trend < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    <span className="material-symbols-outlined text-sm">
                      {wasteData.trend < 0 ? "trending_down" : "trending_up"}
                    </span>
                    {Math.abs(wasteData.trend).toFixed(0)}% vs previous period
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  {wasteData.categories.map((cat) => {
                    const maxPct = Math.max(...wasteData.categories.map((c) => c.pct), 1);
                    const barWidth = (cat.pct / maxPct) * 100;
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 font-semibold capitalize">{cat.name}</span>
                          <span className="text-xs text-gray-500 font-medium">{formatCurrency(cat.cost)}</span>
                        </div>
                        <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(barWidth, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-sm">
                  <span className="text-gray-400 font-medium">Total quantity wasted: </span>
                  <span className="font-bold text-gray-900">{wasteData.totalQty.toFixed(1)} units</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 4. Vendor Spend */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-lg">local_shipping</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Vendor Spend</h3>
          </div>
          <div className="p-6">
            {vendorSpend.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">local_shipping</span>
                <p className="text-sm text-gray-400 font-medium">No vendor data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vendorSpend.map((vendor, idx) => (
                  <div key={vendor.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-900 font-semibold">{vendor.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(vendor.total)}</span>
                        <span className="text-[10px] font-bold text-gray-400">{vendor.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(vendor.pct, 3)}%`,
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Top Ingredients by Cost */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 text-lg">inventory_2</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Top Ingredients by Cost</h3>
          </div>
          <div className="p-6">
            {topIngredients.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">inventory_2</span>
                <p className="text-sm text-gray-400 font-medium">No ingredient data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topIngredients.map((ing, idx) => {
                  const barWidth = (ing.cost / maxIngredientCost) * 100;
                  return (
                    <div key={ing.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-semibold truncate max-w-[60%]">{ing.name}</span>
                        <span className="text-xs text-gray-900 font-bold">{formatCurrency(ing.cost)}/unit</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(barWidth, 3)}%`,
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 6. Client Revenue */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-600 text-lg">people</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900">Client Revenue</h3>
          </div>
          <div className="p-6">
            {clientRevenue.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">people</span>
                <p className="text-sm text-gray-400 font-medium">No client data in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientRevenue.slice(0, 8).map((client, idx) => (
                  <div key={client.name} className="flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 truncate">{client.name}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(client.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400 font-medium">
                          {client.eventCount} event{client.eventCount !== 1 ? "s" : ""}
                        </span>
                        <span className={`text-xs font-bold ${
                          client.avgMargin >= 35 ? "text-green-600" : client.avgMargin > 0 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {client.avgMargin.toFixed(1)}% avg margin
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary footer */}
      <div
        className="mt-8 bg-white rounded-2xl p-6"
        style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total Events</p>
            <p className="text-2xl font-extrabold text-gray-900">{filteredEvents.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(costData.totalRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total Waste</p>
            <p className="text-2xl font-extrabold text-red-600">{formatCurrency(wasteData.totalCost)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Avg Margin</p>
            <p className={`text-2xl font-extrabold ${marginData.avg >= 35 ? "text-green-600" : "text-amber-600"}`}>
              {marginData.avg.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

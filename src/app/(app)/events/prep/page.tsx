"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { EmptyState } from "@/components/layout/EmptyState";
import { useEvents, useEventMenuItems, type Event, type EventMenuItem } from "@/lib/hooks/useEvents";
import { useRecipes, type Recipe, type RecipeLine } from "@/lib/hooks/useRecipes";
import { useIngredients, type Ingredient } from "@/lib/hooks/useIngredients";
import { useInventory, type InventoryItem } from "@/lib/hooks/useInventory";
import { useCollection } from "@/lib/hooks/useFirestore";
import { orderBy } from "firebase/firestore";

// --- Constants ---

const AMBIENT_SHADOW = "0px 10px 40px rgba(45,51,53,0.06)";

const STATUS_BADGE: Record<string, string> = {
  inquiry: "bg-blue-100 text-blue-700",
  proposal: "bg-amber-50 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  "in-prep": "bg-purple-100 text-purple-700",
  "in-progress": "bg-indigo-100 text-indigo-700",
  reconciled: "bg-teal-100 text-teal-700",
};

const STATUS_LABEL: Record<string, string> = {
  inquiry: "Inquiry",
  proposal: "Proposed",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "in-prep": "In Prep",
  "in-progress": "In Progress",
  reconciled: "Reconciled",
};

const PREP_STATIONS = ["All", "Proteins", "Vegetables", "Starches", "Sauces", "Desserts", "Other"] as const;
type PrepStation = (typeof PREP_STATIONS)[number];

// Map ingredient categories to prep stations
function getCategoryStation(category: string): PrepStation {
  switch (category?.toLowerCase()) {
    case "protein":
      return "Proteins";
    case "produce":
      return "Vegetables";
    case "grain-starch":
    case "starch":
      return "Starches";
    case "condiment":
    case "oil-fat":
    case "spice":
      return "Sauces";
    case "dessert":
      return "Desserts";
    default:
      return "Other";
  }
}

// Map recipe categories to prep stations
function getRecipeCategoryStation(category: string): PrepStation {
  switch (category?.toLowerCase()) {
    case "main":
    case "protein":
      return "Proteins";
    case "side":
    case "salad":
    case "vegetable":
      return "Vegetables";
    case "bread":
    case "starch":
      return "Starches";
    case "sauce":
    case "marinade":
    case "base":
    case "condiment":
      return "Sauces";
    case "dessert":
      return "Desserts";
    default:
      return "Other";
  }
}

// --- Helpers ---

function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateString(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLocalDate(offset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLocalDateString(offset = 0): string {
  return toDateString(getLocalDate(offset));
}

// --- Sub-components ---

function EventMenuItemsLoader({
  eventId,
  onLoaded,
}: {
  eventId: string;
  onLoaded: (items: EventMenuItem[]) => void;
}) {
  const { data: menuItems, loading } = useEventMenuItems(eventId);

  useEffect(() => {
    if (!loading && menuItems) {
      onLoaded(menuItems);
    }
  }, [menuItems, loading, onLoaded]);

  return null;
}

// --- Prep Item interface ---

interface PrepItem {
  ingredientId: string;
  ingredientName: string;
  totalQuantity: number;
  unit: string;
  station: PrepStation;
  inventoryOnHand: number;
  inventoryUnit: string;
  needsOrder: boolean;
  eventSources: string[];
}

// --- Main Page ---

export default function PrepSheetsPage() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(1)); // Default: tomorrow
  const [activeStation, setActiveStation] = useState<PrepStation>("All");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [menuItemsByEvent, setMenuItemsByEvent] = useState<Record<string, EventMenuItem[]>>({});
  const [stationOverrides, setStationOverrides] = useState<Record<string, PrepStation>>({});

  const { data: allEvents, loading: eventsLoading } = useEvents();
  const { data: recipes, loading: recipesLoading } = useRecipes();
  const { data: ingredients, loading: ingredientsLoading } = useIngredients();
  const { data: inventory, loading: inventoryLoading } = useInventory();

  const loading = eventsLoading || recipesLoading || ingredientsLoading || inventoryLoading;

  // Filter events for selected date
  const eventsForDate = useMemo(() => {
    if (!allEvents) return [];
    return allEvents.filter((event) => {
      const eventDateStr = toDateString(
        event.eventDate instanceof Date ? event.eventDate : new Date(event.eventDate)
      );
      return eventDateStr === selectedDate;
    });
  }, [allEvents, selectedDate]);

  // Build maps for quick lookups
  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes?.forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients?.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory?.forEach((inv) => map.set(inv.ingredientId, inv));
    return map;
  }, [inventory]);

  // Handler for menu items loaded from sub-components
  const handleMenuItemsLoaded = useCallback(
    (eventId: string) => (items: EventMenuItem[]) => {
      setMenuItemsByEvent((prev) => {
        if (JSON.stringify(prev[eventId]) === JSON.stringify(items)) return prev;
        return { ...prev, [eventId]: items };
      });
    },
    []
  );

  // Build aggregated prep list
  const prepItems = useMemo(() => {
    const aggregated = new Map<string, PrepItem>();

    eventsForDate.forEach((event) => {
      const items = menuItemsByEvent[event.id] || [];
      items.forEach((menuItem) => {
        const recipe = recipeMap.get(menuItem.recipeId);
        if (!recipe) return;

        // Use the recipe category for station assignment
        const station = getRecipeCategoryStation(recipe.category);

        // For each recipe, add its ingredients to the prep list
        // Since we don't have recipe lines loaded here, we aggregate at recipe level
        const key = `recipe-${menuItem.recipeId}`;
        const existing = aggregated.get(key);

        if (existing) {
          existing.totalQuantity += menuItem.servings || menuItem.quantity || 0;
          if (!existing.eventSources.includes(event.eventType || event.clientName)) {
            existing.eventSources.push(event.eventType || event.clientName);
          }
        } else {
          aggregated.set(key, {
            ingredientId: menuItem.recipeId,
            ingredientName: menuItem.recipeName,
            totalQuantity: menuItem.servings || menuItem.quantity || 0,
            unit: "servings",
            station,
            inventoryOnHand: 0,
            inventoryUnit: "",
            needsOrder: false,
            eventSources: [event.eventType || event.clientName],
          });
        }
      });
    });

    return Array.from(aggregated.values()).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName)
    );
  }, [eventsForDate, menuItemsByEvent, recipeMap]);

  // Apply station overrides
  const prepItemsWithOverrides = useMemo(() => {
    return prepItems.map((item) => ({
      ...item,
      station: stationOverrides[item.ingredientId] || item.station,
    }));
  }, [prepItems, stationOverrides]);

  // Filter by station
  const filteredPrepItems = useMemo(() => {
    if (activeStation === "All") return prepItemsWithOverrides;
    return prepItemsWithOverrides.filter((item) => item.station === activeStation);
  }, [prepItemsWithOverrides, activeStation]);

  // Group by station for display
  const groupedByStation = useMemo(() => {
    const groups: Record<string, PrepItem[]> = {};
    const items = activeStation === "All" ? prepItemsWithOverrides : filteredPrepItems;

    items.forEach((item) => {
      const station = item.station;
      if (!groups[station]) groups[station] = [];
      groups[station].push(item);
    });

    return groups;
  }, [prepItemsWithOverrides, filteredPrepItems, activeStation]);

  const toggleChecked = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStationChange = (itemId: string, newStation: PrepStation) => {
    if (newStation === "All") return;
    setStationOverrides((prev) => ({ ...prev, [itemId]: newStation }));
  };

  // Reset checked items when date changes
  useEffect(() => {
    setCheckedItems(new Set());
    setStationOverrides({});
  }, [selectedDate]);

  if (loading) return <LoadingScreen />;

  const totalGuests = eventsForDate.reduce((sum, e) => sum + (e.guestCount || 0), 0);
  const totalMenuItems = Object.values(menuItemsByEvent)
    .flat()
    .filter((_, i, arr) => eventsForDate.some((e) => menuItemsByEvent[e.id]?.length))
    .length;

  return (
    <div className="prep-sheet-content">
      {/* Hidden menu item loaders */}
      {eventsForDate.map((event) => (
        <EventMenuItemsLoader
          key={event.id}
          eventId={event.id}
          onLoaded={handleMenuItemsLoaded(event.id)}
        />
      ))}

      <div className="no-print">
        <PageHeader
          title="Prep Sheets"
          description="Daily production planning and prep lists"
          backHref="/events"
          action={{
            label: "Print Prep Sheet",
            onClick: () => window.print(),
            icon: "print",
          }}
        />
      </div>

      {/* Date Selector */}
      <div
        className="bg-white rounded-2xl p-5 mb-6 no-print"
        style={{ boxShadow: AMBIENT_SHADOW }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400 text-xl">calendar_today</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDate(getLocalDateString(0))}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${
                selectedDate === getLocalDateString(0)
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(getLocalDateString(1))}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${
                selectedDate === getLocalDateString(1)
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tomorrow
            </button>
          </div>
          <div className="ml-auto text-sm text-gray-500 font-medium">
            {formatDate(new Date(selectedDate + "T00:00:00"))}
          </div>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Prep Sheet - {formatDate(new Date(selectedDate + "T00:00:00"))}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {eventsForDate.length} event{eventsForDate.length !== 1 ? "s" : ""} | {totalGuests} total guests
        </p>
      </div>

      {eventsForDate.length === 0 ? (
        <EmptyState
          icon="event_busy"
          title="No events on this date"
          description="Select a different date or create a new event to get started with prep planning."
          action={{ label: "View Events", href: "/events" }}
        />
      ) : (
        <>
          {/* Event Summary Cards */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">event_note</span>
              Events on {formatDate(new Date(selectedDate + "T00:00:00"))}
              <span className="text-sm font-medium text-gray-400 ml-1">
                ({eventsForDate.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {eventsForDate.map((event) => {
                const eventMenuItems = menuItemsByEvent[event.id] || [];
                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl p-5"
                    style={{ boxShadow: AMBIENT_SHADOW }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">
                          {event.eventType || "Event"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{event.clientName}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          STATUS_BADGE[event.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABEL[event.status] || event.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="material-symbols-outlined text-sm text-gray-400">group</span>
                        <span className="font-medium">{event.guestCount} guests</span>
                      </div>
                      {event.eventDate && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                          <span className="font-medium">
                            {formatTime(
                              event.eventDate instanceof Date
                                ? event.eventDate
                                : new Date(event.eventDate)
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {eventMenuItems.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Menu ({eventMenuItems.length} items)
                          </p>
                          {eventMenuItems.slice(0, 4).map((mi) => (
                            <p key={mi.id} className="text-xs text-gray-600 truncate">
                              {mi.recipeName}
                            </p>
                          ))}
                          {eventMenuItems.length > 4 && (
                            <p className="text-xs text-gray-400">
                              +{eventMenuItems.length - 4} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          No menu assigned
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Station Tabs */}
          <div className="mb-6 no-print">
            <div className="flex flex-wrap items-center gap-2">
              {PREP_STATIONS.map((station) => {
                const count =
                  station === "All"
                    ? prepItemsWithOverrides.length
                    : prepItemsWithOverrides.filter((i) => i.station === station).length;
                if (station !== "All" && count === 0) return null;
                return (
                  <button
                    key={station}
                    onClick={() => setActiveStation(station)}
                    className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${
                      activeStation === station
                        ? "bg-blue-700 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {station}
                    {count > 0 && (
                      <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aggregated Prep List */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">checklist</span>
              Prep List
              {filteredPrepItems.length > 0 && (
                <span className="text-sm font-medium text-gray-400 ml-1">
                  {checkedItems.size}/{filteredPrepItems.length} completed
                </span>
              )}
            </h2>

            {filteredPrepItems.length === 0 ? (
              <div
                className="bg-white rounded-2xl p-8 text-center"
                style={{ boxShadow: AMBIENT_SHADOW }}
              >
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
                  restaurant_menu
                </span>
                <p className="text-sm text-gray-500">
                  No prep items for this station. Assign menu items to events to generate prep lists.
                </p>
              </div>
            ) : (
              Object.entries(groupedByStation)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([station, items]) => (
                  <div key={station} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-lg text-blue-600">
                        {station === "Proteins"
                          ? "restaurant"
                          : station === "Vegetables"
                          ? "eco"
                          : station === "Starches"
                          ? "grain"
                          : station === "Sauces"
                          ? "soup_kitchen"
                          : station === "Desserts"
                          ? "cake"
                          : "more_horiz"}
                      </span>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        {station}
                      </h3>
                      <span className="text-xs text-gray-400">({items.length})</span>
                    </div>
                    <div
                      className="bg-white rounded-2xl overflow-hidden"
                      style={{ boxShadow: AMBIENT_SHADOW }}
                    >
                      {items.map((item, idx) => {
                        const isChecked = checkedItems.has(item.ingredientId);
                        const inv = inventoryMap.get(item.ingredientId);
                        return (
                          <div
                            key={item.ingredientId}
                            className={`flex items-center gap-4 px-5 py-3.5 ${
                              idx > 0 ? "border-t border-gray-100" : ""
                            } ${isChecked ? "bg-gray-50/50" : ""}`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleChecked(item.ingredientId)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isChecked
                                  ? "bg-green-500 border-green-500"
                                  : "border-gray-300 hover:border-blue-400"
                              }`}
                            >
                              {isChecked && (
                                <span className="material-symbols-outlined text-white text-sm">
                                  check
                                </span>
                              )}
                            </button>

                            {/* Item details */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold transition-all ${
                                  isChecked
                                    ? "text-gray-400 line-through"
                                    : "text-gray-900"
                                }`}
                              >
                                {item.ingredientName}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                For: {item.eventSources.join(", ")}
                              </p>
                            </div>

                            {/* Quantity */}
                            <div className="text-right flex-shrink-0">
                              <p
                                className={`text-sm font-bold ${
                                  isChecked ? "text-gray-400" : "text-gray-900"
                                }`}
                              >
                                {item.totalQuantity.toFixed(1)} {item.unit}
                              </p>
                              {inv && (
                                <p className="text-xs text-gray-400">
                                  On hand: {inv.currentQuantity.toFixed(1)} {inv.unit}
                                </p>
                              )}
                            </div>

                            {/* Need to order flag */}
                            {item.needsOrder && (
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                  <span className="material-symbols-outlined text-sm">
                                    warning
                                  </span>
                                  Order
                                </span>
                              </div>
                            )}

                            {/* Station reassignment */}
                            <div className="flex-shrink-0 no-print">
                              <select
                                value={item.station}
                                onChange={(e) =>
                                  handleStationChange(
                                    item.ingredientId,
                                    e.target.value as PrepStation
                                  )
                                }
                                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              >
                                {PREP_STATIONS.filter((s) => s !== "All").map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Progress Bar (print only) */}
          <div className="hidden print:block mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Generated {new Date().toLocaleString()} | HFS Catering Platform
            </p>
          </div>
        </>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print,
          aside,
          header,
          nav {
            display: none !important;
          }
          body {
            background: white !important;
            font-size: 14px !important;
          }
          .prep-sheet-content {
            padding: 0 !important;
            max-width: 100% !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

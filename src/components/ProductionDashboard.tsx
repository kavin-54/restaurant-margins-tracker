"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEvents, useEventMenuItems, type Event, type EventMenuItem } from "@/lib/hooks/useEvents";
import { useRecipes, type Recipe } from "@/lib/hooks/useRecipes";
import { useIngredients, type Ingredient } from "@/lib/hooks/useIngredients";

const AMBIENT_SHADOW = "0px 10px 40px rgba(45,51,53,0.06)";

function toDateString(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function EventMenuItemsCollector({
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

export function ProductionDashboard() {
  const [menuItemsByEvent, setMenuItemsByEvent] = useState<Record<string, EventMenuItem[]>>({});

  const { data: allEvents, loading: eventsLoading } = useEvents();
  const { data: recipes, loading: recipesLoading } = useRecipes();
  const { data: ingredients, loading: ingredientsLoading } = useIngredients();

  const todayStr = toDateString(new Date());

  // Filter events for today
  const todayEvents = useMemo(() => {
    if (!allEvents) return [];
    return allEvents
      .filter((event) => {
        const eventDateStr = toDateString(
          event.eventDate instanceof Date ? event.eventDate : new Date(event.eventDate)
        );
        return eventDateStr === todayStr;
      })
      .sort((a, b) => {
        const aDate = a.eventDate instanceof Date ? a.eventDate : new Date(a.eventDate);
        const bDate = b.eventDate instanceof Date ? b.eventDate : new Date(b.eventDate);
        return aDate.getTime() - bDate.getTime();
      });
  }, [allEvents, todayStr]);

  const handleMenuItemsLoaded = useCallback(
    (eventId: string) => (items: EventMenuItem[]) => {
      setMenuItemsByEvent((prev) => {
        if (JSON.stringify(prev[eventId]) === JSON.stringify(items)) return prev;
        return { ...prev, [eventId]: items };
      });
    },
    []
  );

  // Recipe map for lookups
  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes?.forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  // Computed stats
  const totalGuests = todayEvents.reduce((sum, e) => sum + (e.guestCount || 0), 0);
  const totalMeals = useMemo(() => {
    let count = 0;
    todayEvents.forEach((event) => {
      const items = menuItemsByEvent[event.id] || [];
      items.forEach((mi) => {
        count += mi.servings || mi.quantity || 0;
      });
    });
    return count;
  }, [todayEvents, menuItemsByEvent]);

  // Key ingredients needed
  const keyIngredients = useMemo(() => {
    const ingredientTotals = new Map<string, { name: string; quantity: number; unit: string }>();

    todayEvents.forEach((event) => {
      const items = menuItemsByEvent[event.id] || [];
      items.forEach((mi) => {
        const existing = ingredientTotals.get(mi.recipeId);
        if (existing) {
          existing.quantity += mi.servings || mi.quantity || 0;
        } else {
          ingredientTotals.set(mi.recipeId, {
            name: mi.recipeName,
            quantity: mi.servings || mi.quantity || 0,
            unit: "servings",
          });
        }
      });
    });

    return Array.from(ingredientTotals.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [todayEvents, menuItemsByEvent]);

  const loading = eventsLoading || recipesLoading || ingredientsLoading;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 animate-pulse" style={{ boxShadow: AMBIENT_SHADOW }}>
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (todayEvents.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: AMBIENT_SHADOW }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">today</span>
            Today&apos;s Production
          </h2>
          <Link
            href="/events/prep"
            className="text-xs font-bold text-blue-700 hover:text-blue-800 transition"
          >
            View Prep Sheets
          </Link>
        </div>
        <div className="text-center py-6">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">event_available</span>
          <p className="text-sm text-gray-500">No events scheduled for today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: AMBIENT_SHADOW }}>
      {/* Hidden menu items loaders */}
      {todayEvents.map((event) => (
        <EventMenuItemsCollector
          key={event.id}
          eventId={event.id}
          onLoaded={handleMenuItemsLoaded(event.id)}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">today</span>
          Today&apos;s Production
        </h2>
        <Link
          href="/events/prep"
          className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition"
        >
          View Prep Sheets
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Events</p>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">{todayEvents.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Total Guests</p>
          <p className="text-2xl font-extrabold text-green-900 mt-1">{totalGuests}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Total Meals</p>
          <p className="text-2xl font-extrabold text-purple-900 mt-1">{totalMeals}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Menu Items</p>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">
            {keyIngredients.length}
          </p>
        </div>
      </div>

      {/* Guest Count by Event */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
          Guest Count by Event
        </h3>
        <div className="space-y-2">
          {todayEvents.map((event) => {
            const pct = totalGuests > 0 ? (event.guestCount / totalGuests) * 100 : 0;
            return (
              <div key={event.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {event.eventType || event.clientName}
                    </p>
                    <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">
                      {event.guestCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Ingredients */}
      {keyIngredients.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
            Key Items Needed
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {keyIngredients.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-xs font-medium text-gray-700 truncate">
                  {item.name}
                </span>
                <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">
                  {item.quantity.toFixed(0)} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
          Timeline
        </h3>
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {todayEvents.map((event) => {
              const eventDate =
                event.eventDate instanceof Date
                  ? event.eventDate
                  : new Date(event.eventDate);
              return (
                <div key={event.id} className="flex items-start gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center z-10 flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-600 text-xs">
                      schedule
                    </span>
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-xs font-bold text-gray-900">
                      {formatTime(eventDate) || "TBD"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.eventType || "Event"} - {event.clientName} ({event.guestCount} guests)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

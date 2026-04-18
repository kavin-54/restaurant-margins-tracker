"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { limit } from "firebase/firestore";
import { useEvents } from "@/lib/hooks/useEvents";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { useClients } from "@/lib/hooks/useClients";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { useVendors } from "@/lib/hooks/useVendors";

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

const EVENTS_LIMIT = [limit(100)];
const RECIPES_LIMIT = [limit(300)];
const CLIENTS_LIMIT = [limit(300)];
const INGREDIENTS_LIMIT = [limit(400)];
const VENDORS_LIMIT = [limit(100)];

interface ResultItem {
  id: string;
  href: string;
  icon: string;
  label: string;
  sub?: string;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const eventsC = useMemo(() => EVENTS_LIMIT, []);
  const recipesC = useMemo(() => RECIPES_LIMIT, []);
  const clientsC = useMemo(() => CLIENTS_LIMIT, []);
  const ingredientsC = useMemo(() => INGREDIENTS_LIMIT, []);
  const vendorsC = useMemo(() => VENDORS_LIMIT, []);

  const { data: events } = useEvents(undefined, eventsC);
  const { data: recipes } = useRecipes(recipesC);
  const { data: clients } = useClients(clientsC);
  const { data: ingredients } = useIngredients(ingredientsC);
  const { data: vendors } = useVendors(vendorsC);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;
    const m = (s?: string) => !!s && s.toLowerCase().includes(q);

    const eventMatches: ResultItem[] = (events ?? [])
      .filter((e) => m(e.clientName) || m(e.eventType))
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        href: `/events/${e.id}`,
        icon: "event",
        label: `${e.clientName || "Event"} — ${e.eventType || "event"}`,
        sub: e.eventDate
          ? new Date(e.eventDate).toLocaleDateString()
          : undefined,
      }));

    const recipeMatches: ResultItem[] = (recipes ?? [])
      .filter((r) => m(r.name) || m(r.category))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        href: `/recipes/${r.id}`,
        icon: "restaurant_menu",
        label: r.name,
        sub: r.category,
      }));

    const clientMatches: ResultItem[] = (clients ?? [])
      .filter((c) => m(c.name) || m(c.company) || m(c.email))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        href: `/clients/${c.id}`,
        icon: "group",
        label: c.name,
        sub: c.company || c.email,
      }));

    const ingredientMatches: ResultItem[] = (ingredients ?? [])
      .filter((i) => m(i.name) || m(i.category))
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        href: `/ingredients/${i.id}`,
        icon: "egg_alt",
        label: i.name,
        sub: i.category,
      }));

    const vendorMatches: ResultItem[] = (vendors ?? [])
      .filter((v) => m(v.name) || m(v.city))
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        href: `/vendors/${v.id}`,
        icon: "local_shipping",
        label: v.name,
        sub: v.city,
      }));

    return {
      Events: eventMatches,
      Recipes: recipeMatches,
      Clients: clientMatches,
      Ingredients: ingredientMatches,
      Vendors: vendorMatches,
    };
  }, [q, events, recipes, clients, ingredients, vendors]);

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function closeDropdown() {
    setFocused(false);
    setQuery("");
  }

  const showDropdown = focused && q.length > 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-white/85 backdrop-blur-md border-b border-slate-200/40 px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-400 hover:bg-slate-100 lg:hidden"
      >
        <span className="material-symbols-outlined text-xl">menu</span>
      </button>

      <div ref={containerRef} className="flex-1 max-w-lg relative">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeDropdown();
            }}
            placeholder="Search events, recipes, clients..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-100 border-none text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>

        {showDropdown && (
          <div className="absolute top-full mt-2 w-full max-h-[480px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200/60 z-40">
            {totalResults === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">
                No results for &quot;{query}&quot;
              </div>
            ) : (
              <div className="py-2">
                {results &&
                  Object.entries(results).map(([group, items]) =>
                    items.length === 0 ? null : (
                      <div key={group} className="py-1">
                        <div className="px-4 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          {group}
                        </div>
                        {items.map((item) => (
                          <Link
                            key={`${group}-${item.id}`}
                            href={item.href}
                            onClick={closeDropdown}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-gray-400 text-xl">
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {item.label}
                              </p>
                              {item.sub && (
                                <p className="text-xs text-gray-400 truncate">
                                  {item.sub}
                                </p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ),
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-slate-100 transition-colors relative">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined text-xl">help_outline</span>
        </button>
        <Link
          href="/events/new"
          className="hidden md:flex h-10 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 items-center gap-2 px-5"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Event
        </Link>
      </div>
    </header>
  );
}

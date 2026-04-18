"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { useRecipes, type RecipeLine } from "@/lib/hooks/useRecipes";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { formatCurrency } from "@/lib/utils";
import {
  DietaryType,
  GeneratedMenu,
  PLANNER_CATEGORIES,
  PlannerCategory,
  CategoryCounts,
  bucketRecipes,
  generateMenus,
  pickArchetypes,
} from "@/lib/menuPlanner";

const DEFAULT_COUNTS: Record<PlannerCategory, number> = {
  appetizer: 0,
  soup: 1,
  main: 1,
  side: 1,
  bread: 0,
  sauce: 1,
  dessert: 1,
  beverage: 0,
};

export default function MenuPlannerPage() {
  const { data: recipes } = useRecipes();
  const { data: ingredients } = useIngredients();

  const [allLines, setAllLines] = useState<Array<RecipeLine & { recipeId: string }> | null>(null);
  const [linesLoading, setLinesLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(collectionGroup(db, "lines"));
        const items: Array<RecipeLine & { recipeId: string }> = [];
        for (const d of snap.docs) {
          const recipeId = d.ref.parent.parent?.id;
          if (!recipeId) continue;
          items.push({ id: d.id, recipeId, ...(d.data() as Omit<RecipeLine, "id">) });
        }
        if (alive) setAllLines(items);
      } finally {
        if (alive) setLinesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const linesByRecipe = useMemo(() => {
    const map = new Map<string, RecipeLine[]>();
    for (const l of allLines ?? []) {
      const arr = map.get(l.recipeId) ?? [];
      arr.push(l);
      map.set(l.recipeId, arr);
    }
    return map;
  }, [allLines]);

  const ingredientsById = useMemo(() => {
    const map = new Map<string, (typeof ingredients)[number]>();
    for (const i of ingredients ?? []) map.set(i.id, i);
    return map;
  }, [ingredients]);

  const [dietary, setDietary] = useState<DietaryType>("veg");
  const [budgetInput, setBudgetInput] = useState("");
  const [guestsInput, setGuestsInput] = useState("");
  const [counts, setCounts] = useState<CategoryCounts>(DEFAULT_COUNTS);
  const [generated, setGenerated] = useState<GeneratedMenu[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const availableByCategory = useMemo(() => {
    if (!recipes || !allLines) return new Map<PlannerCategory, number>();
    const buckets = bucketRecipes(
      recipes,
      linesByRecipe,
      ingredientsById,
      dietary,
    );
    const out = new Map<PlannerCategory, number>();
    for (const c of PLANNER_CATEGORIES) {
      out.set(c.value, buckets.get(c.value)?.length ?? 0);
    }
    return out;
  }, [recipes, allLines, linesByRecipe, ingredientsById, dietary]);

  const totalDishes = Object.values(counts).reduce(
    (s, n) => s + Math.max(0, n ?? 0),
    0,
  );

  function adjust(cat: PlannerCategory, delta: number) {
    setCounts((prev) => {
      const cur = prev[cat] ?? 0;
      const max = availableByCategory.get(cat) ?? 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      return { ...prev, [cat]: next };
    });
  }

  function runGenerate() {
    setErrorMsg(null);
    setShowAll(false);
    setGenerated(null);
    const budget = Number(budgetInput);
    if (!budget || budget <= 0) {
      setErrorMsg("Enter a max budget per person greater than zero.");
      return;
    }
    if (totalDishes === 0) {
      setErrorMsg("Pick at least one dish across the categories.");
      return;
    }
    const menus = generateMenus(
      recipes ?? [],
      linesByRecipe,
      ingredientsById,
      counts,
      dietary,
      budget,
    );
    if (menus.length === 0) {
      setErrorMsg(
        `No menu fits ₹${budget}/person with the current selections. Try raising the budget or lowering dish counts.`,
      );
      return;
    }
    setGenerated(menus);
  }

  const archetypes = useMemo(
    () => (generated ? pickArchetypes(generated) : null),
    [generated],
  );

  const loading = !recipes || !ingredients || linesLoading;
  const guests = Number(guestsInput) || 0;
  const budget = Number(budgetInput) || 0;
  const totalBudget = guests > 0 ? guests * budget : 0;

  return (
    <div>
      <PageHeader
        title="Menu Planner"
        description="Generate complete menus under a max ₹/person budget"
      />

      {/* Inputs */}
      <div className="bg-white rounded-2xl ambient-shadow p-6 max-w-4xl">
        {/* Dietary */}
        <div className="mb-5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
            Dietary <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {(["veg", "non-veg"] as DietaryType[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDietary(d)}
                className={
                  "flex-1 h-12 rounded-lg text-sm font-bold transition " +
                  (dietary === d
                    ? "bg-blue-700 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100")
                }
              >
                {d === "veg" ? "Vegetarian" : "Non-Vegetarian"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {dietary === "veg"
              ? "Only recipes without protein-category ingredients will be considered."
              : "Both veg and non-veg recipes will be considered."}
          </p>
        </div>

        {/* Budget + Guests */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
              Max ₹ / Person <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              placeholder="e.g., 120"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="bg-gray-50 border-none h-12 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
              Guest Count (optional)
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g., 500"
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              className="bg-gray-50 border-none h-12 rounded-lg"
            />
            {totalBudget > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Total budget: {formatCurrency(totalBudget)}
              </p>
            )}
          </div>
        </div>

        {/* Category counts */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Dishes per Category
            </label>
            <span className="text-xs font-semibold text-gray-500">
              {totalDishes} total
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PLANNER_CATEGORIES.map((c) => {
              const avail = availableByCategory.get(c.value) ?? 0;
              const cur = counts[c.value] ?? 0;
              const disabled = avail === 0;
              return (
                <div
                  key={c.value}
                  className={
                    "flex items-center justify-between rounded-lg px-4 py-2.5 " +
                    (disabled
                      ? "bg-gray-100 opacity-50"
                      : "bg-gray-50")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {avail} available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={disabled || cur === 0}
                      onClick={() => adjust(c.value, -1)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-bold disabled:opacity-30 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-900">
                      {cur}
                    </span>
                    <button
                      type="button"
                      disabled={disabled || cur >= avail}
                      onClick={() => adjust(c.value, 1)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-bold disabled:opacity-30 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={runGenerate}
            disabled={loading}
            className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {loading ? "Loading recipes..." : "Generate Menus"}
          </button>
          {errorMsg && (
            <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
          )}
        </div>
      </div>

      {/* Results */}
      {archetypes && (
        <div className="mt-8 max-w-4xl">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {generated?.length ?? 0} menu{(generated?.length ?? 0) === 1 ? "" : "s"} fit your budget
            </h2>
            {(generated?.length ?? 0) > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                {showAll ? "Show top 3" : `Show all ${generated?.length}`}
              </button>
            )}
          </div>

          {!showAll ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ArchetypeCard
                title="Budget Pick"
                subtitle="Lowest total cost"
                menu={archetypes.budget}
                budget={budget}
                icon="savings"
                color="emerald"
              />
              <ArchetypeCard
                title="Best Value"
                subtitle="Balanced cost"
                menu={archetypes.bestValue}
                budget={budget}
                icon="star"
                color="blue"
              />
              <ArchetypeCard
                title="Premium"
                subtitle="Highest within budget"
                menu={archetypes.premium}
                budget={budget}
                icon="diamond"
                color="purple"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {(generated ?? []).slice(0, 50).map((m, idx) => (
                <FullMenuRow key={idx} menu={m} budget={budget} />
              ))}
              {(generated?.length ?? 0) > 50 && (
                <p className="text-xs text-gray-400 text-center">
                  Showing first 50 of {generated?.length}. Narrow the criteria for fewer results.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArchetypeCard({
  title,
  subtitle,
  menu,
  budget,
  icon,
  color,
}: {
  title: string;
  subtitle: string;
  menu: GeneratedMenu | null;
  budget: number;
  icon: string;
  color: "emerald" | "blue" | "purple";
}) {
  if (!menu) return null;
  const headroom = budget - menu.totalCostPerServing;
  const colorMap = {
    emerald: "border-emerald-500 text-emerald-700 bg-emerald-50",
    blue: "border-blue-500 text-blue-700 bg-blue-50",
    purple: "border-purple-500 text-purple-700 bg-purple-50",
  }[color];
  const slotsByCategory = new Map<PlannerCategory, GeneratedMenu["slots"]>();
  for (const s of menu.slots) {
    const arr = slotsByCategory.get(s.category) ?? [];
    arr.push(s);
    slotsByCategory.set(s.category, arr);
  }
  return (
    <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
      <div className={`border-l-4 ${colorMap.split(" ")[0]} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`material-symbols-outlined text-xl ${colorMap.split(" ")[1]}`}
          >
            {icon}
          </span>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">{subtitle}</p>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(menu.totalCostPerServing)}
          </span>
          <span className="text-xs text-gray-500">/ person</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {headroom >= 0
            ? `${formatCurrency(headroom)} under budget`
            : `${formatCurrency(-headroom)} over budget`}
        </p>

        <div className="space-y-3">
          {Array.from(slotsByCategory.entries()).map(([cat, slots]) => {
            const catLabel = PLANNER_CATEGORIES.find(
              (c) => c.value === cat,
            )?.label;
            return (
              <div key={cat}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {catLabel}
                </p>
                <ul className="space-y-0.5">
                  {slots.map((s, i) => (
                    <li
                      key={`${s.recipe.id}-${i}`}
                      className="text-sm text-gray-800 flex justify-between gap-2"
                    >
                      <Link
                        href={`/recipes/${s.recipe.id}`}
                        className="hover:text-blue-700 hover:underline truncate"
                      >
                        {s.recipe.name}
                      </Link>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatCurrency(s.recipe.costPerServing ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FullMenuRow({
  menu,
  budget,
}: {
  menu: GeneratedMenu;
  budget: number;
}) {
  const headroom = budget - menu.totalCostPerServing;
  const byCategory = new Map<PlannerCategory, GeneratedMenu["slots"]>();
  for (const s of menu.slots) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }
  return (
    <div className="bg-white rounded-xl ambient-shadow p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">
          {menu.slots.map((s) => s.recipe.name).join(" · ")}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold text-gray-900">
          {formatCurrency(menu.totalCostPerServing)}
        </p>
        <p className="text-xs text-gray-400">
          {headroom >= 0
            ? `${formatCurrency(headroom)} under`
            : `${formatCurrency(-headroom)} over`}
        </p>
      </div>
    </div>
  );
}

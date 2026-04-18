import type { Recipe, RecipeLine } from "@/lib/hooks/useRecipes";
import type { Ingredient } from "@/lib/hooks/useIngredients";

export type DietaryType = "veg" | "non-veg";

export const PLANNER_CATEGORIES = [
  { value: "appetizer", label: "Appetizer" },
  { value: "soup", label: "Soup" },
  { value: "main", label: "Main Course" },
  { value: "side", label: "Side Dish" },
  { value: "bread", label: "Bread" },
  { value: "sauce", label: "Sauce / Chutney" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
] as const;

export type PlannerCategory = (typeof PLANNER_CATEGORIES)[number]["value"];

export type CategoryCounts = Partial<Record<PlannerCategory, number>>;

export interface MenuSlot {
  category: PlannerCategory;
  recipe: Recipe;
}

export interface GeneratedMenu {
  slots: MenuSlot[];
  totalCostPerServing: number;
}

/**
 * A recipe is non-veg if any of its ingredient lines references an ingredient
 * in the `protein` category (chicken, mutton, fish, prawns, eggs in the seed).
 * Dairy (paneer, ghee, milk, curd) is its own category, so lacto-veg recipes
 * correctly classify as veg.
 */
export function isRecipeVeg(
  recipe: Recipe,
  linesByRecipe: Map<string, RecipeLine[]>,
  ingredientsById: Map<string, Ingredient>,
): boolean {
  const lines = linesByRecipe.get(recipe.id) ?? [];
  for (const line of lines) {
    const ing = ingredientsById.get(line.ingredientId);
    if (ing && ing.category === "protein") return false;
  }
  return true;
}

/**
 * Bucket recipes by category, applying the dietary filter.
 * In "veg" mode we keep only veg recipes. In "non-veg" we allow everything
 * (mixed menus are the norm — non-veg catering still serves veg sides).
 */
export function bucketRecipes(
  recipes: Recipe[],
  linesByRecipe: Map<string, RecipeLine[]>,
  ingredientsById: Map<string, Ingredient>,
  dietary: DietaryType,
): Map<PlannerCategory, Recipe[]> {
  const allowedCats = new Set<string>(PLANNER_CATEGORIES.map((c) => c.value));
  const buckets = new Map<PlannerCategory, Recipe[]>();
  for (const r of recipes) {
    if (!allowedCats.has(r.category)) continue;
    if (dietary === "veg" && !isRecipeVeg(r, linesByRecipe, ingredientsById)) {
      continue;
    }
    const key = r.category as PlannerCategory;
    const list = buckets.get(key) ?? [];
    list.push(r);
    buckets.set(key, list);
  }
  for (const [k, v] of buckets) {
    v.sort(
      (a, b) => (a.costPerServing ?? 0) - (b.costPerServing ?? 0),
    );
    buckets.set(k, v);
  }
  return buckets;
}

interface BranchContext {
  budget: number;
  maxResults: number;
  active: Array<{ category: PlannerCategory; count: number; pool: Recipe[] }>;
  results: GeneratedMenu[];
}

/**
 * Enumerate all menus satisfying category counts and budget, with
 * branch-and-bound pruning on the running cost + minimum possible remainder.
 */
export function generateMenus(
  recipes: Recipe[],
  linesByRecipe: Map<string, RecipeLine[]>,
  ingredientsById: Map<string, Ingredient>,
  counts: CategoryCounts,
  dietary: DietaryType,
  budgetPerPerson: number,
  maxResults = 2000,
): GeneratedMenu[] {
  const buckets = bucketRecipes(
    recipes,
    linesByRecipe,
    ingredientsById,
    dietary,
  );

  const active = PLANNER_CATEGORIES.map(({ value }) => ({
    category: value as PlannerCategory,
    count: Math.max(0, Math.floor(counts[value as PlannerCategory] ?? 0)),
    pool: buckets.get(value as PlannerCategory) ?? [],
  })).filter((a) => a.count > 0);

  for (const a of active) {
    if (a.pool.length < a.count) return [];
  }

  const minRemainder: number[] = new Array(active.length + 1).fill(0);
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i];
    const cheapestSum = a.pool
      .slice(0, a.count)
      .reduce((s, r) => s + (r.costPerServing ?? 0), 0);
    minRemainder[i] = cheapestSum + minRemainder[i + 1];
  }

  const ctx: BranchContext = {
    budget: budgetPerPerson,
    maxResults,
    active,
    results: [],
  };

  if (active.length === 0) return [];
  exploreCategory(ctx, 0, [], 0, minRemainder);
  return ctx.results;
}

function exploreCategory(
  ctx: BranchContext,
  catIdx: number,
  slots: MenuSlot[],
  runningCost: number,
  minRemainder: number[],
) {
  if (ctx.results.length >= ctx.maxResults) return;
  if (catIdx === ctx.active.length) {
    ctx.results.push({
      slots: slots.slice(),
      totalCostPerServing: Number(runningCost.toFixed(2)),
    });
    return;
  }
  const { category, count, pool } = ctx.active[catIdx];
  pickCombinations(
    pool,
    count,
    0,
    [],
    (combo, comboCost) => {
      const newRunning = runningCost + comboCost;
      if (newRunning + minRemainder[catIdx + 1] > ctx.budget) return;
      for (const r of combo) slots.push({ category, recipe: r });
      exploreCategory(ctx, catIdx + 1, slots, newRunning, minRemainder);
      for (let i = 0; i < combo.length; i++) slots.pop();
    },
    runningCost,
    ctx.budget - runningCost - minRemainder[catIdx + 1],
  );
}

function pickCombinations(
  pool: Recipe[],
  count: number,
  start: number,
  current: Recipe[],
  onFull: (combo: Recipe[], comboCost: number) => void,
  _runningCost: number,
  remainingHeadroom: number,
  comboCost = 0,
) {
  if (current.length === count) {
    onFull(current, comboCost);
    return;
  }
  const needed = count - current.length;
  for (let i = start; i <= pool.length - needed; i++) {
    const r = pool[i];
    const rCost = r.costPerServing ?? 0;
    const projected = comboCost + rCost;
    if (projected > remainingHeadroom + 1e-6) break;
    current.push(r);
    pickCombinations(
      pool,
      count,
      i + 1,
      current,
      onFull,
      _runningCost,
      remainingHeadroom,
      projected,
    );
    current.pop();
  }
}

/**
 * From a (potentially large) set of valid menus, surface the three archetypes
 * most useful to a caterer: cheapest, premium-within-budget, and a
 * middle/variety pick. Null if no menus exist.
 */
export function pickArchetypes(menus: GeneratedMenu[]): {
  budget: GeneratedMenu | null;
  bestValue: GeneratedMenu | null;
  premium: GeneratedMenu | null;
} {
  if (menus.length === 0) {
    return { budget: null, bestValue: null, premium: null };
  }
  const sorted = [...menus].sort(
    (a, b) => a.totalCostPerServing - b.totalCostPerServing,
  );
  const budget = sorted[0];
  const premium = sorted[sorted.length - 1];
  const bestValue = sorted[Math.floor(sorted.length / 2)];
  return { budget, bestValue, premium };
}

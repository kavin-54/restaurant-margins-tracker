"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useIngredients, type Ingredient } from "@/lib/hooks/useIngredients";
import { addRecipe, addRecipeLine } from "@/lib/hooks/useRecipes";
import { UNITS, getUnit } from "@/lib/constants/units";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  "appetizer",
  "main",
  "side",
  "dessert",
  "sauce",
  "base",
  "marinade",
  "beverage",
  "bread",
  "salad",
  "soup",
  "other",
];

const UNIT_ALIASES: Record<string, string> = {
  g: "g", gm: "g", gms: "g", gr: "g", grm: "g", grms: "g", gram: "g", grams: "g",
  kg: "kg", kgs: "kg", kilogram: "kg", kilograms: "kg",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  ml: "ml", milliliter: "ml", milliliters: "ml",
  l: "liter", lit: "liter", liter: "liter", liters: "liter", litre: "liter", litres: "liter",
  tsp: "tsp", teaspoon: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp",
  cup: "cup", cups: "cup",
  pint: "pint", quart: "quart", gallon: "gallon",
  "fl oz": "fl_oz", "fl_oz": "fl_oz",
  nos: "each", no: "each", pcs: "each", pc: "each",
  piece: "piece", pieces: "piece",
  each: "each", ea: "each",
  dozen: "dozen", case: "case", bunch: "bunch", head: "head",
};

function normalizeUnit(raw: string): string {
  const key = raw.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? key;
}

function parseQuantity(raw: string | number): number | null {
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return (Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2;
  }
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseServingsFromTitle(title: string): number | null {
  const m = title.match(/(\d+)\s*(pax|servings?|pers?o?n?s?|guests?|pp)/i);
  if (m) return Number(m[1]);
  const forM = title.match(/for\s+(\d+)/i);
  if (forM) return Number(forM[1]);
  return null;
}

function extractRecipeName(title: string): string {
  return title
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\s+recipe\s*$/i, "")
    .trim();
}

function convertCostPerUnit(
  baseUnit: string,
  baseCostPerUnit: number,
  targetUnit: string,
): number | null {
  if (baseUnit === targetUnit) return baseCostPerUnit;
  const base = getUnit(baseUnit);
  const target = getUnit(targetUnit);
  if (!base || !target || base.type !== target.type) return null;
  return baseCostPerUnit * (target.toBase / base.toBase);
}

interface ParsedLine {
  rawIngredient: string;
  quantity: number;
  unit: string;
  matchedIngredientId: string;
}

interface ParsedRecipe {
  name: string;
  servings: number;
  category: string;
  lines: ParsedLine[];
}

function findBestMatch(name: string, ingredients: Ingredient[]): string {
  const q = name.trim().toLowerCase();
  if (!q) return "";
  let hit = ingredients.find((i) => i.name.toLowerCase() === q);
  if (hit) return hit.id;
  hit = ingredients.find(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      q.includes(i.name.toLowerCase()),
  );
  return hit?.id ?? "";
}

function parseWorkbook(
  wb: XLSX.WorkBook,
  ingredients: Ingredient[],
): ParsedRecipe {
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  let title = sheetName;
  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as string[];
    const first = String(row[0] ?? "").trim();
    if (headerRowIdx === -1 && /ingredient/i.test(first)) {
      headerRowIdx = i;
      break;
    }
    if (!title || title === sheetName) {
      if (first) title = first;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      "Could not find a header row containing 'Ingredient'. Please check your file format.",
    );
  }

  const header = (rows[headerRowIdx] as string[]).map((c) =>
    String(c ?? "").trim().toLowerCase().replace(/^\ufeff/, ""),
  );
  const ingredientCol = header.findIndex((h) => h.includes("ingredient"));
  const qtyCol = header.findIndex((h) => h.includes("quantity") || h === "qty");
  const unitCol = header.findIndex((h) => h.includes("unit") || h === "uom");

  if (ingredientCol === -1 || qtyCol === -1 || unitCol === -1) {
    throw new Error("Excel must have columns for Ingredient, Quantity, and Unit.");
  }

  const lines: ParsedLine[] = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as string[];
    const ing = String(row[ingredientCol] ?? "").trim();
    if (!ing) continue;
    const qty = parseQuantity(row[qtyCol] as string);
    if (qty === null || qty <= 0) continue;
    const unit = normalizeUnit(String(row[unitCol] ?? "").trim());
    lines.push({
      rawIngredient: ing,
      quantity: qty,
      unit,
      matchedIngredientId: findBestMatch(ing, ingredients),
    });
  }

  if (lines.length === 0) {
    throw new Error("No ingredient lines found in the file.");
  }

  return {
    name: extractRecipeName(title),
    servings: parseServingsFromTitle(title) ?? 10,
    category: "other",
    lines,
  };
}

type ImportStatus = "pending" | "importing" | "done" | "failed";

interface ImportItem {
  id: string;
  fileName: string;
  parsed: ParsedRecipe | null;
  parseError: string | null;
  status: ImportStatus;
  importError?: string;
  createdRecipeId?: string;
  collapsed: boolean;
}

let itemIdCounter = 0;

export default function ImportRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: ingredients } = useIngredients();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: ImportItem[] = [];
    for (const file of Array.from(files)) {
      const id = `item-${++itemIdCounter}`;
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const result = parseWorkbook(wb, ingredients ?? []);
        newItems.push({
          id,
          fileName: file.name,
          parsed: result,
          parseError: null,
          status: "pending",
          collapsed: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to read file.";
        newItems.push({
          id,
          fileName: file.name,
          parsed: null,
          parseError: msg,
          status: "failed",
          collapsed: true,
        });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateItem(id: string, patch: Partial<ImportItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function updateParsed(id: string, patch: Partial<ParsedRecipe>) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.parsed
          ? { ...it, parsed: { ...it.parsed, ...patch } }
          : it,
      ),
    );
  }

  function updateLine(id: string, lineIdx: number, patch: Partial<ParsedLine>) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.parsed
          ? {
              ...it,
              parsed: {
                ...it.parsed,
                lines: it.parsed.lines.map((l, i) =>
                  i === lineIdx ? { ...l, ...patch } : l,
                ),
              },
            }
          : it,
      ),
    );
  }

  function removeLine(id: string, lineIdx: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.parsed
          ? {
              ...it,
              parsed: {
                ...it.parsed,
                lines: it.parsed.lines.filter((_, i) => i !== lineIdx),
              },
            }
          : it,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const importable = items.filter(
    (it) => it.parsed && it.status !== "done" && it.parsed.lines.length > 0,
  );

  async function handleImportAll() {
    if (importable.length === 0) return;
    setSaving(true);
    let successCount = 0;
    let firstCreatedId: string | null = null;

    for (const it of importable) {
      if (!it.parsed) continue;
      const parsed = it.parsed;

      if (!parsed.name.trim() || parsed.servings <= 0) {
        updateItem(it.id, { status: "failed", importError: "Missing recipe name or servings" });
        continue;
      }

      const matched = parsed.lines.filter((l) => l.matchedIngredientId);
      if (matched.length === 0) {
        updateItem(it.id, {
          status: "failed",
          importError: "No matched ingredients — pick at least one",
        });
        continue;
      }

      updateItem(it.id, { status: "importing", importError: undefined });

      try {
        // Build line details once per recipe
        const lineDetails = parsed.lines.map((line) => {
          const ing = ingredients?.find((i) => i.id === line.matchedIngredientId);
          if (!ing) return { costPerUnit: 0, lineCost: 0, ing: null as Ingredient | null, unitOk: false };
          const converted = convertCostPerUnit(ing.unit, ing.costPerUnit, line.unit);
          if (converted === null) {
            return { costPerUnit: 0, lineCost: 0, ing, unitOk: false };
          }
          return { costPerUnit: converted, lineCost: line.quantity * converted, ing, unitOk: true };
        });

        const incompatibleLines = lineDetails
          .map((d, i) => ({ d, line: parsed.lines[i] }))
          .filter((x) => x.d.ing && !x.d.unitOk);
        if (incompatibleLines.length > 0) {
          const names = incompatibleLines
            .map((x) => `${x.line.rawIngredient} (${x.line.unit} vs ${x.d.ing!.unit})`)
            .join(", ");
          updateItem(it.id, {
            status: "failed",
            importError: `Unit mismatch on: ${names}. Fix the unit column in the Excel or change each line's unit before importing.`,
          });
          continue;
        }

        const totalCost = lineDetails.reduce((sum, d) => sum + d.lineCost, 0);
        const costPerServing = parsed.servings > 0 ? totalCost / parsed.servings : 0;

        const recipe = await addRecipe({
          name: parsed.name.trim(),
          servings: parsed.servings,
          category: parsed.category,
          totalRecipeCost: totalCost,
          costPerServing,
        } as any);

        for (let i = 0; i < parsed.lines.length; i++) {
          const line = parsed.lines[i];
          const detail = lineDetails[i];
          if (!detail.ing) continue;
          await addRecipeLine(recipe.id, {
            ingredientId: detail.ing.id,
            ingredientName: detail.ing.name,
            quantity: line.quantity,
            unit: line.unit,
            costPerUnit: detail.costPerUnit,
            lineCost: detail.lineCost,
            sortOrder: i + 1,
          });
        }

        updateItem(it.id, {
          status: "done",
          createdRecipeId: recipe.id,
          collapsed: true,
        });
        successCount++;
        if (!firstCreatedId) firstCreatedId = recipe.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Firestore write failed";
        updateItem(it.id, { status: "failed", importError: msg });
      }
    }

    setSaving(false);

    if (successCount === 0) {
      toast({
        title: "Nothing imported",
        description: "All files had errors — see each card for details.",
        variant: "destructive",
      });
      return;
    }

    if (successCount === 1 && firstCreatedId && importable.length === 1) {
      toast({ title: "Recipe imported" });
      router.push(`/recipes/${firstCreatedId}`);
      return;
    }

    toast({
      title: `Imported ${successCount} recipe${successCount === 1 ? "" : "s"}`,
      description:
        importable.length > successCount
          ? `${importable.length - successCount} file(s) had errors — see details below.`
          : undefined,
    });
  }

  const totalFiles = items.length;
  const readyCount = importable.length;
  const doneCount = items.filter((it) => it.status === "done").length;
  const failedCount = items.filter((it) => it.status === "failed").length;

  return (
    <div>
      <PageHeader
        title="Import Recipes from Excel"
        description="Upload one or more .xlsx files — each file becomes one recipe."
        backHref="/recipes"
      />

      {/* Upload zone (always visible so users can add more) */}
      <div className="bg-white rounded-2xl p-6 ambient-shadow mb-6">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
            upload_file
          </span>
          <p className="text-sm text-gray-600 font-medium mb-1">
            Drop Excel files here or click to choose
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Each file: first row is the recipe title (e.g. &quot;Rasam Recipe (10 Pax)&quot;),
            then a header row with <code>Ingredient | Quantity | Unit</code>, then one
            ingredient per row. Select multiple files at once with Shift+Click.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-10 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 px-5 mx-auto"
          >
            <span className="material-symbols-outlined text-lg">folder_open</span>
            {totalFiles === 0 ? "Choose Files" : "Add More Files"}
          </button>
        </div>
      </div>

      {totalFiles > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-gray-500">
                {totalFiles} file{totalFiles === 1 ? "" : "s"}
              </span>
              {readyCount > 0 && (
                <span className="text-blue-700">{readyCount} ready</span>
              )}
              {doneCount > 0 && (
                <span className="text-green-600">{doneCount} imported</span>
              )}
              {failedCount > 0 && (
                <span className="text-red-600">{failedCount} with errors</span>
              )}
            </div>
            <button
              onClick={() => setItems([])}
              disabled={saving}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Clear all
            </button>
          </div>

          {/* Per-file cards */}
          <div className="space-y-4">
            {items.map((it) => (
              <RecipeCard
                key={it.id}
                item={it}
                ingredients={ingredients ?? []}
                onUpdateParsed={(patch) => updateParsed(it.id, patch)}
                onUpdateLine={(idx, patch) => updateLine(it.id, idx, patch)}
                onRemoveLine={(idx) => removeLine(it.id, idx)}
                onRemove={() => removeItem(it.id)}
                onToggleCollapse={() =>
                  updateItem(it.id, { collapsed: !it.collapsed })
                }
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => router.push("/recipes")}
              disabled={saving}
              className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
            >
              {doneCount > 0 ? "Done" : "Cancel"}
            </button>
            <button
              onClick={handleImportAll}
              disabled={saving || readyCount === 0}
              className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {saving ? "hourglass_empty" : "check"}
              </span>
              {saving
                ? "Importing..."
                : readyCount === 0
                  ? "Nothing to import"
                  : `Import ${readyCount} recipe${readyCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RecipeCard({
  item,
  ingredients,
  onUpdateParsed,
  onUpdateLine,
  onRemoveLine,
  onRemove,
  onToggleCollapse,
}: {
  item: ImportItem;
  ingredients: Ingredient[];
  onUpdateParsed: (patch: Partial<ParsedRecipe>) => void;
  onUpdateLine: (idx: number, patch: Partial<ParsedLine>) => void;
  onRemoveLine: (idx: number) => void;
  onRemove: () => void;
  onToggleCollapse: () => void;
}) {
  const preview = useMemo(() => {
    if (!item.parsed) return null;
    let totalCost = 0;
    let unmatchedCount = 0;
    let unitMismatchCount = 0;
    const lineDetails = item.parsed.lines.map((line) => {
      const ing = ingredients.find((i) => i.id === line.matchedIngredientId);
      if (!ing) {
        unmatchedCount++;
        return { costPerUnit: 0, lineCost: 0, ing: null as Ingredient | null, unitOk: false };
      }
      const converted = convertCostPerUnit(
        ing.unit,
        ing.costPerUnit,
        line.unit,
      );
      if (converted === null) {
        unitMismatchCount++;
        return { costPerUnit: 0, lineCost: 0, ing, unitOk: false };
      }
      const lineCost = line.quantity * converted;
      totalCost += lineCost;
      return { costPerUnit: converted, lineCost, ing, unitOk: true };
    });
    const costPerServing =
      item.parsed.servings > 0 ? totalCost / item.parsed.servings : 0;
    return { lineDetails, totalCost, costPerServing, unmatchedCount, unitMismatchCount };
  }, [item.parsed, ingredients]);

  const statusBorder =
    item.status === "done"
      ? "border-l-4 border-green-500"
      : item.status === "failed"
        ? "border-l-4 border-red-500"
        : item.status === "importing"
          ? "border-l-4 border-blue-500"
          : "border-l-4 border-slate-200";

  // Failed to parse — minimal card
  if (!item.parsed) {
    return (
      <div className={`bg-white rounded-2xl ambient-shadow overflow-hidden ${statusBorder}`}>
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-red-500">error</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{item.fileName}</p>
              <p className="text-xs text-red-600 truncate">{item.parseError}</p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    );
  }

  const parsed = item.parsed;

  return (
    <div className={`bg-white rounded-2xl ambient-shadow overflow-hidden ${statusBorder}`}>
      {/* Header row — always visible */}
      <div className="flex items-center justify-between p-5 gap-4">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
          disabled={item.status === "done"}
        >
          <span
            className="material-symbols-outlined text-gray-400 text-lg transition-transform"
            style={{ transform: item.collapsed ? "rotate(-90deg)" : "rotate(0)" }}
          >
            expand_more
          </span>
          <span className="material-symbols-outlined text-blue-700">
            {item.status === "done"
              ? "check_circle"
              : item.status === "failed"
                ? "error"
                : "description"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {parsed.name || item.fileName}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {item.fileName} · {parsed.lines.length} line
              {parsed.lines.length === 1 ? "" : "s"}
              {preview && preview.unmatchedCount > 0 && (
                <span className="text-amber-600 font-semibold">
                  {" "}
                  · {preview.unmatchedCount} unmatched
                </span>
              )}
              {preview && preview.unitMismatchCount > 0 && (
                <span className="text-red-600 font-semibold">
                  {" "}
                  · {preview.unitMismatchCount} unit mismatch
                </span>
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-3 flex-shrink-0">
          {preview && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-blue-700">
                {formatCurrency(preview.totalCost)}
              </p>
              <p className="text-[10px] text-gray-400">
                {formatCurrency(preview.costPerServing)} / serving
              </p>
            </div>
          )}
          {item.status === "importing" && (
            <span className="text-xs font-bold text-blue-600">Importing…</span>
          )}
          {item.status === "done" && item.createdRecipeId && (
            <Link
              href={`/recipes/${item.createdRecipeId}`}
              className="text-xs font-bold text-green-700 hover:underline flex items-center gap-1"
            >
              View <span className="material-symbols-outlined text-sm">open_in_new</span>
            </Link>
          )}
          {item.status !== "importing" && item.status !== "done" && (
            <button
              onClick={onRemove}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      </div>

      {item.status === "failed" && item.importError && (
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {item.importError}
          </div>
        </div>
      )}

      {/* Expanded body */}
      {!item.collapsed && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          {/* Metadata row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Recipe Name
              </label>
              <Input
                value={parsed.name}
                onChange={(e) => onUpdateParsed({ name: e.target.value })}
                disabled={item.status === "importing" || item.status === "done"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Servings
              </label>
              <Input
                type="number"
                min="1"
                value={parsed.servings}
                onChange={(e) =>
                  onUpdateParsed({
                    servings: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                disabled={item.status === "importing" || item.status === "done"}
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Category
              </label>
              <Select
                value={parsed.category}
                onValueChange={(v) => onUpdateParsed({ category: v })}
                disabled={item.status === "importing" || item.status === "done"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ingredient lines table */}
          <div>
            {preview && preview.unmatchedCount > 0 && (
              <p className="text-xs text-amber-600 font-medium mb-2">
                {preview.unmatchedCount} line(s) couldn&apos;t be matched. Pick an
                ingredient from the dropdown, select &quot;Skip&quot;, or delete the row.
              </p>
            )}
            {preview && preview.unitMismatchCount > 0 && (
              <p className="text-xs text-red-600 font-medium mb-2">
                {preview.unitMismatchCount} line(s) use a unit that can&apos;t
                convert to the matched ingredient&apos;s stored unit. Fix the unit
                in the Excel or the ingredient record — importing is blocked
                until these are resolved.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">From Excel</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Matched Ingredient</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[80px]">Qty</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[100px]">Unit</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[100px]">Line Cost</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {parsed.lines.map((line, idx) => {
                    const detail = preview?.lineDetails[idx];
                    const unmatched = !detail?.ing;
                    const disabled = item.status === "importing" || item.status === "done";
                    return (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-sm text-gray-700">
                          {line.rawIngredient}
                        </td>
                        <td className="py-2 pr-2">
                          <Select
                            value={line.matchedIngredientId || "__none"}
                            onValueChange={(v) =>
                              onUpdateLine(idx, {
                                matchedIngredientId: v === "__none" ? "" : v,
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger
                              className={`h-9 ${unmatched ? "border border-amber-400" : ""}`}
                            >
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">— Skip this line —</SelectItem>
                              {ingredients.map((ing) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} ({formatCurrency(ing.costPerUnit)}/{ing.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className="h-9 w-20"
                            value={line.quantity}
                            onChange={(e) =>
                              onUpdateLine(idx, {
                                quantity: Number(e.target.value) || 0,
                              })
                            }
                            disabled={disabled}
                          />
                        </td>
                        <td className="py-2">
                          <Select
                            value={line.unit}
                            onValueChange={(v) => onUpdateLine(idx, { unit: v })}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 text-sm font-bold text-blue-700">
                          {detail?.ing ? formatCurrency(detail.lineCost) : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => onRemoveLine(idx)}
                            disabled={disabled}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

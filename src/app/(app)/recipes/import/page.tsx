"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Maps values we might see in Excel unit columns → canonical units from src/lib/constants/units
const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "liter",
  lit: "liter",
  liter: "liter",
  liters: "liter",
  litre: "liter",
  litres: "liter",
  tsp: "tsp",
  teaspoon: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  cup: "cup",
  cups: "cup",
  pint: "pint",
  quart: "quart",
  gallon: "gallon",
  "fl oz": "fl_oz",
  "fl_oz": "fl_oz",
  nos: "each",
  no: "each",
  pcs: "each",
  pc: "each",
  piece: "piece",
  pieces: "piece",
  each: "each",
  ea: "each",
  dozen: "dozen",
  case: "case",
  bunch: "bunch",
  head: "head",
};

function normalizeUnit(raw: string): string {
  const key = raw.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? key; // fallback: return as-is
}

function parseQuantity(raw: string | number): number | null {
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (!s) return null;
  // Range like "25-30" or "25–30"
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return (Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2;
  }
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseServingsFromTitle(title: string): number | null {
  // Common patterns: "(10 Pax)", "for 10", "Serves 10", "10 servings"
  const m = title.match(/(\d+)\s*(pax|servings?|pers?o?n?s?|guests?|pp)/i);
  if (m) return Number(m[1]);
  const forM = title.match(/for\s+(\d+)/i);
  if (forM) return Number(forM[1]);
  return null;
}

function extractRecipeName(title: string): string {
  // Strip trailing parenthetical (e.g., "(10 Pax)") and trailing words like "Recipe"
  return title
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\s+recipe\s*$/i, "")
    .trim();
}

function convertCostPerUnit(
  baseUnit: string,
  baseCostPerUnit: number,
  targetUnit: string,
): number {
  if (baseUnit === targetUnit) return baseCostPerUnit;
  const base = getUnit(baseUnit);
  const target = getUnit(targetUnit);
  if (!base || !target || base.type !== target.type) return baseCostPerUnit;
  return baseCostPerUnit * (target.toBase / base.toBase);
}

interface ParsedLine {
  rawIngredient: string;
  quantity: number;
  unit: string;
  matchedIngredientId: string; // empty string means unmatched
}

interface ParsedRecipe {
  name: string;
  servings: number;
  category: string;
  description: string;
  lines: ParsedLine[];
}

function findBestMatch(
  name: string,
  ingredients: Ingredient[],
): string {
  const q = name.trim().toLowerCase();
  if (!q) return "";
  // 1. exact (case-insensitive) match
  let hit = ingredients.find((i) => i.name.toLowerCase() === q);
  if (hit) return hit.id;
  // 2. ingredient name contains the excel value, or vice versa
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

  // Find title (first non-empty row) and header row (contains "Ingredient")
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

  // Column indices
  const header = (rows[headerRowIdx] as string[]).map((c) =>
    String(c ?? "").trim().toLowerCase().replace(/^\ufeff/, ""),
  );
  const ingredientCol = header.findIndex((h) => h.includes("ingredient"));
  const qtyCol = header.findIndex((h) => h.includes("quantity") || h === "qty");
  const unitCol = header.findIndex((h) => h.includes("unit") || h === "uom");

  if (ingredientCol === -1 || qtyCol === -1 || unitCol === -1) {
    throw new Error(
      "Excel must have columns for Ingredient, Quantity, and Unit.",
    );
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

  return {
    name: extractRecipeName(title),
    servings: parseServingsFromTitle(title) ?? 10,
    category: "other",
    description: "",
    lines,
  };
}

export default function ImportRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: ingredients } = useIngredients();
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const result = parseWorkbook(wb, ingredients ?? []);
      if (result.lines.length === 0) {
        throw new Error("No ingredient lines found in the file.");
      }
      setParsed(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to read file.";
      setParseError(msg);
      setParsed(null);
    }
  }

  function updateLine(idx: number, patch: Partial<ParsedLine>) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      lines: parsed.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    });
  }

  function removeLine(idx: number) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      lines: parsed.lines.filter((_, i) => i !== idx),
    });
  }

  function reset() {
    setParsed(null);
    setParseError(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Compute per-line cost previews
  const preview = useMemo(() => {
    if (!parsed) return null;
    let totalCost = 0;
    let unmatchedCount = 0;
    const lineDetails = parsed.lines.map((line) => {
      const ing = ingredients?.find((i) => i.id === line.matchedIngredientId);
      if (!ing) {
        unmatchedCount++;
        return { costPerUnit: 0, lineCost: 0, ing: null };
      }
      const costPerUnit = convertCostPerUnit(
        ing.unit,
        ing.costPerUnit,
        line.unit,
      );
      const lineCost = line.quantity * costPerUnit;
      totalCost += lineCost;
      return { costPerUnit, lineCost, ing };
    });
    const costPerServing =
      parsed.servings > 0 ? totalCost / parsed.servings : 0;
    return { lineDetails, totalCost, costPerServing, unmatchedCount };
  }, [parsed, ingredients]);

  async function handleImport() {
    if (!parsed || !preview) return;
    if (!parsed.name.trim()) {
      toast({ title: "Recipe name is required", variant: "destructive" });
      return;
    }
    if (parsed.servings <= 0) {
      toast({ title: "Servings must be greater than zero", variant: "destructive" });
      return;
    }
    const matchedLines = parsed.lines.filter((l) => l.matchedIngredientId);
    if (matchedLines.length === 0) {
      toast({
        title: "No matched ingredients",
        description: "Match at least one ingredient before importing.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const recipe = await addRecipe({
        name: parsed.name.trim(),
        servings: parsed.servings,
        category: parsed.category,
        description: parsed.description.trim() || undefined,
        totalRecipeCost: preview.totalCost,
        costPerServing: preview.costPerServing,
      } as any);

      for (let i = 0; i < parsed.lines.length; i++) {
        const line = parsed.lines[i];
        const detail = preview.lineDetails[i];
        if (!detail.ing) continue; // skip unmatched
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

      toast({
        title: "Recipe imported",
        description: `${parsed.name} created with ${matchedLines.length} ingredient line(s).`,
      });
      router.push(`/recipes/${recipe.id}`);
    } catch (err) {
      console.error(err);
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Import Recipe from Excel"
        description="Upload an Excel (.xlsx) file to create a recipe."
        backHref="/recipes"
      />

      {!parsed ? (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl p-8 ambient-shadow">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3 block">
                upload_file
              </span>
              <p className="text-sm text-gray-600 font-medium mb-1">
                Upload an Excel file (.xlsx)
              </p>
              <p className="text-xs text-gray-400 mb-5">
                First row: recipe title like &quot;Rasam Recipe (10 Pax)&quot;.
                Then a header row with <code>Ingredient | Quantity | Unit</code>,
                followed by one ingredient per row.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-11 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 px-5 mx-auto"
              >
                <span className="material-symbols-outlined text-lg">folder_open</span>
                Choose File
              </button>
            </div>
            {parseError && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {parseError}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl ambient-shadow p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">description</span>
                <span className="text-sm text-gray-500 font-medium">{fileName}</span>
              </div>
              <button
                onClick={reset}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Start over
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Recipe Name
                </label>
                <Input
                  value={parsed.name}
                  onChange={(e) => setParsed({ ...parsed, name: e.target.value })}
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
                    setParsed({
                      ...parsed,
                      servings: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Category
                </label>
                <Select
                  value={parsed.category}
                  onValueChange={(v) => setParsed({ ...parsed, category: v })}
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
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Description (optional)
                </label>
                <Textarea
                  rows={2}
                  value={parsed.description}
                  onChange={(e) =>
                    setParsed({ ...parsed, description: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl ambient-shadow">
            <div className="flex items-center justify-between p-5 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ingredient Lines</h2>
                {preview && preview.unmatchedCount > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">
                    {preview.unmatchedCount} line(s) couldn&apos;t be matched. Pick an
                    ingredient or remove the row.
                  </p>
                )}
              </div>
              {preview && (
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Cost</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(preview.totalCost)}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    {formatCurrency(preview.costPerServing)} / serving
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto p-5 pt-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">From Excel</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Matched Ingredient</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[90px]">Qty</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[110px]">Unit</th>
                    <th className="text-left pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[110px]">Line Cost</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {parsed.lines.map((line, idx) => {
                    const detail = preview?.lineDetails[idx];
                    const unmatched = !detail?.ing;
                    return (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-sm text-gray-700">
                          {line.rawIngredient}
                        </td>
                        <td className="py-2">
                          <Select
                            value={line.matchedIngredientId || "__none"}
                            onValueChange={(v) =>
                              updateLine(idx, {
                                matchedIngredientId: v === "__none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger
                              className={`h-9 ${unmatched ? "border border-amber-400" : ""}`}
                            >
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">— Skip this line —</SelectItem>
                              {(ingredients ?? []).map((ing) => (
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
                              updateLine(idx, {
                                quantity: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Select
                            value={line.unit}
                            onValueChange={(v) => updateLine(idx, { unit: v })}
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
                            onClick={() => removeLine(idx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {parsed.lines.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400 font-medium">
                  All lines were removed. Start over to re-upload.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push("/recipes")}
              className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={saving || parsed.lines.length === 0}
              className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {saving ? "hourglass_empty" : "check"}
              </span>
              {saving ? "Importing..." : "Import Recipe"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

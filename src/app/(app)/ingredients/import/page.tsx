"use client";

import React, { useMemo, useRef, useState } from "react";
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
import {
  useIngredients,
  addIngredient,
  updateIngredient,
} from "@/lib/hooks/useIngredients";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  { value: "protein", label: "Protein" },
  { value: "produce", label: "Produce" },
  { value: "vegetable", label: "Vegetable" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry Goods" },
  { value: "spice", label: "Spice" },
  { value: "condiment", label: "Condiment" },
  { value: "oil-fat", label: "Oil & Fat" },
  { value: "grain-starch", label: "Grain & Starch" },
  { value: "beverage", label: "Beverage" },
  { value: "disposable", label: "Disposable" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Other" },
];

const UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
  { value: "liter", label: "liter" },
  { value: "ml", label: "ml" },
  { value: "gallon", label: "gallon" },
  { value: "each", label: "each" },
  { value: "dozen", label: "dozen" },
  { value: "case", label: "case" },
  { value: "bunch", label: "bunch" },
];

const UNIT_ALIASES: Record<string, string> = {
  g: "g", gm: "g", gms: "g", gr: "g", grm: "g", grms: "g", gram: "g", grams: "g",
  kg: "kg", kgs: "kg", kilogram: "kg", kilograms: "kg",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  ml: "ml", milliliter: "ml", milliliters: "ml",
  l: "liter", lit: "liter", liter: "liter", liters: "liter", litre: "liter", litres: "liter",
  nos: "each", no: "each", pcs: "each", pc: "each",
  each: "each", ea: "each", pkt: "each", pkts: "each", packet: "each",
  bot: "each", btl: "each", bottle: "each",
  dozen: "dozen", case: "case", bunch: "bunch",
};

function normalizeUnit(raw: string): string {
  const key = String(raw ?? "").trim().toLowerCase();
  if (!key) return "each";
  return UNIT_ALIASES[key] ?? key;
}

function titleCase(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    .trim();
}

function guessCategory(xlsCat: string, rawName: string): string {
  const c = String(xlsCat ?? "").trim().toUpperCase();
  const n = String(rawName ?? "").toLowerCase();
  if (c.includes("DAIRY")) return "dairy";
  if (c.includes("MEAT") || c.includes("FISH") || c.includes("POULTRY")) return "protein";
  if (c.includes("BEVERAGE") || c.includes("DRINK") || c.includes("TEA") || c.includes("COFFEE"))
    return "beverage";
  if (c.includes("SPICE") || c.includes("MASALA")) return "spice";
  if (c.includes("OIL") || c.includes("FAT") || c.includes("GHEE")) return "oil-fat";
  if (c.includes("GRAIN") || c.includes("RICE") || c.includes("FLOUR")) return "grain-starch";
  if (c.includes("CONDIMENT") || c.includes("SAUCE")) return "condiment";
  if (c.includes("VEGETABLE") || c.includes("PRODUCE") || c.includes("FRUIT")) return "produce";
  if (c.includes("FROZEN")) {
    if (/(sweet corn|green peas)/.test(n)) return "produce";
    return "other";
  }

  // keyword heuristics on name
  if (/milk maid|milk cream/.test(n)) return "condiment";
  if (/tea powder|coffee/.test(n)) return "beverage";
  if (/\boil\b|ghee|vanaspathi/.test(n)) return "oil-fat";
  if (
    /masala|chilli|chat|cardomum|cardamom|cloves|cumin|jeera|turmeric|pepper|coriander|cin(n)?amon|fenugric|fenugreek|sombu|ani ?seed|ajwain|asafoetida|bay leaves|musterd|mustard|star anis|jathi|jathikai|omam|kalpassi|\bsalt\b|kasoori|poppy seed|nutmug/.test(n)
  ) return "spice";
  if (
    /rice|rava|atta|maida|flour|semiya|noodles|sago|sooji|aval|idli|puttu podi|millet|ragi|parupu podi|idiyappam|bun|gulab jamun|ada pradaman/.test(n)
  ) return "grain-starch";
  if (
    /dhal|channa|karamani|peas white|mochai|meal maker|peanut|appalam|papad|vathal|dry grapes|cashew|almond|pista|melon seed|till|sugar candy|sunda|badham/.test(n)
  ) return "dry-goods";
  if (
    /sugar|jaggary|jaggery|tamarind|syrup|sauce|pickle|kitchup|ketchup|\bjam\b|vinegar|tomato puree|mayonnaise|coconut milk powder|desicatted coconut|nannari/.test(n)
  ) return "condiment";
  if (/egg|prawn|chicken|mutton|fish|beef|pork/.test(n)) return "protein";
  if (/cheese|butter|curd|paneer|yog|milk/.test(n)) return "dairy";

  return "other";
}

const FOOD_ONLY_SKIP = /^(CATERING SUPPLIES|CLEANING|HLP-? ?GAS|LAUNDRY|OFFICE|GUEST SUPPLY|COST CENTRE:)/i;

interface ParsedRow {
  id: string;
  rawName: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  costPerUnit: number;
  supplier: string;
  include: boolean;
  mode: "create" | "update" | "skip"; // when duplicate, mode defaults to "skip"
  existingId?: string;
}

type Col = "name" | "category" | "unit" | "cost" | "supplier" | "code";

function detectColumns(headerRow: string[]): Partial<Record<Col, number>> {
  const out: Partial<Record<Col, number>> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] ?? "").trim().toLowerCase();
    if (!h) continue;
    if (out.name === undefined && /(item name|ingredient|^name$|product|description)/.test(h)) out.name = i;
    if (out.category === undefined && /(category|type|group|class)/.test(h)) out.category = i;
    if (out.unit === undefined && /(^unit$|uom|measure)/.test(h)) out.unit = i;
    if (out.cost === undefined && /(cost|rate|price)/.test(h)) out.cost = i;
    if (out.supplier === undefined && /(supplier|vendor)/.test(h)) out.supplier = i;
    if (out.code === undefined && /(code|sku|id)/.test(h)) out.code = i;
  }
  return out;
}

/** Detect the HFS Store-list layout (headerless, fixed columns). */
function looksLikeStoreList(rows: unknown[][]): boolean {
  let hits = 0;
  let tried = 0;
  for (const r of rows.slice(0, 30)) {
    const txn = String(r?.[0] ?? "").trim();
    const code = String(r?.[1] ?? "").trim();
    const name = String(r?.[3] ?? "").trim();
    if (!txn && !code && !name) continue;
    tried++;
    if (/-\d{2}\/\d{2}\/\d{4}/.test(txn) && code && name) hits++;
  }
  return tried >= 2 && hits / tried > 0.5;
}

interface ParsedFile {
  id: string;
  fileName: string;
  rows: ParsedRow[];
  error?: string;
}

let idCounter = 0;

function parseWorkbook(
  wb: XLSX.WorkBook,
  existingByName: Map<string, { id: string }>,
): ParsedRow[] {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  let parsed: Array<{
    rawName: string;
    code: string;
    xlsCat: string;
    rawUnit: string;
    rate: number;
    supplier: string;
  }> = [];

  if (looksLikeStoreList(rows)) {
    for (const r of rows) {
      const code = String(r[1] ?? "").trim();
      const rawName = String(r[3] ?? "").trim();
      const cat = String(r[4] ?? "").trim();
      const unit = String(r[6] ?? "").trim();
      const rate = parseFloat(String(r[9] ?? "")) || 0;
      if (!rawName || !code) continue;
      if (FOOD_ONLY_SKIP.test(cat) || FOOD_ONLY_SKIP.test(rawName)) continue;
      parsed.push({ rawName, code, xlsCat: cat, rawUnit: unit, rate, supplier: "" });
    }
  } else {
    // generic header-based format
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const cells = (rows[i] as string[]).map((c) => String(c ?? "").trim().toLowerCase());
      if (cells.some((c) => /ingredient|item name|^name$|product/.test(c))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      throw new Error(
        "Couldn't find a header row. Include columns for Name, Category, Unit, and Cost (first row), or use the HFS Store List format.",
      );
    }
    const cols = detectColumns(rows[headerIdx] as string[]);
    if (cols.name === undefined) {
      throw new Error("Header row is missing a Name/Ingredient column.");
    }
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i] as string[];
      const rawName = String(r[cols.name] ?? "").trim();
      if (!rawName) continue;
      const xlsCat = cols.category !== undefined ? String(r[cols.category] ?? "") : "";
      const rawUnit = cols.unit !== undefined ? String(r[cols.unit] ?? "") : "";
      const rate = cols.cost !== undefined ? parseFloat(String(r[cols.cost] ?? "")) || 0 : 0;
      const supplier = cols.supplier !== undefined ? String(r[cols.supplier] ?? "").trim() : "";
      const code = cols.code !== undefined ? String(r[cols.code] ?? "").trim() : "";
      parsed.push({ rawName, code, xlsCat, rawUnit, rate, supplier });
    }
  }

  // dedupe within file by code (falling back to name); keep highest-rate non-zero row
  const byKey = new Map<string, (typeof parsed)[number]>();
  for (const p of parsed) {
    const key = (p.code || p.rawName).toLowerCase();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, p);
    } else if (p.rate > 0 && prev.rate === 0) {
      byKey.set(key, p);
    } else if (p.rate > prev.rate) {
      byKey.set(key, p);
    }
  }

  const out: ParsedRow[] = [];
  for (const p of byKey.values()) {
    const niceName = titleCase(p.rawName);
    const existing = existingByName.get(niceName.toLowerCase());
    out.push({
      id: `row-${++idCounter}`,
      rawName: p.rawName,
      code: p.code,
      name: niceName,
      category: guessCategory(p.xlsCat, p.rawName),
      unit: normalizeUnit(p.rawUnit),
      costPerUnit: Math.round(p.rate * 100) / 100,
      supplier: p.supplier,
      include: true,
      mode: existing ? "skip" : "create",
      existingId: existing?.id,
    });
  }
  return out;
}

export default function ImportIngredientsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: ingredients } = useIngredients();
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const existingByName = useMemo(() => {
    const m = new Map<string, { id: string }>();
    for (const ing of ingredients ?? []) m.set(ing.name.toLowerCase(), { id: ing.id });
    return m;
  }, [ingredients]);

  async function handleFiles(fl: FileList | null) {
    if (!fl || fl.length === 0) return;
    const parsed: ParsedFile[] = [];
    for (const file of Array.from(fl)) {
      const id = `file-${++idCounter}`;
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const rows = parseWorkbook(wb, existingByName);
        parsed.push({ id, fileName: file.name, rows });
      } catch (err) {
        parsed.push({
          id,
          fileName: file.name,
          rows: [],
          error: err instanceof Error ? err.message : "Failed to read file.",
        });
      }
    }
    setFiles((prev) => [...prev, ...parsed]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateRow(fileId: string, rowId: string, patch: Partial<ParsedRow>) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, rows: f.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }
          : f,
      ),
    );
  }

  function removeRow(fileId: string, rowId: string) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, rows: f.rows.filter((r) => r.id !== rowId) } : f,
      ),
    );
  }

  function removeFile(fileId: string) {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  function bulkMode(fileId: string, mode: ParsedRow["mode"]) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              rows: f.rows.map((r) =>
                r.existingId ? { ...r, mode } : r,
              ),
            }
          : f,
      ),
    );
  }

  const allRows = useMemo(() => files.flatMap((f) => f.rows), [files]);
  const toCreate = allRows.filter((r) => r.include && r.mode === "create").length;
  const toUpdate = allRows.filter((r) => r.include && r.mode === "update").length;
  const totalActionable = toCreate + toUpdate;

  async function handleImport() {
    if (totalActionable === 0) return;
    const actionable = allRows.filter(
      (r) => r.include && (r.mode === "create" || r.mode === "update"),
    );
    const invalid = actionable.filter(
      (r) => !r.name.trim() || !r.category || !r.unit,
    );
    if (invalid.length > 0) {
      toast({
        title: "Fix required fields",
        description: `${invalid.length} row(s) are missing name, category, or unit.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setProgress({ done: 0, total: actionable.length });
    let ok = 0;
    let failed = 0;

    for (const row of actionable) {
      try {
        if (row.mode === "update" && row.existingId) {
          await updateIngredient(row.existingId, {
            name: row.name.trim(),
            category: row.category,
            unit: row.unit,
            costPerUnit: row.costPerUnit || 0,
            supplier: row.supplier.trim(),
          });
        } else {
          await addIngredient({
            name: row.name.trim(),
            category: row.category,
            unit: row.unit,
            costPerUnit: row.costPerUnit || 0,
            supplier: row.supplier.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        ok++;
      } catch {
        failed++;
      }
      setProgress({ done: ok + failed, total: actionable.length });
    }

    setSaving(false);

    if (ok === 0) {
      toast({
        title: "Nothing imported",
        description: "All rows failed — check your data and try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: `Imported ${ok} ingredient${ok === 1 ? "" : "s"}`,
      description: failed > 0 ? `${failed} row(s) failed.` : undefined,
    });
    router.push("/ingredients");
  }

  const hasAnyRows = files.some((f) => f.rows.length > 0);

  return (
    <div>
      <PageHeader
        title="Import Ingredients from Excel"
        description="Upload a spreadsheet and bulk-add or update ingredients."
        backHref="/ingredients"
      />

      {/* Upload zone */}
      <div className="bg-white rounded-2xl p-6 ambient-shadow mb-6">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
            upload_file
          </span>
          <p className="text-sm text-gray-600 font-medium mb-1">
            Drop Excel files here or click to choose
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Expected columns (any order): <code>Name · Category · Unit · Cost · Supplier</code>.
            The HFS Store List format is detected automatically. Duplicates (by name) default to
            <span className="font-bold"> Skip</span>.
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
            {files.length === 0 ? "Choose File" : "Add More Files"}
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-4 px-1 flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-gray-500">
                {allRows.length} row{allRows.length === 1 ? "" : "s"}
              </span>
              {toCreate > 0 && (
                <span className="text-green-600">{toCreate} new</span>
              )}
              {toUpdate > 0 && (
                <span className="text-blue-700">{toUpdate} will update</span>
              )}
              {allRows.filter((r) => r.include && r.mode === "skip").length > 0 && (
                <span className="text-gray-400">
                  {allRows.filter((r) => r.include && r.mode === "skip").length} skipped
                </span>
              )}
            </div>
            <button
              onClick={() => setFiles([])}
              disabled={saving}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Clear all
            </button>
          </div>

          {/* Per-file tables */}
          <div className="space-y-4">
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                disabled={saving}
                onRemoveFile={() => removeFile(f.id)}
                onUpdateRow={(rid, patch) => updateRow(f.id, rid, patch)}
                onRemoveRow={(rid) => removeRow(f.id, rid)}
                onBulkMode={(m) => bulkMode(f.id, m)}
              />
            ))}
          </div>

          {/* Action buttons */}
          {hasAnyRows && (
            <div className="flex justify-end gap-3 mt-6 items-center">
              {saving && (
                <span className="text-sm text-gray-500 font-medium">
                  {progress.done}/{progress.total} processed…
                </span>
              )}
              <button
                onClick={() => router.push("/ingredients")}
                disabled={saving}
                className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={saving || totalActionable === 0}
                className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  {saving ? "hourglass_empty" : "check"}
                </span>
                {saving
                  ? "Importing..."
                  : totalActionable === 0
                    ? "Nothing to import"
                    : `Import ${totalActionable} ingredient${totalActionable === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FileCard({
  file,
  disabled,
  onRemoveFile,
  onUpdateRow,
  onRemoveRow,
  onBulkMode,
}: {
  file: ParsedFile;
  disabled: boolean;
  onRemoveFile: () => void;
  onUpdateRow: (rowId: string, patch: Partial<ParsedRow>) => void;
  onRemoveRow: (rowId: string) => void;
  onBulkMode: (mode: ParsedRow["mode"]) => void;
}) {
  const duplicateCount = file.rows.filter((r) => r.existingId).length;

  if (file.error) {
    return (
      <div className="bg-white rounded-2xl ambient-shadow overflow-hidden border-l-4 border-red-500">
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-red-500">error</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{file.fileName}</p>
              <p className="text-xs text-red-600">{file.error}</p>
            </div>
          </div>
          <button
            onClick={onRemoveFile}
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ambient-shadow overflow-hidden border-l-4 border-slate-200">
      <div className="flex items-center justify-between p-5 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-blue-700">description</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{file.fileName}</p>
            <p className="text-xs text-gray-400">
              {file.rows.length} row{file.rows.length === 1 ? "" : "s"}
              {duplicateCount > 0 && (
                <span className="text-amber-600 font-semibold">
                  {" "}
                  · {duplicateCount} already exist
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {duplicateCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-bold">Duplicates:</span>
              <button
                onClick={() => onBulkMode("skip")}
                disabled={disabled}
                className="px-2 py-1 rounded-md border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-50"
              >
                Skip all
              </button>
              <button
                onClick={() => onBulkMode("update")}
                disabled={disabled}
                className="px-2 py-1 rounded-md border border-blue-200 text-blue-700 font-bold hover:bg-blue-50 disabled:opacity-50"
              >
                Update all
              </button>
            </div>
          )}
          <button
            onClick={onRemoveFile}
            disabled={disabled}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>

      {file.rows.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-4 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">From Excel</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Name</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[150px]">Category</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[110px]">Unit</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[110px]">Cost</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[130px]">Supplier</th>
                  <th className="text-left px-2 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest w-[120px]">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {file.rows.map((row) => {
                  const duplicate = !!row.existingId;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-50 last:border-0 ${
                        row.mode === "skip" ? "opacity-50" : ""
                      }`}
                    >
                      <td className="py-2 px-4 text-xs text-gray-500 align-top">
                        {row.rawName}
                        {row.code && (
                          <div className="text-[10px] text-gray-300 mt-0.5">{row.code}</div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={row.name}
                          onChange={(e) => onUpdateRow(row.id, { name: e.target.value })}
                          disabled={disabled}
                          className="h-9 text-sm"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          value={row.category}
                          onValueChange={(v) => onUpdateRow(row.id, { category: v })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          value={row.unit}
                          onValueChange={(v) => onUpdateRow(row.id, { unit: v })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={row.costPerUnit}
                          onChange={(e) =>
                            onUpdateRow(row.id, {
                              costPerUnit: Number(e.target.value) || 0,
                            })
                          }
                          disabled={disabled}
                          className="h-9 text-sm"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={row.supplier}
                          onChange={(e) =>
                            onUpdateRow(row.id, { supplier: e.target.value })
                          }
                          disabled={disabled}
                          className="h-9 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-2 px-2">
                        {duplicate ? (
                          <Select
                            value={row.mode}
                            onValueChange={(v) =>
                              onUpdateRow(row.id, { mode: v as ParsedRow["mode"] })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip (exists)</SelectItem>
                              <SelectItem value="update">Update existing</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                            NEW
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => onRemoveRow(row.id)}
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
          {duplicateCount > 0 && (
            <p className="px-5 py-3 text-xs text-amber-600 font-medium border-t border-gray-100">
              {duplicateCount} row{duplicateCount === 1 ? "" : "s"} match an existing
              ingredient by name. By default they&apos;re skipped — switch to
              &quot;Update existing&quot; to overwrite the cost/unit/category/supplier.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

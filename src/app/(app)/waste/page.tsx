"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useWasteLog, addWasteEntry } from "@/lib/hooks/useWaste";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { formatCurrency } from "@/lib/utils";

// --- Normal mode constants ---

const REASON_OPTIONS = [
  { value: "spoilage", label: "Spoilage", icon: "water_drop", color: "bg-red-50 text-red-700 border-red-200", activeColor: "bg-red-600 text-white border-red-600" },
  { value: "accident", label: "Accident", icon: "error", color: "bg-orange-50 text-orange-700 border-orange-200", activeColor: "bg-orange-600 text-white border-orange-600" },
  { value: "prep-loss", label: "Prep Loss", icon: "restaurant", color: "bg-yellow-50 text-yellow-700 border-yellow-200", activeColor: "bg-yellow-600 text-white border-yellow-600" },
  { value: "other", label: "Other", icon: "help", color: "bg-gray-50 text-gray-700 border-gray-200", activeColor: "bg-gray-600 text-white border-gray-600" },
];

const REASON_BADGE_VARIANT: Record<string, string> = {
  spoilage: "bg-red-100 text-red-700",
  accident: "bg-orange-100 text-orange-700",
  "prep-loss": "bg-yellow-100 text-yellow-700",
  overproduction: "bg-purple-100 text-purple-700",
  expired: "bg-rose-100 text-rose-700",
  "dropped-burned": "bg-orange-100 text-orange-700",
  "trim-prep": "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-700",
};

// --- Kiosk mode constants ---

const KIOSK_CATEGORIES = [
  { value: "overproduction", label: "Overproduction", icon: "inventory_2", color: "from-purple-500 to-purple-700" },
  { value: "spoilage", label: "Spoilage", icon: "water_drop", color: "from-red-500 to-red-700" },
  { value: "expired", label: "Expired", icon: "event_busy", color: "from-rose-500 to-rose-700" },
  { value: "dropped-burned", label: "Dropped / Burned", icon: "local_fire_department", color: "from-orange-500 to-orange-700" },
  { value: "trim-prep", label: "Trim / Prep", icon: "content_cut", color: "from-yellow-500 to-yellow-600" },
  { value: "other", label: "Other", icon: "help_outline", color: "from-gray-500 to-gray-700" },
];

const NUM_PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

function getReasonLabel(reason: string): string {
  const option = [...REASON_OPTIONS, ...KIOSK_CATEGORIES].find((r) => r.value === reason);
  return option?.label ?? reason;
}

function formatDate(date: Date | { toDate?: () => Date }): string {
  const d = typeof (date as any)?.toDate === "function" ? (date as any).toDate() : new Date(date as any);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Kiosk sub-components ---

type KioskStep = "category" | "ingredient" | "weight" | "confirm";

function KioskCategoryPicker({ onSelect }: { onSelect: (cat: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
      {KIOSK_CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${cat.color} text-white shadow-lg active:scale-95 transition-transform duration-150 cursor-pointer`}
          style={{ minHeight: 110 }}
        >
          <span className="material-symbols-outlined text-4xl">{cat.icon}</span>
          <span className="text-base font-bold">{cat.label}</span>
        </button>
      ))}
    </div>
  );
}

function KioskIngredientPicker({
  ingredients,
  onSelect,
  onBack,
}: {
  ingredients: { id: string; name: string }[];
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [ingredients, search]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 text-sm font-semibold hover:text-gray-600 transition-colors">
        <span className="material-symbols-outlined text-lg">arrow_back</span> Back
      </button>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
        <input
          autoFocus
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pb-2">
        {filtered.map((ing) => (
          <button
            key={ing.id}
            onClick={() => onSelect(ing.id)}
            className="flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-900 font-semibold text-sm px-3 active:scale-95 transition-all duration-150 cursor-pointer"
            style={{ minHeight: 64 }}
          >
            {ing.name}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-8">No ingredients found.</p>
        )}
      </div>
    </div>
  );
}

function KioskWeightInput({
  value,
  unit,
  costPerUnit,
  ingredientName,
  onValueChange,
  onUnitChange,
  onConfirm,
  onBack,
}: {
  value: string;
  unit: string;
  costPerUnit: number;
  ingredientName: string;
  onValueChange: (v: string) => void;
  onUnitChange: (u: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const units = ["lb", "oz", "kg"];
  const numericValue = parseFloat(value) || 0;
  const estimatedCost = numericValue * costPerUnit;

  function handleKey(key: string) {
    if (key === "backspace") {
      onValueChange(value.slice(0, -1));
    } else if (key === ".") {
      if (!value.includes(".")) onValueChange(value + ".");
    } else {
      onValueChange(value + key);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 text-sm font-semibold hover:text-gray-600 transition-colors">
        <span className="material-symbols-outlined text-lg">arrow_back</span> Back
      </button>

      <p className="text-center text-gray-500 text-sm font-semibold uppercase tracking-wider">{ingredientName}</p>

      {/* Display */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-center" style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}>
        <span className="text-5xl font-extrabold text-gray-900 font-mono">{value || "0"}</span>
        <span className="text-2xl font-bold text-gray-400 ml-2">{unit}</span>
      </div>

      {/* Unit toggle */}
      <div className="flex gap-2 justify-center">
        {units.map((u) => (
          <button
            key={u}
            onClick={() => onUnitChange(u)}
            className={`h-11 px-5 rounded-xl text-sm font-bold transition-all duration-150 ${
              unit === u
                ? "bg-blue-700 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {NUM_PAD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className={`flex items-center justify-center rounded-xl text-xl font-bold active:scale-95 transition-transform duration-100 cursor-pointer ${
              key === "backspace"
                ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                : "bg-white border-2 border-gray-200 text-gray-900 hover:bg-gray-50"
            }`}
            style={{ minHeight: 56 }}
          >
            {key === "backspace" ? (
              <span className="material-symbols-outlined text-2xl">backspace</span>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      {/* Cost impact */}
      {numericValue > 0 && (
        <div className="text-center">
          <p className="text-3xl font-extrabold text-red-600">
            That&apos;s {formatCurrency(estimatedCost)} of waste
          </p>
        </div>
      )}

      {/* Confirm */}
      <button
        onClick={onConfirm}
        disabled={numericValue <= 0}
        className="w-full h-16 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 text-white text-xl font-extrabold shadow-lg active:scale-95 transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-3xl">check_circle</span>
        Log Waste
      </button>
    </div>
  );
}

function KioskSuccess({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
        <span className="material-symbols-outlined text-green-600 text-5xl">check</span>
      </div>
      <p className="text-2xl font-extrabold text-green-700">Waste Logged!</p>
    </div>
  );
}

// --- Main Component ---

export default function WastePage() {
  const { data: wasteEntries, loading: wasteLoading } = useWasteLog();
  const { data: ingredients, loading: ingredientsLoading } = useIngredients();
  const { toast } = useToast();

  // Normal mode state
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Kiosk mode state
  const [kioskMode, setKioskMode] = useState(false);
  const [kioskStep, setKioskStep] = useState<KioskStep>("category");
  const [kioskCategory, setKioskCategory] = useState("");
  const [kioskIngredientId, setKioskIngredientId] = useState("");
  const [kioskWeight, setKioskWeight] = useState("");
  const [kioskUnit, setKioskUnit] = useState("lb");
  const [kioskShowSuccess, setKioskShowSuccess] = useState(false);
  const [shiftTotal, setShiftTotal] = useState(0);

  const selectedIngredient = useMemo(
    () => ingredients.find((ing) => ing.id === selectedIngredientId),
    [ingredients, selectedIngredientId]
  );

  const kioskIngredient = useMemo(
    () => ingredients.find((ing) => ing.id === kioskIngredientId),
    [ingredients, kioskIngredientId]
  );

  const estimatedCost = useMemo(() => {
    if (!selectedIngredient || !quantity) return 0;
    return parseFloat(quantity) * selectedIngredient.costPerUnit;
  }, [selectedIngredient, quantity]);

  const weeklyWaste = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return wasteEntries
      .filter((entry) => {
        const d = typeof (entry.date as any)?.toDate === "function"
          ? (entry.date as any).toDate()
          : new Date(entry.date as any);
        return d >= startOfWeek;
      })
      .reduce((sum, e) => sum + (e.totalCost || 0), 0);
  }, [wasteEntries]);

  const monthlyWaste = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return wasteEntries
      .filter((entry) => {
        const d = typeof (entry.date as any)?.toDate === "function"
          ? (entry.date as any).toDate()
          : new Date(entry.date as any);
        return d >= startOfMonth;
      })
      .reduce((sum, e) => sum + (e.totalCost || 0), 0);
  }, [wasteEntries]);

  const topReason = useMemo(() => {
    if (wasteEntries.length === 0) return "N/A";
    const counts: Record<string, number> = {};
    wasteEntries.forEach((entry) => {
      counts[entry.reason] = (counts[entry.reason] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return getReasonLabel(sorted[0][0]);
  }, [wasteEntries]);

  function handleIngredientChange(ingredientId: string) {
    setSelectedIngredientId(ingredientId);
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (ing) {
      setUnit(ing.unit);
    }
  }

  function resetForm() {
    setSelectedIngredientId("");
    setQuantity("");
    setUnit("");
    setReason("");
    setNotes("");
  }

  function resetKiosk() {
    setKioskStep("category");
    setKioskCategory("");
    setKioskIngredientId("");
    setKioskWeight("");
    setKioskUnit("lb");
    setKioskShowSuccess(false);
  }

  const handleKioskSuccess = useCallback(() => {
    setKioskShowSuccess(false);
    setKioskStep("category");
    setKioskCategory("");
    setKioskIngredientId("");
    setKioskWeight("");
    setKioskUnit("lb");
  }, []);

  async function handleKioskConfirm() {
    if (!kioskIngredient || !kioskWeight) return;
    const qty = parseFloat(kioskWeight);
    if (isNaN(qty) || qty <= 0) return;

    const cost = qty * kioskIngredient.costPerUnit;

    try {
      await addWasteEntry({
        ingredientId: kioskIngredientId,
        ingredientName: kioskIngredient.name,
        quantity: qty,
        unit: kioskUnit,
        costPerUnit: kioskIngredient.costPerUnit,
        totalCost: cost,
        reason: kioskCategory,
        date: new Date(),
      });
      setShiftTotal((prev) => prev + cost);
      setKioskShowSuccess(true);
    } catch {
      toast({
        title: "Error",
        description: "Failed to log waste entry.",
        variant: "destructive",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedIngredientId || !quantity || !reason) {
      toast({
        title: "Missing fields",
        description: "Please select an ingredient, enter a quantity, and choose a reason.",
        variant: "destructive",
      });
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await addWasteEntry({
        ingredientId: selectedIngredientId,
        ingredientName: selectedIngredient?.name || "",
        quantity: qty,
        unit,
        costPerUnit: selectedIngredient?.costPerUnit || 0,
        totalCost: estimatedCost,
        reason,
        date: new Date(),
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Waste logged",
        description: `${qty} ${unit} of ${selectedIngredient?.name} recorded.`,
      });

      resetForm();
      setShowLogDialog(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to log waste entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (wasteLoading || ingredientsLoading) return <LoadingScreen />;

  // --- Kiosk Mode ---
  if (kioskMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col overflow-hidden">
        {/* Kiosk Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 text-2xl">delete_sweep</span>
            <h1 className="text-xl font-extrabold text-gray-900">Waste Kiosk</h1>
          </div>
          <button
            onClick={() => { setKioskMode(false); resetKiosk(); }}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            Exit Kiosk
          </button>
        </div>

        {/* Kiosk Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {kioskShowSuccess ? (
            <KioskSuccess onDone={handleKioskSuccess} />
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {(["category", "ingredient", "weight"] as KioskStep[]).map((step, idx) => (
                  <React.Fragment key={step}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      kioskStep === step ? "bg-blue-700 text-white" :
                      (["category", "ingredient", "weight"].indexOf(kioskStep) > idx ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500")
                    }`}>
                      {["category", "ingredient", "weight"].indexOf(kioskStep) > idx ? (
                        <span className="material-symbols-outlined text-base">check</span>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    {idx < 2 && <div className="w-10 h-0.5 bg-gray-200 rounded" />}
                  </React.Fragment>
                ))}
              </div>

              {kioskStep === "category" && (
                <div>
                  <p className="text-center text-lg font-bold text-gray-700 mb-5">What type of waste?</p>
                  <KioskCategoryPicker
                    onSelect={(cat) => {
                      setKioskCategory(cat);
                      setKioskStep("ingredient");
                    }}
                  />
                </div>
              )}

              {kioskStep === "ingredient" && (
                <div>
                  <p className="text-center text-lg font-bold text-gray-700 mb-5">Which ingredient?</p>
                  <KioskIngredientPicker
                    ingredients={ingredients.map((i) => ({ id: i.id, name: i.name }))}
                    onSelect={(id) => {
                      setKioskIngredientId(id);
                      const ing = ingredients.find((i) => i.id === id);
                      if (ing) setKioskUnit(ing.unit);
                      setKioskStep("weight");
                    }}
                    onBack={() => setKioskStep("category")}
                  />
                </div>
              )}

              {kioskStep === "weight" && kioskIngredient && (
                <div>
                  <p className="text-center text-lg font-bold text-gray-700 mb-5">How much?</p>
                  <KioskWeightInput
                    value={kioskWeight}
                    unit={kioskUnit}
                    costPerUnit={kioskIngredient.costPerUnit}
                    ingredientName={kioskIngredient.name}
                    onValueChange={setKioskWeight}
                    onUnitChange={setKioskUnit}
                    onConfirm={handleKioskConfirm}
                    onBack={() => setKioskStep("ingredient")}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Shift total */}
        <div className="px-5 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Shift Total</span>
            <span className="text-2xl font-extrabold text-red-600">{formatCurrency(shiftTotal)}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal Mode ---
  return (
    <div>
      <PageHeader
        title="Waste Log"
        description="Track and reduce food waste"
        action={{
          label: "Log Waste",
          onClick: () => setShowLogDialog(true),
          icon: "add",
        }}
      />

      {/* Kiosk Mode Toggle */}
      <div className="mb-6">
        <button
          onClick={() => { setKioskMode(true); resetKiosk(); }}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold shadow-sm hover:shadow-md active:scale-95 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-lg">tablet</span>
          Kiosk Mode
        </button>
      </div>

      {wasteEntries.length > 0 ? (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600 text-xl">trending_down</span>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Weekly Waste</p>
                  <p className="text-2xl font-extrabold text-red-600">{formatCurrency(weeklyWaste)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600 text-xl">calendar_month</span>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Monthly Waste</p>
                  <p className="text-2xl font-extrabold text-red-600">{formatCurrency(monthlyWaste)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600 text-xl">info</span>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Top Reason</p>
                  <p className="text-2xl font-extrabold text-gray-900">{topReason}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Waste Entries Table */}
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Waste Log</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Date</th>
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Ingredient</th>
                  <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Quantity</th>
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Reason</th>
                  <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Cost</th>
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {wasteEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                      {entry.ingredientName}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 text-right">
                      {entry.quantity} <span className="text-gray-400">{entry.unit}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${REASON_BADGE_VARIANT[entry.reason] || "bg-gray-100 text-gray-700"}`}>
                        {getReasonLabel(entry.reason)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold text-red-600">
                      {formatCurrency(entry.totalCost)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell max-w-[200px] truncate">
                      {entry.notes || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState
          icon="delete_sweep"
          title="No waste entries yet"
          description="Start logging waste to track costs and identify reduction opportunities."
          action={{
            label: "Log Waste",
            onClick: () => setShowLogDialog(true),
          }}
        />
      )}

      {/* Log Waste Dialog */}
      <Dialog open={showLogDialog} onOpenChange={(open) => { setShowLogDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Log Waste Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Ingredient Select */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ingredient</Label>
              <Select
                value={selectedIngredientId}
                onValueChange={handleIngredientChange}
              >
                <SelectTrigger className="h-11 bg-gray-50 rounded-lg border-gray-200">
                  <SelectValue placeholder="Select an ingredient..." />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({formatCurrency(ing.costPerUnit)}/{ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Quantity</Label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Unit</Label>
                <input
                  placeholder="e.g. lb, oz, ea"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Reason Pill Buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REASON_OPTIONS.map((opt) => {
                  const isActive = reason === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReason(opt.value)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-150 cursor-pointer text-xs font-bold ${isActive ? opt.activeColor : opt.color}`}
                    >
                      <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes (optional)</Label>
              <textarea
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
              />
            </div>

            {/* Estimated Cost */}
            {selectedIngredient && quantity && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-red-700 tracking-wider">Estimated Cost</span>
                <span className="text-2xl font-extrabold text-red-700">{formatCurrency(estimatedCost)}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowLogDialog(false); resetForm(); }}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Logging..." : "Log Waste Entry"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

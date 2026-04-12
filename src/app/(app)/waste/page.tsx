"use client";

import React, { useState, useMemo } from "react";
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
  other: "bg-gray-100 text-gray-700",
};

function getReasonLabel(reason: string): string {
  const option = REASON_OPTIONS.find((r) => r.value === reason);
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

export default function WastePage() {
  const { data: wasteEntries, loading: wasteLoading } = useWasteLog();
  const { data: ingredients, loading: ingredientsLoading } = useIngredients();
  const { toast } = useToast();

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedIngredient = useMemo(
    () => ingredients.find((ing) => ing.id === selectedIngredientId),
    [ingredients, selectedIngredientId]
  );

  const estimatedCost = useMemo(() => {
    if (!selectedIngredient || !quantity) return 0;
    return parseFloat(quantity) * selectedIngredient.costPerUnit;
  }, [selectedIngredient, quantity]);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const weeklyWaste = useMemo(() => {
    return wasteEntries
      .filter((entry) => {
        const d = typeof (entry.date as any)?.toDate === "function"
          ? (entry.date as any).toDate()
          : new Date(entry.date as any);
        return d >= startOfWeek;
      })
      .reduce((sum, e) => sum + (e.totalCost || 0), 0);
  }, [wasteEntries, startOfWeek]);

  const monthlyWaste = useMemo(() => {
    return wasteEntries
      .filter((entry) => {
        const d = typeof (entry.date as any)?.toDate === "function"
          ? (entry.date as any).toDate()
          : new Date(entry.date as any);
        return d >= startOfMonth;
      })
      .reduce((sum, e) => sum + (e.totalCost || 0), 0);
  }, [wasteEntries, startOfMonth]);

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
    } catch (err) {
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

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
import {
  useInventory,
  adjustInventory,
  type InventoryItem,
} from "@/lib/hooks/useInventory";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

const ADJUSTMENT_REASONS = [
  { value: "restock", label: "Restock" },
  { value: "waste", label: "Waste" },
  { value: "use", label: "Use / Consumption" },
  { value: "adjustment", label: "Manual Adjustment" },
];

function formatDate(date: Date | any): string {
  if (!date) return "\u2014";
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpiringSoon(expiryDate?: Date | any): boolean {
  if (!expiryDate) return false;
  const d =
    expiryDate instanceof Date
      ? expiryDate
      : expiryDate.toDate?.() ?? new Date(expiryDate);
  const now = new Date();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return d.getTime() - now.getTime() < threeDays && d.getTime() > now.getTime();
}

function isExpired(expiryDate?: Date | any): boolean {
  if (!expiryDate) return false;
  const d =
    expiryDate instanceof Date
      ? expiryDate
      : expiryDate.toDate?.() ?? new Date(expiryDate);
  return d.getTime() < Date.now();
}

export default function InventoryPage() {
  const { data: inventory, loading } = useInventory();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    if (!search) return inventory;
    return inventory.filter((item) =>
      item.ingredientName.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventory, search]);

  const summaryStats = useMemo(() => {
    if (!inventory) return { total: 0, lowStock: 0, totalValue: 0 };
    return {
      total: inventory.length,
      lowStock: inventory.filter(
        (item) => item.currentQuantity < item.reorderPoint
      ).length,
      totalValue: inventory.reduce(
        (sum, item) => sum + (item.currentQuantity * (item.costPerUnit || 0)),
        0
      ),
    };
  }, [inventory]);

  function openAdjustDialog(item: InventoryItem) {
    setSelectedItem(item);
    setAdjustmentQty("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setAdjustDialogOpen(true);
  }

  async function handleAdjust() {
    if (!selectedItem || !adjustmentQty || !adjustmentReason) return;
    setAdjusting(true);

    const qty = Number(adjustmentQty);
    const finalQty =
      adjustmentReason === "waste" || adjustmentReason === "use"
        ? -Math.abs(qty)
        : Math.abs(qty);

    try {
      await adjustInventory(
        selectedItem.id,
        finalQty,
        adjustmentReason as "restock" | "waste" | "use" | "adjustment",
        adjustmentNotes || undefined
      );
      setAdjustDialogOpen(false);
      toast({
        title: "Inventory adjusted",
        description: `${selectedItem.ingredientName} updated by ${finalQty > 0 ? "+" : ""}${finalQty} ${selectedItem.unit}.`,
      });
    } catch (err) {
      console.error("Failed to adjust inventory:", err);
      toast({
        title: "Error",
        description: "Failed to adjust inventory.",
        variant: "destructive",
      });
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track on-hand stock levels"
        action={{
          label: "Update Stock",
          onClick: () => {
            if (filtered.length > 0) openAdjustDialog(filtered[0]);
          },
          icon: "add",
        }}
      />

      {inventory && inventory.length > 0 ? (
        <>
          {/* Stat Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-xl">inventory_2</span>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Total Items</p>
                  <p className="text-2xl font-extrabold text-gray-900">{summaryStats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600 text-xl">warning</span>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Low Stock Alerts</p>
                  <p className="text-2xl font-extrabold text-gray-900">{summaryStats.lowStock}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl ambient-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-xl">payments</span>
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Total Value</p>
                  <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(summaryStats.totalValue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                placeholder="Search ingredients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-medium">
              No items match your search.
            </div>
          ) : (
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Item</th>
                    <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">Category</th>
                    <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">On Hand</th>
                    <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">Unit</th>
                    <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">Reorder Point</th>
                    <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Status</th>
                    <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const isLow = item.currentQuantity < item.reorderPoint;
                    const outOfStock = item.currentQuantity <= 0;
                    const expiring = isExpiringSoon(item.expiryDate);
                    const expired = isExpired(item.expiryDate);

                    let statusLabel = "In Stock";
                    let statusStyle = "bg-green-100 text-green-700";
                    if (outOfStock) {
                      statusLabel = "Out of Stock";
                      statusStyle = "bg-red-100 text-red-700";
                    } else if (isLow) {
                      statusLabel = "Low Stock";
                      statusStyle = "bg-amber-100 text-amber-700";
                    }

                    return (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-gray-900">{item.ingredientName}</p>
                          {item.location && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.location}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">
                          {(item as any).category || "\u2014"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm text-gray-900 font-semibold">
                          {item.currentQuantity}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">
                          {item.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-gray-500 hidden md:table-cell">
                          {item.reorderPoint}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold w-fit ${statusStyle}`}>
                              {statusLabel}
                            </span>
                            {expired && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700 w-fit">
                                Expired
                              </span>
                            )}
                            {expiring && !expired && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 w-fit">
                                Expiring
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openAdjustDialog(item)}
                            className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="inventory_2"
          title="No inventory items"
          description="Inventory items will appear here once ingredients are added and stock is tracked."
        />
      )}

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Adjust Inventory \u2014 {selectedItem?.ingredientName}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm text-gray-500">
                  Current quantity:{" "}
                  <span className="font-bold text-gray-900">
                    {selectedItem.currentQuantity} {selectedItem.unit}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Adjustment Quantity</Label>
                <input
                  type="number"
                  step="any"
                  placeholder="Enter quantity"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                <p className="text-xs text-gray-400">
                  For waste or use, enter a positive number. It will be automatically subtracted.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason</Label>
                <Select
                  value={adjustmentReason}
                  onValueChange={setAdjustmentReason}
                >
                  <SelectTrigger className="bg-gray-50 rounded-lg border-gray-200">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes (optional)</Label>
                <input
                  placeholder="e.g. Damaged packaging, physical count correction"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAdjustDialogOpen(false)}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={!adjustmentQty || !adjustmentReason || adjusting}
                  className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adjusting ? "Saving..." : "Save Adjustment"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

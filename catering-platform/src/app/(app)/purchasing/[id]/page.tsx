"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { useDocument, useCollection } from "@/lib/hooks/useFirestore";
import { updateDocument, addDocument } from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { PurchaseOrder, POLine, POStatus } from "@/lib/types/purchaseOrder";

const statusBadgeStyles: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  "partially-received": "bg-amber-100 text-amber-700",
  "fully-received": "bg-green-100 text-green-700",
};

const statusLabels: Record<POStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  "partially-received": "Partially Received",
  "fully-received": "Fully Received",
};

const nextStatusMap: Record<POStatus, POStatus | null> = {
  draft: "sent",
  sent: "partially-received",
  "partially-received": "fully-received",
  "fully-received": null,
};

const nextStatusLabels: Record<POStatus, string> = {
  draft: "Mark as Sent",
  sent: "Start Receiving",
  "partially-received": "Mark Fully Received",
  "fully-received": "",
};

const nextStatusIcons: Record<POStatus, string> = {
  draft: "local_shipping",
  sent: "shopping_cart",
  "partially-received": "check_circle",
  "fully-received": "",
};

const qualityOptions = [
  { value: "good", label: "Good" },
  { value: "acceptable", label: "Acceptable" },
  { value: "poor", label: "Poor" },
  { value: "rejected", label: "Rejected" },
];

const qualityBadgeStyles: Record<string, string> = {
  good: "bg-green-100 text-green-700",
  acceptable: "bg-yellow-100 text-yellow-700",
  poor: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(date: Date | any): string {
  if (!date) return "\u2014";
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ReceivingData {
  [lineId: string]: {
    actualQuantityReceived: number | string;
    actualCostPerPack: number | string;
    qualityFlag: string;
    receivingNotes: string;
  };
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const { data: po, loading: poLoading } = useDocument<PurchaseOrder>(
    "purchaseOrders",
    id
  );
  const { data: lines, loading: linesLoading } = useCollection<POLine>(
    `purchaseOrders/${id}/lines`,
    orderBy("ingredientName")
  );

  const [receivingData, setReceivingData] = useState<ReceivingData>({});
  const [saving, setSaving] = useState(false);
  const [showAddLineDialog, setShowAddLineDialog] = useState(false);
  const [newLine, setNewLine] = useState({
    ingredientName: "",
    quantityNeeded: "",
    quantityNeededUnit: "",
    packSize: "",
    packsToOrder: "",
    expectedCostPerPack: "",
  });

  const isReceiving =
    po?.status === "sent" || po?.status === "partially-received";

  function getReceivingValue(
    lineId: string,
    field: keyof ReceivingData[string],
    fallback: any
  ) {
    if (receivingData[lineId]?.[field] !== undefined) {
      return receivingData[lineId][field];
    }
    return fallback ?? "";
  }

  function updateReceivingField(
    lineId: string,
    field: keyof ReceivingData[string],
    value: any
  ) {
    setReceivingData((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [field]: value,
      },
    }));
  }

  const summaryData = useMemo(() => {
    if (!lines) return { estimated: 0, actual: 0 };
    const estimated = lines.reduce(
      (sum, l) => sum + (l.expectedTotalCost || 0),
      0
    );
    const actual = lines.reduce(
      (sum, l) => sum + (l.actualTotalCost || 0),
      0
    );
    return { estimated, actual };
  }, [lines]);

  async function handleAdvanceStatus() {
    if (!po) return;
    const nextStatus = nextStatusMap[po.status];
    if (!nextStatus) return;
    try {
      await updateDocument<PurchaseOrder>("purchaseOrders", id, {
        status: nextStatus,
        updatedAt: new Date(),
      });
      toast({
        title: "Status updated",
        description: `PO status changed to ${statusLabels[nextStatus]}.`,
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      toast({
        title: "Error",
        description: "Failed to update PO status.",
        variant: "destructive",
      });
    }
  }

  async function handleSaveReceiving() {
    if (!lines || lines.length === 0) return;
    setSaving(true);
    try {
      let totalActual = 0;
      let allReceived = true;

      for (const line of lines) {
        const data = receivingData[line.id];
        if (!data) {
          if (!line.actualQuantityReceived) allReceived = false;
          totalActual += line.actualTotalCost || 0;
          continue;
        }

        const actualQty = Number(data.actualQuantityReceived) || 0;
        const actualCost = Number(data.actualCostPerPack) || 0;
        const actualTotal = actualQty * actualCost;

        if (actualQty === 0) allReceived = false;

        totalActual += actualTotal;

        await updateDocument<POLine>(`purchaseOrders/${id}/lines`, line.id, {
          actualQuantityReceived: actualQty,
          actualCostPerPack: actualCost,
          actualTotalCost: actualTotal,
          qualityFlag: (data.qualityFlag as POLine["qualityFlag"]) || undefined,
          receivingNotes: data.receivingNotes || undefined,
        });
      }

      const hasAnyReceived =
        Object.values(receivingData).some(
          (d) => Number(d.actualQuantityReceived) > 0
        ) || lines.some((l) => (l.actualQuantityReceived ?? 0) > 0);

      let newStatus: POStatus = po?.status || "sent";
      if (allReceived && hasAnyReceived) {
        newStatus = "fully-received";
      } else if (hasAnyReceived) {
        newStatus = "partially-received";
      }

      await updateDocument<PurchaseOrder>("purchaseOrders", id, {
        actualTotal: totalActual,
        status: newStatus,
        updatedAt: new Date(),
      });

      setReceivingData({});
      toast({
        title: "Receiving saved",
        description: "Line items and PO totals have been updated.",
      });
    } catch (err) {
      console.error("Failed to save receiving:", err);
      toast({
        title: "Error",
        description: "Failed to save receiving data.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLine() {
    const packsToOrder = Number(newLine.packsToOrder) || 0;
    const expectedCostPerPack = Number(newLine.expectedCostPerPack) || 0;
    const quantityNeeded = Number(newLine.quantityNeeded) || 0;

    if (!newLine.ingredientName.trim() || packsToOrder <= 0) return;

    try {
      await addDocument<POLine>(`purchaseOrders/${id}/lines`, {
        ingredientId: "",
        ingredientName: newLine.ingredientName.trim(),
        quantityNeeded,
        quantityNeededUnit: newLine.quantityNeededUnit,
        packSize: newLine.packSize,
        packsToOrder,
        quantityOrdered: packsToOrder,
        overageQuantity: 0,
        overageCost: 0,
        expectedCostPerPack,
        expectedTotalCost: packsToOrder * expectedCostPerPack,
      });

      const currentEstimated = lines?.reduce(
        (sum, l) => sum + (l.expectedTotalCost || 0),
        0
      ) || 0;
      const newEstimated =
        currentEstimated + packsToOrder * expectedCostPerPack;

      await updateDocument<PurchaseOrder>("purchaseOrders", id, {
        estimatedTotal: newEstimated,
        updatedAt: new Date(),
      });

      setShowAddLineDialog(false);
      setNewLine({
        ingredientName: "",
        quantityNeeded: "",
        quantityNeededUnit: "",
        packSize: "",
        packsToOrder: "",
        expectedCostPerPack: "",
      });

      toast({ title: "Line added", description: "Item added to the PO." });
    } catch (err) {
      console.error("Failed to add line:", err);
      toast({
        title: "Error",
        description: "Failed to add line item.",
        variant: "destructive",
      });
    }
  }

  if (poLoading || linesLoading) return <LoadingScreen />;

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-gray-400 text-3xl">warning</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Purchase Order Not Found</h2>
        <p className="text-sm text-gray-500 mt-1 font-medium">
          This purchase order may have been deleted.
        </p>
        <button
          className="mt-4 h-10 px-5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={() => router.push("/purchasing")}
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`PO \u2014 ${po.vendorName}`}
        description={`Week of ${formatDate(po.weekStartDate)}`}
        backHref="/purchasing"
        action={
          po.status === "draft"
            ? {
                label: "Add Line Item",
                onClick: () => setShowAddLineDialog(true),
                icon: "add",
              }
            : undefined
        }
      />

      {/* Status & Summary Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-2xl ambient-shadow p-5">
          <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Status</p>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusBadgeStyles[po.status]}`}>
              {statusLabels[po.status]}
            </span>
            {nextStatusMap[po.status] && (
              <button
                onClick={handleAdvanceStatus}
                className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">{nextStatusIcons[po.status]}</span>
                {nextStatusLabels[po.status]}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl ambient-shadow p-5">
          <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Estimated Total</p>
          <p className="text-2xl font-extrabold text-gray-900">
            {formatCurrency(po.estimatedTotal || summaryData.estimated)}
          </p>
        </div>

        <div className="bg-white rounded-2xl ambient-shadow p-5">
          <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Actual Total</p>
          <p className="text-2xl font-extrabold text-gray-900">
            {po.actualTotal || summaryData.actual
              ? formatCurrency(po.actualTotal || summaryData.actual)
              : "\u2014"}
          </p>
          {po.actualTotal > 0 && po.estimatedTotal > 0 && (
            <p
              className={`text-xs mt-1 font-semibold ${
                po.actualTotal > po.estimatedTotal
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {po.actualTotal > po.estimatedTotal ? "+" : ""}
              {formatCurrency(po.actualTotal - po.estimatedTotal)} vs estimate
            </p>
          )}
        </div>
      </div>

      {/* PO Lines Table */}
      <div className="bg-white rounded-2xl ambient-shadow mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Order Lines</h2>
        </div>
        {lines && lines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Ingredient</th>
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">Qty Needed</th>
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">Pack Size</th>
                  <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Packs</th>
                  <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Expected Cost</th>
                  {po.status !== "draft" && (
                    <>
                      <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden lg:table-cell">Actual Cost</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden lg:table-cell">Quality</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{line.ingredientName}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden sm:table-cell">
                      {line.quantityNeeded} {line.quantityNeededUnit}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{line.packSize || "\u2014"}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{line.packsToOrder}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 text-right">{formatCurrency(line.expectedTotalCost)}</td>
                    {po.status !== "draft" && (
                      <>
                        <td className="px-5 py-3.5 text-sm text-gray-700 text-right hidden lg:table-cell">
                          {line.actualTotalCost ? formatCurrency(line.actualTotalCost) : "\u2014"}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          {line.qualityFlag ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${qualityBadgeStyles[line.qualityFlag] || ""}`}>
                              {line.qualityFlag}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">\u2014</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 font-medium">No line items yet.</p>
            {po.status === "draft" && (
              <button
                onClick={() => setShowAddLineDialog(true)}
                className="mt-3 h-9 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Line Item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Receiving Section */}
      {isReceiving && lines && lines.length > 0 && (
        <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Receiving</h2>
            <button
              onClick={handleSaveReceiving}
              disabled={saving}
              className="h-9 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {saving ? "Saving..." : "Save Receiving"}
            </button>
          </div>
          <div className="p-5 space-y-4">
            {lines.map((line) => (
              <div
                key={line.id}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
              >
                <p className="font-semibold text-sm text-gray-900">{line.ingredientName}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qty Received</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={String(line.packsToOrder)}
                      value={getReceivingValue(line.id, "actualQuantityReceived", line.actualQuantityReceived)}
                      onChange={(e) => updateReceivingField(line.id, "actualQuantityReceived", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost per Pack</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={String(line.expectedCostPerPack)}
                      value={getReceivingValue(line.id, "actualCostPerPack", line.actualCostPerPack)}
                      onChange={(e) => updateReceivingField(line.id, "actualCostPerPack", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quality</label>
                    <Select
                      value={
                        (getReceivingValue(line.id, "qualityFlag", line.qualityFlag) as string) || ""
                      }
                      onValueChange={(v) => updateReceivingField(line.id, "qualityFlag", v)}
                    >
                      <SelectTrigger className="bg-white rounded-lg border-gray-200">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityOptions.map((q) => (
                          <SelectItem key={q.value} value={q.value}>
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                    <input
                      placeholder="Optional notes"
                      value={getReceivingValue(line.id, "receivingNotes", line.receivingNotes)}
                      onChange={(e) => updateReceivingField(line.id, "receivingNotes", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Line Dialog */}
      <Dialog open={showAddLineDialog} onOpenChange={setShowAddLineDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Add Line Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ingredient Name</Label>
              <input
                placeholder="e.g. Chicken Breast"
                value={newLine.ingredientName}
                onChange={(e) => setNewLine({ ...newLine, ingredientName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Qty Needed</Label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newLine.quantityNeeded}
                  onChange={(e) => setNewLine({ ...newLine, quantityNeeded: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Unit</Label>
                <input
                  placeholder="e.g. lbs, oz, ea"
                  value={newLine.quantityNeededUnit}
                  onChange={(e) => setNewLine({ ...newLine, quantityNeededUnit: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Pack Size</Label>
                <input
                  placeholder="e.g. 10 lb case"
                  value={newLine.packSize}
                  onChange={(e) => setNewLine({ ...newLine, packSize: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Packs to Order</Label>
                <input
                  type="number"
                  min="1"
                  value={newLine.packsToOrder}
                  onChange={(e) => setNewLine({ ...newLine, packsToOrder: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Expected Cost per Pack ($)</Label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newLine.expectedCostPerPack}
                onChange={(e) => setNewLine({ ...newLine, expectedCostPerPack: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddLineDialog(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLine}
                disabled={!newLine.ingredientName.trim() || !Number(newLine.packsToOrder)}
                className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

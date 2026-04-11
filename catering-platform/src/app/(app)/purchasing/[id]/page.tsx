"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Truck,
  Check,
  AlertTriangle,
  Plus,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  "partially-received": "bg-yellow-100 text-yellow-700",
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

const nextStatusIcons: Record<POStatus, React.ReactNode> = {
  draft: <Truck className="h-4 w-4" />,
  sent: <ShoppingCart className="h-4 w-4" />,
  "partially-received": <Check className="h-4 w-4" />,
  "fully-received": null,
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
  if (!date) return "—";
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

  // Initialize receiving data from existing line data
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

      // Recalculate estimated total
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
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Purchase Order Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This purchase order may have been deleted.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/purchasing")}
        >
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`PO — ${po.vendorName}`}
        description={`Week of ${formatDate(po.weekStartDate)}`}
        backHref="/purchasing"
        action={
          po.status === "draft"
            ? {
                label: "Add Line Item",
                onClick: () => setShowAddLineDialog(true),
                icon: <Plus className="h-4 w-4" />,
              }
            : undefined
        }
      />

      {/* Status & Summary Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-2">Status</p>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={`text-sm ${statusBadgeStyles[po.status]}`}
              >
                {statusLabels[po.status]}
              </Badge>
              {nextStatusMap[po.status] && (
                <Button size="sm" variant="outline" onClick={handleAdvanceStatus}>
                  {nextStatusIcons[po.status]}
                  <span className="ml-1.5">
                    {nextStatusLabels[po.status]}
                  </span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Estimated Total</p>
            <p className="text-2xl font-bold">
              {formatCurrency(po.estimatedTotal || summaryData.estimated)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Actual Total</p>
            <p className="text-2xl font-bold">
              {po.actualTotal || summaryData.actual
                ? formatCurrency(po.actualTotal || summaryData.actual)
                : "—"}
            </p>
            {po.actualTotal > 0 && po.estimatedTotal > 0 && (
              <p
                className={`text-xs mt-1 ${
                  po.actualTotal > po.estimatedTotal
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {po.actualTotal > po.estimatedTotal ? "+" : ""}
                {formatCurrency(po.actualTotal - po.estimatedTotal)} vs estimate
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PO Lines Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Order Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lines && lines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Qty Needed
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Pack Size
                    </TableHead>
                    <TableHead>Packs</TableHead>
                    <TableHead className="text-right">Expected Cost</TableHead>
                    {(po.status !== "draft") && (
                      <>
                        <TableHead className="text-right hidden lg:table-cell">
                          Actual Cost
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Quality
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">
                        {line.ingredientName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {line.quantityNeeded} {line.quantityNeededUnit}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {line.packSize || "—"}
                      </TableCell>
                      <TableCell>{line.packsToOrder}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.expectedTotalCost)}
                      </TableCell>
                      {(po.status !== "draft") && (
                        <>
                          <TableCell className="text-right hidden lg:table-cell">
                            {line.actualTotalCost
                              ? formatCurrency(line.actualTotalCost)
                              : "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {line.qualityFlag ? (
                              <Badge
                                variant="secondary"
                                className={
                                  qualityBadgeStyles[line.qualityFlag] || ""
                                }
                              >
                                {line.qualityFlag}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No line items yet.</p>
              {po.status === "draft" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddLineDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Line Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receiving Section */}
      {isReceiving && lines && lines.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Receiving</CardTitle>
            <Button
              size="sm"
              onClick={handleSaveReceiving}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving..." : "Save Receiving"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <p className="font-medium text-sm">{line.ingredientName}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Qty Received</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={String(line.packsToOrder)}
                        value={getReceivingValue(
                          line.id,
                          "actualQuantityReceived",
                          line.actualQuantityReceived
                        )}
                        onChange={(e) =>
                          updateReceivingField(
                            line.id,
                            "actualQuantityReceived",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cost per Pack</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={String(line.expectedCostPerPack)}
                        value={getReceivingValue(
                          line.id,
                          "actualCostPerPack",
                          line.actualCostPerPack
                        )}
                        onChange={(e) =>
                          updateReceivingField(
                            line.id,
                            "actualCostPerPack",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quality</Label>
                      <Select
                        value={
                          (getReceivingValue(
                            line.id,
                            "qualityFlag",
                            line.qualityFlag
                          ) as string) || ""
                        }
                        onValueChange={(v) =>
                          updateReceivingField(line.id, "qualityFlag", v)
                        }
                      >
                        <SelectTrigger>
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
                      <Label className="text-xs">Notes</Label>
                      <Input
                        placeholder="Optional notes"
                        value={getReceivingValue(
                          line.id,
                          "receivingNotes",
                          line.receivingNotes
                        )}
                        onChange={(e) =>
                          updateReceivingField(
                            line.id,
                            "receivingNotes",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Line Dialog */}
      <Dialog open={showAddLineDialog} onOpenChange={setShowAddLineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Ingredient Name</Label>
              <Input
                placeholder="e.g. Chicken Breast"
                value={newLine.ingredientName}
                onChange={(e) =>
                  setNewLine({ ...newLine, ingredientName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Qty Needed</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={newLine.quantityNeeded}
                  onChange={(e) =>
                    setNewLine({ ...newLine, quantityNeeded: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  placeholder="e.g. lbs, oz, ea"
                  value={newLine.quantityNeededUnit}
                  onChange={(e) =>
                    setNewLine({
                      ...newLine,
                      quantityNeededUnit: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pack Size</Label>
                <Input
                  placeholder="e.g. 10 lb case"
                  value={newLine.packSize}
                  onChange={(e) =>
                    setNewLine({ ...newLine, packSize: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Packs to Order</Label>
                <Input
                  type="number"
                  min="1"
                  value={newLine.packsToOrder}
                  onChange={(e) =>
                    setNewLine({ ...newLine, packsToOrder: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expected Cost per Pack ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newLine.expectedCostPerPack}
                onChange={(e) =>
                  setNewLine({
                    ...newLine,
                    expectedCostPerPack: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddLineDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddLine}
                disabled={
                  !newLine.ingredientName.trim() ||
                  !Number(newLine.packsToOrder)
                }
              >
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

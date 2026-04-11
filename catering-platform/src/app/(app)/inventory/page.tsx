"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  useInventory,
  adjustInventory,
  type InventoryItem,
} from "@/lib/hooks/useInventory";
import { useToast } from "@/components/ui/use-toast";

const ADJUSTMENT_REASONS = [
  { value: "restock", label: "Restock" },
  { value: "waste", label: "Waste" },
  { value: "use", label: "Use / Consumption" },
  { value: "adjustment", label: "Manual Adjustment" },
];

function formatDate(date: Date | any): string {
  if (!date) return "—";
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
    if (!inventory) return { total: 0, lowStock: 0, expiringSoon: 0 };
    return {
      total: inventory.length,
      lowStock: inventory.filter(
        (item) => item.currentQuantity < item.reorderPoint
      ).length,
      expiringSoon: inventory.filter(
        (item) => isExpiringSoon(item.expiryDate) || isExpired(item.expiryDate)
      ).length,
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
    // For waste and use, quantity should be negative
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
        description="Track ingredient stock levels and adjustments"
      />

      {/* Summary Cards */}
      {inventory && inventory.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{summaryStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-50 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold">{summaryStats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2.5">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Expiring Soon
                  </p>
                  <p className="text-2xl font-bold">
                    {summaryStats.expiringSoon}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {inventory && inventory.length > 0 ? (
        <>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ingredients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No items match your search.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Qty On Hand</TableHead>
                    <TableHead className="hidden sm:table-cell">Unit</TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Reorder Point
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Last Restocked
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const isLow = item.currentQuantity < item.reorderPoint;
                    const expiring = isExpiringSoon(item.expiryDate);
                    const expired = isExpired(item.expiryDate);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.ingredientName}
                            </p>
                            {item.location && (
                              <p className="text-xs text-muted-foreground">
                                {item.location}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.currentQuantity}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {item.unit}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right text-muted-foreground">
                          {item.reorderPoint}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {isLow ? (
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-700 w-fit"
                              >
                                Low
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 w-fit"
                              >
                                OK
                              </Badge>
                            )}
                            {expired && (
                              <Badge
                                variant="secondary"
                                className="bg-red-100 text-red-700 w-fit"
                              >
                                Expired
                              </Badge>
                            )}
                            {expiring && !expired && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 w-fit"
                              >
                                Expiring
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(item.lastRestockedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustDialog(item)}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No inventory items"
          description="Inventory items will appear here once ingredients are added and stock is tracked."
        />
      )}

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adjust Inventory — {selectedItem?.ingredientName}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  Current quantity:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedItem.currentQuantity} {selectedItem.unit}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Enter quantity (positive to add, negative to subtract)"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  For waste or use, enter a positive number. It will be
                  automatically subtracted.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select
                  value={adjustmentReason}
                  onValueChange={setAdjustmentReason}
                >
                  <SelectTrigger>
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
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g. Damaged packaging, physical count correction"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAdjustDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdjust}
                  disabled={!adjustmentQty || !adjustmentReason || adjusting}
                >
                  {adjusting ? "Saving..." : "Save Adjustment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

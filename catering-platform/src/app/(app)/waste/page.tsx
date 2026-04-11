"use client";

import React, { useState, useMemo } from "react";
import {
  Trash2,
  Plus,
  AlertCircle,
  FlameKindling,
  Droplets,
  ChefHat,
  HelpCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useWasteLog, addWasteEntry } from "@/lib/hooks/useWaste";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { formatCurrency } from "@/lib/utils";

const REASON_OPTIONS = [
  {
    value: "spoilage",
    label: "Spoilage",
    icon: Droplets,
    color: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
    activeColor: "bg-red-600 text-white border-red-600",
  },
  {
    value: "accident",
    label: "Accident",
    icon: AlertCircle,
    color: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
    activeColor: "bg-orange-600 text-white border-orange-600",
  },
  {
    value: "prep-loss",
    label: "Prep Loss",
    icon: ChefHat,
    color: "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200",
    activeColor: "bg-yellow-600 text-white border-yellow-600",
  },
  {
    value: "other",
    label: "Other",
    icon: HelpCircle,
    color: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200",
    activeColor: "bg-gray-600 text-white border-gray-600",
  },
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

  // Summary calculations
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

      // Reset form
      setSelectedIngredientId("");
      setQuantity("");
      setUnit("");
      setReason("");
      setNotes("");
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
    <div className="p-6">
      <PageHeader
        title="Waste Tracking"
        description="Log and monitor food waste to reduce costs"
      />

      {/* Section A: Log Waste */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log Waste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ingredient Select */}
            <div className="space-y-2">
              <Label htmlFor="ingredient">Ingredient</Label>
              <Select
                value={selectedIngredientId}
                onValueChange={handleIngredientChange}
              >
                <SelectTrigger id="ingredient" className="h-12 text-base">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-14 text-2xl font-semibold text-center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g. lb, oz, ea"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
            </div>

            {/* Reason Pill Buttons */}
            <div className="space-y-2">
              <Label>Reason</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {REASON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = reason === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReason(opt.value)}
                      className={`
                        flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4
                        transition-all duration-150 cursor-pointer
                        min-h-[80px] text-sm font-medium
                        ${isActive ? opt.activeColor : opt.color}
                      `}
                    >
                      <Icon className="h-6 w-6" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Estimated Cost */}
            {selectedIngredient && quantity && (
              <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Estimated Cost
                </span>
                <span className="text-2xl font-bold text-destructive">
                  {formatCurrency(estimatedCost)}
                </span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold"
            >
              {submitting ? "Logging..." : "Log Waste Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section B: Waste Log */}
      {wasteEntries.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Total Waste This Week
                </p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {formatCurrency(weeklyWaste)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Total Waste This Month
                </p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {formatCurrency(monthlyWaste)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Top Waste Reason
                </p>
                <p className="text-2xl font-bold mt-1">{topReason}</p>
              </CardContent>
            </Card>
          </div>

          {/* Waste Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Waste Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Notes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.ingredientName}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.unit}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              REASON_BADGE_VARIANT[entry.reason] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getReasonLabel(entry.reason)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(entry.totalCost)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                          {entry.notes || "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<Trash2 className="h-12 w-12" />}
          title="No waste entries yet"
          description="Use the form above to log your first waste entry and start tracking costs."
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Pencil, X, Check, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  useIngredient,
  useVendorRecords,
  updateIngredient,
  deleteIngredient,
  addVendorRecord,
} from "@/lib/hooks/useIngredients";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  { value: "protein", label: "Protein" },
  { value: "produce", label: "Produce" },
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

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function formatDate(date: Date | { toDate?: () => Date } | string): string {
  if (!date) return "—";
  const d =
    typeof date === "string"
      ? new Date(date)
      : date instanceof Date
        ? date
        : date.toDate
          ? date.toDate()
          : new Date();
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const { data: ingredient, loading, error } = useIngredient(id);
  const { data: vendorRecords, loading: vendorLoading } = useVendorRecords(id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCostPerUnit, setEditCostPerUnit] = useState("");
  const [editSupplier, setEditSupplier] = useState("");

  // Vendor record form state
  const [vrVendorName, setVrVendorName] = useState("");
  const [vrPricePerUnit, setVrPricePerUnit] = useState("");
  const [vrQuantity, setVrQuantity] = useState("");
  const [vrUnit, setVrUnit] = useState("");
  const [vrTotalCost, setVrTotalCost] = useState("");
  const [vrPurchaseDate, setVrPurchaseDate] = useState("");
  const [vrSaving, setVrSaving] = useState(false);

  useEffect(() => {
    if (ingredient) {
      setEditName(ingredient.name);
      setEditCategory(ingredient.category);
      setEditUnit(ingredient.unit);
      setEditCostPerUnit(String(ingredient.costPerUnit));
      setEditSupplier(ingredient.supplier || "");
    }
  }, [ingredient]);

  if (loading) return <LoadingScreen />;
  if (error || !ingredient) {
    return (
      <div className="p-6 text-destructive">
        Ingredient not found or failed to load.
      </div>
    );
  }

  function startEditing() {
    setEditName(ingredient!.name);
    setEditCategory(ingredient!.category);
    setEditUnit(ingredient!.unit);
    setEditCostPerUnit(String(ingredient!.costPerUnit));
    setEditSupplier(ingredient!.supplier || "");
    setEditing(true);
  }

  async function handleSave() {
    if (!editName.trim() || !editCategory || !editUnit.trim()) {
      toast({
        title: "Missing fields",
        description: "Name, category, and unit are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateIngredient(id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit.trim(),
        costPerUnit: parseFloat(editCostPerUnit) || 0,
        supplier: editSupplier.trim(),
      });
      toast({ title: "Saved", description: "Ingredient updated successfully." });
      setEditing(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update ingredient.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteIngredient(id);
      toast({ title: "Deleted", description: "Ingredient has been removed." });
      router.push("/ingredients");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete ingredient.",
        variant: "destructive",
      });
    }
  }

  async function handleAddVendorRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!vrVendorName.trim()) {
      toast({
        title: "Missing vendor name",
        description: "Please enter a vendor name.",
        variant: "destructive",
      });
      return;
    }

    setVrSaving(true);
    try {
      await addVendorRecord(id, {
        vendorName: vrVendorName.trim(),
        pricePerUnit: parseFloat(vrPricePerUnit) || 0,
        quantity: parseFloat(vrQuantity) || 0,
        unit: vrUnit.trim() || ingredient!.unit,
        totalCost: parseFloat(vrTotalCost) || 0,
        purchaseDate: vrPurchaseDate ? new Date(vrPurchaseDate) : new Date(),
      });
      toast({ title: "Vendor record added" });
      setVendorDialogOpen(false);
      setVrVendorName("");
      setVrPricePerUnit("");
      setVrQuantity("");
      setVrUnit("");
      setVrTotalCost("");
      setVrPurchaseDate("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to add vendor record.",
        variant: "destructive",
      });
    } finally {
      setVrSaving(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader title={ingredient.name} backHref="/ingredients" />

      <div className="space-y-6 max-w-4xl">
        {/* Ingredient Details Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Ingredient Details</CardTitle>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Check className="h-4 w-4 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Ingredient</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                          {ingredient.name}
                        </span>
                        ? This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-3 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">Unit</Label>
                    <Input
                      id="edit-unit"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cost">Cost per Unit ($)</Label>
                    <Input
                      id="edit-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editCostPerUnit}
                      onChange={(e) => setEditCostPerUnit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Supplier</Label>
                  <Input
                    id="edit-supplier"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="mt-1">
                    {getCategoryLabel(ingredient.category)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium">{ingredient.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cost per Unit</p>
                  <p className="font-medium">
                    {formatCurrency(ingredient.costPerUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{ingredient.supplier || "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor Records Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Vendor Records</CardTitle>
            <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Vendor Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddVendorRecord} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="vr-vendor">Vendor Name</Label>
                    <Input
                      id="vr-vendor"
                      placeholder="e.g. Sysco"
                      value={vrVendorName}
                      onChange={(e) => setVrVendorName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vr-price">Price per Unit ($)</Label>
                      <Input
                        id="vr-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={vrPricePerUnit}
                        onChange={(e) => setVrPricePerUnit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vr-qty">Quantity</Label>
                      <Input
                        id="vr-qty"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={vrQuantity}
                        onChange={(e) => setVrQuantity(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vr-unit">Unit</Label>
                      <Input
                        id="vr-unit"
                        placeholder={ingredient.unit}
                        value={vrUnit}
                        onChange={(e) => setVrUnit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vr-total">Total Cost ($)</Label>
                      <Input
                        id="vr-total"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={vrTotalCost}
                        onChange={(e) => setVrTotalCost(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vr-date">Purchase Date</Label>
                    <Input
                      id="vr-date"
                      type="date"
                      value={vrPurchaseDate}
                      onChange={(e) => setVrPurchaseDate(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setVendorDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={vrSaving}>
                      {vrSaving ? "Saving..." : "Add Record"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {vendorLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading vendor records...
              </div>
            ) : vendorRecords && vendorRecords.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Price/Unit</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorRecords.map((vr) => (
                      <TableRow key={vr.id}>
                        <TableCell className="font-medium">
                          {vr.vendorName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(vr.pricePerUnit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {vr.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vr.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(vr.totalCost)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(vr.purchaseDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No vendor records yet. Add one to track purchase history.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

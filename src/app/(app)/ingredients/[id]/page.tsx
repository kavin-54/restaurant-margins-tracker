"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  { value: "protein", label: "Meat / Protein" },
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

function getCategoryBadgeClasses(category: string): string {
  switch (category) {
    case "produce":
      return "bg-green-100 text-green-700";
    case "dairy":
      return "bg-blue-100 text-blue-700";
    case "dry-goods":
      return "bg-purple-100 text-purple-700";
    case "protein":
      return "bg-red-100 text-red-700";
    case "spice":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function formatDate(date: Date | { toDate?: () => Date } | string): string {
  if (!date) return "\u2014";
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
      <div className="p-6 text-red-600">
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

  // Simulated inventory values (no inventory field on current data model)
  const quantityOnHand = 0;
  const reorderPoint = 0;
  const inventoryPercent = reorderPoint > 0 ? Math.min(100, (quantityOnHand / reorderPoint) * 100) : 0;

  return (
    <div>
      <PageHeader title={ingredient.name} backHref="/ingredients" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image + Inventory */}
        <div className="space-y-6">
          {/* Image Placeholder */}
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300 text-6xl">
                image
              </span>
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="bg-white rounded-2xl ambient-shadow p-6">
            <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-4">
              Inventory Summary
            </h3>
            <div className="space-y-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${inventoryPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    On Hand
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {quantityOnHand} {ingredient.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    Reorder Point
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {reorderPoint} {ingredient.unit}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Specs + Vendor Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Specifications Card */}
          <div className="bg-white rounded-2xl ambient-shadow p-6">
            <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-5">
              Specifications
            </h3>

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
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">check</span>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="h-10 px-5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all duration-150 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Category
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClasses(ingredient.category)}`}
                    >
                      {getCategoryLabel(ingredient.category)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Unit
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {ingredient.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Cost/Unit
                    </p>
                    <p className="text-sm font-semibold text-blue-700">
                      {formatCurrency(ingredient.costPerUnit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      SKU
                    </p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">
                      {id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Allergens
                    </p>
                    <p className="text-sm font-semibold text-gray-400">
                      None
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Tags
                    </p>
                    {ingredient.supplier ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100/20 text-purple-700">
                        {ingredient.supplier}
                      </span>
                    ) : (
                      <p className="text-sm font-semibold text-gray-400">
                        None
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit / Delete Buttons */}
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                  <button
                    onClick={startEditing}
                    className="h-10 px-5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all duration-150 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Edit
                  </button>
                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <button className="h-10 px-5 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all duration-150 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Delete
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Ingredient</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-gray-900">
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
                </div>
              </>
            )}
          </div>

          {/* Vendor Records Table */}
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                Vendor Records
              </h3>
              <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                <DialogTrigger asChild>
                  <button className="h-9 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">add</span>
                    Add Record
                  </button>
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
            </div>

            {vendorLoading ? (
              <div className="text-center py-8 text-gray-400 font-medium">
                Loading vendor records...
              </div>
            ) : vendorRecords && vendorRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Vendor
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Price
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Quantity
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendorRecords.map((vr) => (
                    <tr key={vr.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {vr.vendorName}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-700 font-bold">
                        {formatCurrency(vr.pricePerUnit)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {vr.quantity} {vr.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(vr.purchaseDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-400 font-medium px-6 pb-6">
                No vendor records yet. Add one to track purchase history.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

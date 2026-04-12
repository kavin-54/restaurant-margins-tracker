"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { addIngredient } from "@/lib/hooks/useIngredients";

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

const UNITS = [
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "gal", label: "gal" },
  { value: "qt", label: "qt" },
  { value: "pt", label: "pt" },
  { value: "cup", label: "cup" },
  { value: "fl oz", label: "fl oz" },
  { value: "each", label: "each" },
  { value: "dozen", label: "dozen" },
  { value: "case", label: "case" },
  { value: "bunch", label: "bunch" },
];

export default function NewIngredientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    costPerUnit: "",
    supplier: "",
    allergens: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.category || !form.unit) {
      toast({
        title: "Missing fields",
        description: "Please fill in name, category, and unit.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await addIngredient({
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
        supplier: form.supplier.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast({ title: "Ingredient added", description: `${form.name} has been added.` });
      router.push("/ingredients");
    } catch {
      toast({
        title: "Error",
        description: "Failed to add ingredient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add Ingredient" backHref="/ingredients" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="border-l-4 border-blue-700 p-8">
              <div className="space-y-5">
                {/* Name + Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Chicken Breast"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                      <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg">
                        <SelectValue placeholder="Select a category" />
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
                </div>

                {/* Unit + Cost per Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <Select value={form.unit} onValueChange={(v) => updateField("unit", v)}>
                      <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg">
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Cost per Unit ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.costPerUnit}
                      onChange={(e) => updateField("costPerUnit", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                {/* Supplier + Allergens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Supplier
                    </label>
                    <Input
                      placeholder="e.g. Sysco, US Foods"
                      value={form.supplier}
                      onChange={(e) => updateField("supplier", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Allergens
                    </label>
                    <Input
                      placeholder="e.g. Dairy, Gluten, Nuts"
                      value={form.allergens}
                      onChange={(e) => updateField("allergens", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Notes
                  </label>
                  <Textarea
                    placeholder="Any additional notes about this ingredient..."
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={4}
                    className="bg-gray-50 border-none rounded-lg resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => router.push("/ingredients")}
              className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Ingredient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

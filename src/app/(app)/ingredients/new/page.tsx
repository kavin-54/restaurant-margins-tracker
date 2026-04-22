"use client";

import React, { useState, useEffect, useRef } from "react";
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
  { value: "vegetable", label: "Vegetable" },
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
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
  { value: "liter", label: "liter" },
  { value: "ml", label: "ml" },
  { value: "gallon", label: "gallon" },
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
  { value: "fl_oz", label: "fl oz" },
  { value: "each", label: "each" },
  { value: "dozen", label: "dozen" },
  { value: "case", label: "case" },
  { value: "bunch", label: "bunch" },
  { value: "piece", label: "piece" },
  { value: "head", label: "head" },
];

const STORAGE_KEY = "hfs-new-ingredient-defaults";

function loadDefaults(): { category: string; unit: string } {
  if (typeof window === "undefined") return { category: "", unit: "" };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { category: "", unit: "" };
}

function saveDefaults(category: string, unit: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ category, unit }));
  } catch {}
}

export default function NewIngredientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const defaults = loadDefaults();

  const [form, setForm] = useState({
    name: "",
    category: defaults.category,
    unit: defaults.unit,
    costPerUnit: "",
    supplier: "",
    allergens: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm(keepDefaults: boolean) {
    setForm({
      name: "",
      category: keepDefaults ? form.category : "",
      unit: keepDefaults ? form.unit : "",
      costPerUnit: "",
      supplier: "",
      allergens: "",
      notes: "",
    });
  }

  async function handleSave(mode: "continue" | "view" | "list") {
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
      // Remember last-used category and unit
      saveDefaults(form.category, form.unit);

      const result = await addIngredient({
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
        supplier: form.supplier.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({ title: "Ingredient added", description: `${form.name} has been added.` });

      if (mode === "continue") {
        setAddedCount((c) => c + 1);
        resetForm(true);
        // Focus back on name input for rapid entry
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else if (mode === "view") {
        router.push(`/ingredients/${result.id}`);
      } else {
        router.push("/ingredients");
      }
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSave("list");
  }

  return (
    <div>
      <PageHeader title="Add Ingredient" backHref="/ingredients" />

      <div className="max-w-2xl">
        {/* Quick Add Section */}
        <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
          <div className="border-l-4 border-green-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-xl">bolt</span>
                <h3 className="text-sm font-bold text-gray-900">Quick Add</h3>
              </div>
              {addedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  {addedCount} added this session
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  ref={nameInputRef}
                  placeholder="e.g. Chicken Breast"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="bg-gray-50 border-none h-10 rounded-lg text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger className="bg-gray-50 border-none h-10 rounded-lg text-sm">
                    <SelectValue placeholder="Category" />
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Cost ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.costPerUnit}
                  onChange={(e) => updateField("costPerUnit", e.target.value)}
                  className="bg-gray-50 border-none h-10 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Unit <span className="text-red-500">*</span>
                </label>
                <Select value={form.unit} onValueChange={(v) => updateField("unit", v)}>
                  <SelectTrigger className="bg-gray-50 border-none h-10 rounded-lg text-sm">
                    <SelectValue placeholder="Unit" />
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
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => handleSave("continue")}
                disabled={saving}
                className="h-9 px-4 bg-green-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-green-700 active:scale-95 transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {saving ? "Saving..." : "Add & Continue"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("view")}
                disabled={saving}
                className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                Add & View
              </button>
              <button
                type="button"
                onClick={() => setShowFullForm(!showFullForm)}
                className="h-9 px-4 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all duration-150 flex items-center gap-1.5 ml-auto"
              >
                <span className="material-symbols-outlined text-sm">
                  {showFullForm ? "expand_less" : "expand_more"}
                </span>
                {showFullForm ? "Less Details" : "More Details"}
              </button>
            </div>
          </div>
        </div>

        {/* Full Form (expandable) */}
        {showFullForm && (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0px 10px 40px rgba(45,51,53,0.06)' }}>
              <div className="border-l-4 border-blue-700 p-8">
                <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-700 text-lg">tune</span>
                  Additional Details
                </h3>
                <div className="space-y-5">
                  {/* Name + Category (shown again for context, pre-filled) */}
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
        )}
      </div>
    </div>
  );
}

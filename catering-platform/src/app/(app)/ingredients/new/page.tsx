"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function NewIngredientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [supplier, setSupplier] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !category || !unit.trim()) {
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
        name: name.trim(),
        category,
        unit: unit.trim(),
        costPerUnit: parseFloat(costPerUnit) || 0,
        supplier: supplier.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast({ title: "Ingredient added", description: `${name} has been added.` });
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
    <div className="p-6">
      <PageHeader title="Add Ingredient" backHref="/ingredients" />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Chicken Breast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g. lb, oz, each"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPerUnit">Cost per Unit ($)</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                placeholder="e.g. Sysco, US Foods"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Ingredient"}
              </Button>
              <Link href="/ingredients">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

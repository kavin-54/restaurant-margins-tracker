"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Egg } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
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
import { useIngredients } from "@/lib/hooks/useIngredients";
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

export default function IngredientsPage() {
  const { data: ingredients, loading, error } = useIngredients();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    return ingredients.filter((ing) => {
      const matchesSearch = ing.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || ing.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [ingredients, search, categoryFilter]);

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load ingredients. Please try again.
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Ingredients"
        description="Manage your ingredient catalog and costs"
        action={{
          label: "Add Ingredient",
          href: "/ingredients/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {ingredients && ingredients.length > 0 ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ingredients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No ingredients match your search.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ing) => (
                    <TableRow key={ing.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/ingredients/${ing.id}`}
                          className="block font-medium text-foreground hover:underline"
                        >
                          {ing.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getCategoryLabel(ing.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ing.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ing.costPerUnit)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ing.supplier || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Egg className="h-12 w-12" />}
          title="No ingredients yet"
          description="Add your first ingredient to start tracking costs and building recipes."
          action={{ label: "Add Ingredient", href: "/ingredients/new" }}
        />
      )}
    </div>
  );
}

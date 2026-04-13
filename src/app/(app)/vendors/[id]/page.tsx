"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  useVendor,
  updateVendor,
  deleteVendor,
} from "@/lib/hooks/useVendors";
import { useIngredients, type Ingredient } from "@/lib/hooks/useIngredients";
import { useCollection } from "@/lib/hooks/useFirestore";
import { addDocument } from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrder } from "@/lib/types/purchaseOrder";

const WEEKDAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

function formatDate(date: Date | any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date.seconds * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDate(date: Date | any): Date {
  if (!date) return new Date(0);
  return date instanceof Date ? date : new Date(date.seconds * 1000);
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const { data: vendor, loading, error } = useVendor(id);
  const { data: allPOs } = useCollection<PurchaseOrder>(
    "purchaseOrders",
    orderBy("createdAt", "desc")
  );
  const { data: allIngredients } = useIngredients();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState<string[]>([]);
  const [reordering, setReordering] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    leadTime: "",
    minimumOrder: "",
    notes: "",
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name,
        contactPerson: vendor.contactPerson || "",
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address || "",
        city: vendor.city || "",
        state: vendor.state || "",
        zipCode: vendor.zipCode || "",
        leadTime: vendor.leadTime != null ? String(vendor.leadTime) : "",
        minimumOrder:
          vendor.minimumOrder != null ? String(vendor.minimumOrder) : "",
        notes: vendor.notes || "",
      });
      setDeliveryDays((vendor as any).deliveryDays || []);
    }
  }, [vendor]);

  // --- Vendor POs ---
  const vendorPOs = useMemo(() => {
    if (!allPOs || !id) return [];
    return allPOs.filter((po) => po.vendorId === id);
  }, [allPOs, id]);

  // --- Order History Analytics ---
  const orderAnalytics = useMemo(() => {
    const now = new Date();
    const thisMonth = vendorPOs.filter((po) => {
      const d = toDate(po.createdAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
    const thisYear = vendorPOs.filter((po) => {
      const d = toDate(po.createdAt);
      return d.getFullYear() === now.getFullYear();
    });

    const totalSpendAllTime = vendorPOs.reduce(
      (sum, po) => sum + (po.actualTotal || po.estimatedTotal || 0),
      0
    );
    const totalSpendThisMonth = thisMonth.reduce(
      (sum, po) => sum + (po.actualTotal || po.estimatedTotal || 0),
      0
    );
    const totalSpendThisYear = thisYear.reduce(
      (sum, po) => sum + (po.actualTotal || po.estimatedTotal || 0),
      0
    );
    const avgOrderValue =
      vendorPOs.length > 0 ? totalSpendAllTime / vendorPOs.length : 0;

    // Order frequency: orders per week over last 90 days
    const ninetyDaysAgo = new Date(
      now.getTime() - 90 * 24 * 60 * 60 * 1000
    );
    const recentPOs = vendorPOs.filter(
      (po) => toDate(po.createdAt) >= ninetyDaysAgo
    );
    const weeksInRange = Math.max(1, 90 / 7);
    const ordersPerWeek = recentPOs.length / weeksInRange;

    // Price trend: compare last 3 months average vs prior 3 months
    const threeMonthsAgo = new Date(
      now.getTime() - 90 * 24 * 60 * 60 * 1000
    );
    const sixMonthsAgo = new Date(
      now.getTime() - 180 * 24 * 60 * 60 * 1000
    );
    const recent3m = vendorPOs.filter((po) => {
      const d = toDate(po.createdAt);
      return d >= threeMonthsAgo;
    });
    const prior3m = vendorPOs.filter((po) => {
      const d = toDate(po.createdAt);
      return d >= sixMonthsAgo && d < threeMonthsAgo;
    });
    const avgRecent =
      recent3m.length > 0
        ? recent3m.reduce(
            (sum, po) => sum + (po.actualTotal || po.estimatedTotal || 0),
            0
          ) / recent3m.length
        : 0;
    const avgPrior =
      prior3m.length > 0
        ? prior3m.reduce(
            (sum, po) => sum + (po.actualTotal || po.estimatedTotal || 0),
            0
          ) / prior3m.length
        : 0;
    const priceTrend =
      avgPrior > 0 ? ((avgRecent - avgPrior) / avgPrior) * 100 : 0;

    // Last PO
    const lastPO = vendorPOs.length > 0 ? vendorPOs[0] : null;

    return {
      totalSpendAllTime,
      totalSpendThisMonth,
      totalSpendThisYear,
      avgOrderValue,
      ordersPerWeek,
      priceTrend,
      totalOrders: vendorPOs.length,
      lastPO,
    };
  }, [vendorPOs]);

  // --- Ingredients supplied by this vendor ---
  const vendorIngredients = useMemo(() => {
    if (!allIngredients || !vendor) return [];
    return allIngredients.filter(
      (ing) =>
        ing.supplier &&
        ing.supplier.toLowerCase() === vendor.name.toLowerCase()
    );
  }, [allIngredients, vendor]);

  // --- Price comparison data ---
  const priceComparisons = useMemo(() => {
    if (!vendorIngredients.length || !allIngredients || !vendor) return [];

    return vendorIngredients.map((ing) => {
      // Find same ingredient from other vendors
      const otherVendorVersions = allIngredients.filter(
        (other) =>
          other.name.toLowerCase() === ing.name.toLowerCase() &&
          other.supplier.toLowerCase() !== vendor.name.toLowerCase()
      );

      const bestOther = otherVendorVersions.reduce(
        (best: Ingredient | null, curr) => {
          if (!best) return curr;
          return curr.costPerUnit < best.costPerUnit ? curr : best;
        },
        null
      );

      const potentialSavingsPerUnit = bestOther
        ? ing.costPerUnit - bestOther.costPerUnit
        : 0;

      return {
        ingredientName: ing.name,
        currentPrice: ing.costPerUnit,
        unit: ing.unit,
        bestAlternativePrice: bestOther?.costPerUnit,
        bestAlternativeVendor: bestOther?.supplier,
        savingsPerUnit: potentialSavingsPerUnit > 0 ? potentialSavingsPerUnit : 0,
      };
    });
  }, [vendorIngredients, allIngredients, vendor]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDeliveryDay(day: string) {
    setDeliveryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in name, email, and phone.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateVendor(id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        leadTime: form.leadTime ? Number(form.leadTime) : undefined,
        minimumOrder: form.minimumOrder ? Number(form.minimumOrder) : undefined,
        notes: form.notes.trim() || undefined,
      } as any);
      // Also save delivery days
      await updateVendor(id, { deliveryDays } as any);
      toast({
        title: "Vendor updated",
        description: "Changes have been saved.",
      });
      setEditing(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update vendor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteVendor(id);
      toast({
        title: "Vendor deleted",
        description: "The vendor has been removed.",
      });
      router.push("/vendors");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete vendor. Please try again.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  async function handleReorderLastPO() {
    if (!orderAnalytics.lastPO) return;
    setReordering(true);
    try {
      const lastPO = orderAnalytics.lastPO;
      await addDocument<PurchaseOrder>("purchaseOrders", {
        weekStartDate: new Date(),
        vendorId: id,
        vendorName: vendor!.name,
        status: "draft",
        eventIds: [],
        estimatedTotal: lastPO.estimatedTotal,
        actualTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      toast({
        title: "Draft PO created",
        description: "A new draft purchase order has been created from the last order.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create reorder.",
        variant: "destructive",
      });
    } finally {
      setReordering(false);
    }
  }

  async function handleSaveDeliveryDays() {
    try {
      await updateVendor(id, { deliveryDays } as any);
      toast({ title: "Delivery schedule updated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update delivery schedule.",
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingScreen />;
  if (error || !vendor) {
    return (
      <div className="p-6 text-red-600">
        Vendor not found or failed to load.
      </div>
    );
  }

  const fullAddress = [
    vendor.address,
    vendor.city,
    vendor.state,
    vendor.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const isPreferred = (vendor.notes || "").toLowerCase().includes("preferred");
  const isInactive = (vendor.notes || "").toLowerCase().includes("inactive");

  // Next expected delivery
  const nextDeliveryDay = (() => {
    if (deliveryDays.length === 0) return null;
    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    const today = new Date();
    const todayIdx = today.getDay();
    const deliveryIndices = deliveryDays
      .map((d) => dayMap[d])
      .filter((d) => d !== undefined)
      .sort((a, b) => a - b);

    for (const idx of deliveryIndices) {
      if (idx > todayIdx) {
        const diff = idx - todayIdx;
        const next = new Date(today);
        next.setDate(next.getDate() + diff);
        return next;
      }
    }
    // Wrap to next week
    if (deliveryIndices.length > 0) {
      const diff = 7 - todayIdx + deliveryIndices[0];
      const next = new Date(today);
      next.setDate(next.getDate() + diff);
      return next;
    }
    return null;
  })();

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={vendor.name} backHref="/vendors" />

      {editing ? (
        /* ---- Edit Mode ---- */
        <div className="max-w-2xl">
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
          >
            <div className="border-l-4 border-blue-700 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Edit Vendor
              </h2>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Contact Person
                    </label>
                    <Input
                      value={form.contactPerson}
                      onChange={(e) =>
                        updateField("contactPerson", e.target.value)
                      }
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Address
                  </label>
                  <Input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="bg-gray-50 border-none h-12 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      City
                    </label>
                    <Input
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      State
                    </label>
                    <Input
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Zip Code
                    </label>
                    <Input
                      value={form.zipCode}
                      onChange={(e) => updateField("zipCode", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Lead Time (days)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.leadTime}
                      onChange={(e) => updateField("leadTime", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Minimum Order ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minimumOrder}
                      onChange={(e) =>
                        updateField("minimumOrder", e.target.value)
                      }
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Notes
                  </label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={4}
                    className="bg-gray-50 border-none rounded-lg resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 transition flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-lg">
                      delete
                    </span>
                    Delete Vendor
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        if (vendor) {
                          setForm({
                            name: vendor.name,
                            contactPerson: vendor.contactPerson || "",
                            email: vendor.email,
                            phone: vendor.phone,
                            address: vendor.address || "",
                            city: vendor.city || "",
                            state: vendor.state || "",
                            zipCode: vendor.zipCode || "",
                            leadTime:
                              vendor.leadTime != null
                                ? String(vendor.leadTime)
                                : "",
                            minimumOrder:
                              vendor.minimumOrder != null
                                ? String(vendor.minimumOrder)
                                : "",
                            notes: vendor.notes || "",
                          });
                        }
                      }}
                      className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---- View Mode ---- */
        <>
          {/* Order History Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: "All-Time Spend",
                value: formatCurrency(orderAnalytics.totalSpendAllTime),
                icon: "payments",
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "This Month",
                value: formatCurrency(orderAnalytics.totalSpendThisMonth),
                icon: "calendar_today",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "This Year",
                value: formatCurrency(orderAnalytics.totalSpendThisYear),
                icon: "date_range",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Order Frequency",
                value: `${orderAnalytics.ordersPerWeek.toFixed(1)}/wk`,
                icon: "schedule",
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                label: "Avg Order Value",
                value: formatCurrency(orderAnalytics.avgOrderValue),
                icon: "receipt_long",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Price Trend (3mo)",
                value:
                  orderAnalytics.priceTrend !== 0
                    ? `${orderAnalytics.priceTrend > 0 ? "+" : ""}${orderAnalytics.priceTrend.toFixed(1)}%`
                    : "--",
                icon:
                  orderAnalytics.priceTrend > 0
                    ? "trending_up"
                    : orderAnalytics.priceTrend < 0
                      ? "trending_down"
                      : "trending_flat",
                color:
                  orderAnalytics.priceTrend > 0
                    ? "text-red-600"
                    : orderAnalytics.priceTrend < 0
                      ? "text-green-600"
                      : "text-gray-600",
                bg:
                  orderAnalytics.priceTrend > 0
                    ? "bg-red-50"
                    : orderAnalytics.priceTrend < 0
                      ? "bg-green-50"
                      : "bg-gray-50",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-5"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <div
                  className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${stat.color}`}
                  >
                    {stat.icon}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Reorder Banner */}
          {orderAnalytics.lastPO && (
            <div
              className="bg-white rounded-2xl p-5 flex items-center justify-between"
              style={{
                boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-xl">
                    replay
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Reorder Last PO
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Last order: {formatDate(orderAnalytics.lastPO.createdAt)}
                    {" -- "}
                    {formatCurrency(
                      orderAnalytics.lastPO.actualTotal ||
                        orderAnalytics.lastPO.estimatedTotal
                    )}
                    {" -- "}
                    Status:{" "}
                    <span className="font-semibold capitalize">
                      {orderAnalytics.lastPO.status}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleReorderLastPO}
                disabled={reordering}
                className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  add_shopping_cart
                </span>
                {reordering ? "Creating..." : "Reorder"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Identity Card */}
              <div
                className="bg-white rounded-2xl overflow-hidden relative"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-50 rounded-full opacity-60" />

                <div className="relative p-8">
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                    {vendor.name}
                  </h2>

                  <div className="flex items-center gap-2 mb-6">
                    {isPreferred && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <span className="material-symbols-outlined text-sm">
                          star
                        </span>
                        Preferred Partner
                      </span>
                    )}
                    {!isInactive && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        Active
                      </span>
                    )}
                    {isInactive && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="material-symbols-outlined text-gray-400 text-lg">
                        mail
                      </span>
                      <span>{vendor.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="material-symbols-outlined text-gray-400 text-lg">
                        phone
                      </span>
                      <span>{vendor.phone}</span>
                    </div>
                    {vendor.contactPerson && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-gray-400 text-lg">
                          person
                        </span>
                        <span>{vendor.contactPerson}</span>
                      </div>
                    )}
                    {fullAddress && (
                      <div className="flex items-start gap-3 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-gray-400 text-lg mt-0.5">
                          location_on
                        </span>
                        <span>{fullAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditing(true)}
                      className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 rounded-xl transition flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        edit
                      </span>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteOpen(true)}
                      className="h-10 px-5 bg-red-50 hover:bg-red-100 text-sm font-semibold text-red-600 rounded-xl transition flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        delete
                      </span>
                      Delete
                    </button>
                    <button
                      onClick={() => setCompareOpen(true)}
                      className="h-10 px-5 bg-purple-50 hover:bg-purple-100 text-sm font-semibold text-purple-700 rounded-xl transition flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        compare_arrows
                      </span>
                      Compare Prices
                    </button>
                  </div>
                </div>
              </div>

              {/* Supplied Ingredients */}
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">
                    Supplied Ingredients
                  </h3>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          Name
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          Category
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          Unit
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                          Cost/Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorIngredients.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-12 text-center text-sm text-gray-400 font-medium"
                          >
                            No supplied ingredients linked yet.
                          </td>
                        </tr>
                      ) : (
                        vendorIngredients.map((ing) => (
                          <tr
                            key={ing.id}
                            className="border-b border-gray-50 last:border-b-0"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {ing.name}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                {ing.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {ing.unit}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {formatCurrency(ing.costPerUnit)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order History */}
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    Order History
                  </h3>
                  <span className="text-xs font-bold text-gray-400">
                    {orderAnalytics.totalOrders} order
                    {orderAnalytics.totalOrders !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-6">
                  {vendorPOs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No purchase orders yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {vendorPOs.slice(0, 10).map((po) => {
                        const statusColors: Record<string, string> = {
                          draft: "bg-gray-100 text-gray-600",
                          sent: "bg-blue-100 text-blue-700",
                          "partially-received":
                            "bg-amber-100 text-amber-700",
                          "fully-received": "bg-green-100 text-green-700",
                        };
                        return (
                          <div
                            key={po.id}
                            className="flex items-center justify-between rounded-xl p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {formatDate(po.createdAt)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatCurrency(
                                  po.actualTotal || po.estimatedTotal
                                )}
                              </p>
                            </div>
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                statusColors[po.status] ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {po.status.replace("-", " ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              {vendor.notes && (
                <div
                  className="bg-white rounded-2xl p-6"
                  style={{
                    boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                  }}
                >
                  <h3 className="text-sm font-bold text-gray-900 mb-4">
                    Internal Notes
                  </h3>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-sm">
                        person
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {vendor.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right column: 1/3 - Logistics + Delivery Schedule */}
            <div className="space-y-6">
              {/* Logistics Specs */}
              <div
                className="bg-white rounded-2xl p-6"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <h3 className="text-sm font-bold text-gray-900 mb-5">
                  Logistics Specs
                </h3>

                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Lead Time
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {vendor.leadTime != null ? (
                        <>
                          {vendor.leadTime}{" "}
                          <span className="text-sm font-medium text-gray-400">
                            day{vendor.leadTime !== 1 ? "s" : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">
                          {"\u2014"}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      Min Order
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {vendor.minimumOrder != null ? (
                        formatCurrency(vendor.minimumOrder)
                      ) : (
                        <span className="text-sm font-medium text-gray-400">
                          {"\u2014"}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      On-Time Delivery
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      95%{" "}
                      <span className="text-sm font-medium text-gray-400">
                        estimated
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Schedule */}
              <div
                className="bg-white rounded-2xl p-6"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <h3 className="text-sm font-bold text-gray-900 mb-5">
                  Delivery Schedule
                </h3>

                <div className="space-y-4">
                  {/* Week view */}
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2">
                      Delivery Days
                    </p>
                    <div className="flex items-center gap-2">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.key}
                          onClick={() => toggleDeliveryDay(day.key)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                            deliveryDays.includes(day.key)
                              ? "bg-blue-700 text-white"
                              : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Next expected delivery */}
                  {nextDeliveryDay && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                        Next Expected Delivery
                      </p>
                      <p className="text-lg font-extrabold text-gray-900">
                        {nextDeliveryDay.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}

                  {/* Lead time indicator */}
                  {vendor.leadTime != null && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                        Lead Time
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${Math.min(100, (vendor.leadTime / 7) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-500">
                          {vendor.leadTime}d
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSaveDeliveryDays}
                    className="w-full h-9 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">
                      save
                    </span>
                    Save Schedule
                  </button>
                </div>
              </div>

              {/* Compliance & Documents */}
              <div
                className="bg-white rounded-2xl p-6"
                style={{
                  boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
                }}
              >
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  Compliance & Documents
                </h3>
                <div className="text-sm text-gray-400 font-medium text-center py-6">
                  No documents uploaded yet.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Price Comparison Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price Comparison - {vendor?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {priceComparisons.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No ingredients linked to this vendor for comparison.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {priceComparisons.map((comp) => (
                  <div
                    key={comp.ingredientName}
                    className="flex items-center justify-between rounded-xl p-4 bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {comp.ingredientName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current: {formatCurrency(comp.currentPrice)}/
                        {comp.unit}
                      </p>
                    </div>
                    {comp.bestAlternativeVendor && comp.savingsPerUnit > 0 ? (
                      <div className="text-right">
                        <p className="text-xs font-bold text-green-600">
                          Save{" "}
                          {formatCurrency(comp.savingsPerUnit)}/{comp.unit}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          via {comp.bestAlternativeVendor} @{" "}
                          {formatCurrency(comp.bestAlternativePrice!)}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                        <span className="material-symbols-outlined text-xs">
                          check
                        </span>
                        Best Price
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete <strong>{vendor.name}</strong>? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

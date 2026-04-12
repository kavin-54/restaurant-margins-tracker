"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollection } from "@/lib/hooks/useFirestore";
import { addDocument } from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrder, POStatus } from "@/lib/types/purchaseOrder";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially-received", label: "Partially Received" },
  { value: "fully-received", label: "Fully Received" },
];

const statusBadgeStyles: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  "partially-received": "bg-amber-100 text-amber-700",
  "fully-received": "bg-green-100 text-green-700",
};

const statusLabels: Record<POStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  "partially-received": "Partially Received",
  "fully-received": "Fully Received",
};

function formatDate(date: Date | any): string {
  if (!date) return "\u2014";
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ITEMS_PER_PAGE = 10;

export default function PurchasingPage() {
  const router = useRouter();
  const { data: orders, loading } = useCollection<PurchaseOrder>(
    "purchaseOrders",
    orderBy("createdAt", "desc")
  );

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newWeekStart, setNewWeekStart] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((po) => {
      const matchesStatus =
        statusFilter === "all" || po.status === statusFilter;
      const matchesSearch = po.vendorName
        ?.toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const weeklySpend = useMemo(() => {
    if (!orders) return 0;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return orders
      .filter((po) => {
        const d = po.createdAt instanceof Date ? po.createdAt : (po.createdAt as any)?.toDate?.() ?? new Date(po.createdAt as any);
        return d >= startOfWeek;
      })
      .reduce((sum, po) => sum + (po.actualTotal || po.estimatedTotal || 0), 0);
  }, [orders]);

  async function handleCreatePO() {
    if (!newVendorName.trim() || !newWeekStart) return;
    setCreating(true);
    try {
      const newPO = await addDocument<PurchaseOrder>("purchaseOrders", {
        weekStartDate: new Date(newWeekStart),
        vendorId: "",
        vendorName: newVendorName.trim(),
        status: "draft",
        eventIds: [],
        estimatedTotal: 0,
        actualTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setShowCreateDialog(false);
      setNewVendorName("");
      setNewWeekStart("");
      router.push(`/purchasing/${newPO.id}`);
    } catch (err) {
      console.error("Failed to create PO:", err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Track and manage vendor orders"
        action={{
          label: "Create PO",
          onClick: () => setShowCreateDialog(true),
          icon: "add",
        }}
      />

      {orders && orders.length > 0 ? (
        <>
          {/* Filter Pills */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setCurrentPage(1); }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-150 ${
                  statusFilter === s.value
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Weekly Spend Stat Card */}
          <div className="mb-6">
            <div className="bg-white rounded-2xl ambient-shadow p-4 inline-block">
              <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Weekly Spend</p>
              <p className="text-2xl font-extrabold text-blue-700 mt-1">{formatCurrency(weeklySpend)}</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                placeholder="Search by vendor..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-medium">
              No purchase orders match your filters.
            </div>
          ) : (
            <>
              {/* Data Table */}
              <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">PO #</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Vendor</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden sm:table-cell">Week / Date</th>
                      <th className="text-left px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400">Status</th>
                      <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">Est. Total</th>
                      <th className="text-right px-5 py-3 uppercase tracking-widest text-[10px] font-bold text-gray-400 hidden md:table-cell">Actual Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((po) => (
                      <tr
                        key={po.id}
                        className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 group transition-colors duration-100"
                        onClick={() => router.push(`/purchasing/${po.id}`)}
                      >
                        <td className="px-5 py-3.5 text-sm text-blue-700 font-bold font-mono">
                          {po.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                          {po.vendorName}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">
                          {formatDate(po.weekStartDate)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeStyles[po.status]}`}>
                            {statusLabels[po.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700 text-right hidden md:table-cell">
                          {formatCurrency(po.estimatedTotal)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700 text-right hidden md:table-cell">
                          {po.actualTotal ? formatCurrency(po.actualTotal) : "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}\u2013{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          page === currentPage
                            ? "bg-blue-700 text-white"
                            : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon="shopping_cart"
          title="No purchase orders yet"
          description="Create your first purchase order to start tracking vendor orders and receiving."
          action={{
            label: "Create PO",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="vendorName" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Vendor Name</Label>
              <input
                id="vendorName"
                placeholder="e.g. Sysco, US Foods"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekStart" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Week Starting</Label>
              <input
                id="weekStart"
                type="date"
                value={newWeekStart}
                onChange={(e) => setNewWeekStart(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={!newVendorName.trim() || !newWeekStart || creating}
                className="h-10 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create PO"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
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
import { useCollection } from "@/lib/hooks/useFirestore";
import { addDocument } from "@/lib/firebase/firestore";
import { orderBy } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrder, POStatus } from "@/lib/types/purchaseOrder";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially-received", label: "Partially Received" },
  { value: "fully-received", label: "Fully Received" },
];

const statusBadgeStyles: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  "partially-received": "bg-yellow-100 text-yellow-700",
  "fully-received": "bg-green-100 text-green-700",
};

const statusLabels: Record<POStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  "partially-received": "Partially Received",
  "fully-received": "Fully Received",
};

function formatDate(date: Date | any): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
        description="Track vendor orders and receiving"
        action={{
          label: "Create PO",
          onClick: () => setShowCreateDialog(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {orders && orders.length > 0 ? (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No purchase orders match your filters.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="hidden sm:table-cell">Week</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Est. Total
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Actual Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((po) => (
                    <TableRow
                      key={po.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/purchasing/${po.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {po.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {po.vendorName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(po.weekStartDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusBadgeStyles[po.status]}
                        >
                          {statusLabels[po.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {formatCurrency(po.estimatedTotal)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {po.actualTotal
                          ? formatCurrency(po.actualTotal)
                          : "—"}
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
          icon={<ShoppingCart className="h-12 w-12" />}
          title="No purchase orders yet"
          description="Create your first purchase order to start tracking vendor orders and receiving."
          action={{
            label: "Create PO",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                placeholder="e.g. Sysco, US Foods"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekStart">Week Starting</Label>
              <Input
                id="weekStart"
                type="date"
                value={newWeekStart}
                onChange={(e) => setNewWeekStart(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePO}
                disabled={!newVendorName.trim() || !newWeekStart || creating}
              >
                {creating ? "Creating..." : "Create PO"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

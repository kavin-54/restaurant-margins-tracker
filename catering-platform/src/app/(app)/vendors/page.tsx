"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVendors } from "@/lib/hooks/useVendors";

export default function VendorsPage() {
  const { data: vendors, loading, error } = useVendors();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!vendors) return [];
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q))
    );
  }, [vendors, search]);

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load vendors. Please try again.
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Vendors"
        description="Manage your vendor contacts and supply chain"
        action={{
          label: "Add Vendor",
          href: "/vendors/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {vendors && vendors.length > 0 ? (
        <>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No vendors match your search.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Lead Time (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((vendor) => (
                    <TableRow key={vendor.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="block font-medium text-foreground hover:underline"
                        >
                          {vendor.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.contactPerson || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.email}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {vendor.leadTime != null ? vendor.leadTime : "—"}
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
          icon={<Truck className="h-12 w-12" />}
          title="No vendors yet"
          description="Add your first vendor to start managing your supply chain and orders."
          action={{ label: "Add Vendor", href: "/vendors/new" }}
        />
      )}
    </div>
  );
}

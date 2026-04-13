"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useVendors, deleteVendor } from "@/lib/hooks/useVendors";
import { useToast } from "@/components/ui/use-toast";

function getStatusBadge(vendor: { notes?: string }) {
  // Derive status from vendor data - vendors with notes containing "preferred" are preferred,
  // otherwise active by default
  const notes = (vendor.notes || "").toLowerCase();
  if (notes.includes("preferred")) {
    return { label: "Preferred", classes: "bg-blue-100 text-blue-700" };
  }
  if (notes.includes("inactive")) {
    return { label: "Inactive", classes: "bg-gray-100 text-gray-600" };
  }
  return { label: "Active", classes: "bg-green-100 text-green-700" };
}

import { limit } from "firebase/firestore";
import Loading from "../loading";

export default function VendorsPage() {
  const constraints = useMemo(() => [limit(100)], []);
  const { data: vendors, loading, error } = useVendors(constraints);
  const { toast } = useToast();
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

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteVendor(id);
      toast({ title: "Deleted", description: `${name} has been removed.` });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete vendor.",
        variant: "destructive",
      });
    }
  }

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="p-6 text-red-600">
        Failed to load vendors. Please try again.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Manage your supplier network"
        action={{
          label: "Add Vendor",
          href: "/vendors/new",
          icon: "add",
        }}
      />

      {vendors && vendors.length > 0 ? (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-gray-50 border-0 rounded-lg text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              No vendors match your search.
            </div>
          ) : (
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Contact
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Phone
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Categories
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((vendor) => {
                    const status = getStatusBadge(vendor);
                    return (
                      <tr
                        key={vendor.id}
                        className="group hover:bg-gray-50 transition cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-blue-600 text-base">
                                local_shipping
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {vendor.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {vendor.contactPerson || "\u2014"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {vendor.phone}
                        </td>
                        <td className="px-6 py-4">
                          {vendor.specialties && vendor.specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {vendor.specialties.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"
                                >
                                  {s}
                                </span>
                              ))}
                              {vendor.specialties.length > 2 && (
                                <span className="text-xs text-gray-400 font-medium">
                                  +{vendor.specialties.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.classes}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <Link
                              href={`/vendors/${vendor.id}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            >
                              <span className="material-symbols-outlined text-lg">
                                edit
                              </span>
                            </Link>
                            <button
                              onClick={(e) =>
                                handleDelete(e, vendor.id, vendor.name)
                              }
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <span className="material-symbols-outlined text-lg">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="local_shipping"
          title="No vendors yet"
          description="Add your first vendor to start managing your supply chain and orders."
          action={{ label: "Add Vendor", href: "/vendors/new" }}
        />
      )}
    </div>
  );
}

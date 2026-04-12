"use client";

import React, { useState, useEffect } from "react";
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
import { formatCurrency } from "@/lib/utils";

const WEEKDAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
];

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const { data: vendor, loading, error } = useVendor(id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        minimumOrder: vendor.minimumOrder != null ? String(vendor.minimumOrder) : "",
        notes: vendor.notes || "",
      });
    }
  }, [vendor]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      });
      toast({ title: "Vendor updated", description: "Changes have been saved." });
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
      toast({ title: "Vendor deleted", description: "The vendor has been removed." });
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

  if (loading) return <LoadingScreen />;
  if (error || !vendor) {
    return (
      <div className="p-6 text-red-600">
        Vendor not found or failed to load.
      </div>
    );
  }

  const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zipCode]
    .filter(Boolean)
    .join(", ");

  const isPreferred = (vendor.notes || "").toLowerCase().includes("preferred");
  const isInactive = (vendor.notes || "").toLowerCase().includes("inactive");

  // Derive delivery days from vendor data (placeholder - could be extended)
  const deliveryDays: string[] = [];

  return (
    <div>
      <PageHeader
        title={vendor.name}
        backHref="/vendors"
      />

      {editing ? (
        /* ── Edit Mode ── */
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="border-l-4 border-blue-700 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Edit Vendor</h2>

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
                      onChange={(e) => updateField("contactPerson", e.target.value)}
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
                      onChange={(e) => updateField("minimumOrder", e.target.value)}
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
                    <span className="material-symbols-outlined text-lg">delete</span>
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
                              vendor.leadTime != null ? String(vendor.leadTime) : "",
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
        /* ── View Mode ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identity Card */}
            <div className="bg-white rounded-2xl overflow-hidden ambient-shadow relative">
              {/* Decorative accent circle */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-50 rounded-full opacity-60" />

              <div className="relative p-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                  {vendor.name}
                </h2>

                {/* Status badges */}
                <div className="flex items-center gap-2 mb-6">
                  {isPreferred && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      <span className="material-symbols-outlined text-sm">star</span>
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

                {/* Contact info */}
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

                {/* Edit / Delete buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 rounded-xl transition flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="h-10 px-5 bg-red-50 hover:bg-red-100 text-sm font-semibold text-red-600 rounded-xl transition flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Supplied Ingredients */}
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
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
                        In Stock
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Last Price
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm text-gray-400 font-medium"
                      >
                        No supplied ingredients linked yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Internal Notes */}
            {vendor.notes && (
              <div className="bg-white rounded-2xl ambient-shadow p-6">
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

            {/* Compliance & Documents */}
            <div className="bg-white rounded-2xl ambient-shadow p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                Compliance & Documents
              </h3>
              <div className="text-sm text-gray-400 font-medium text-center py-6">
                No documents uploaded yet.
              </div>
            </div>
          </div>

          {/* Right column: 1/3 - Logistics */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl ambient-shadow p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">
                Logistics Specs
              </h3>

              <div className="space-y-5">
                {/* Lead Time */}
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
                      <span className="text-sm font-medium text-gray-400">{"\u2014"}</span>
                    )}
                  </p>
                </div>

                {/* Minimum Order */}
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                    Min Order
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900">
                    {vendor.minimumOrder != null ? (
                      formatCurrency(vendor.minimumOrder)
                    ) : (
                      <span className="text-sm font-medium text-gray-400">{"\u2014"}</span>
                    )}
                  </p>
                </div>

                {/* Delivery Days */}
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2">
                    Delivery Days
                  </p>
                  <div className="flex items-center gap-2">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day.key}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          deliveryDays.includes(day.key)
                            ? "bg-blue-700 text-white"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* View Order History button */}
              <button className="w-full mt-6 h-10 bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 rounded-xl transition flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">history</span>
                View Order History
              </button>
            </div>
          </div>
        </div>
      )}

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

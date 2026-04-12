"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { addVendor } from "@/lib/hooks/useVendors";

export default function NewVendorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

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

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      await addVendor({
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast({ title: "Vendor added", description: `${form.name} has been added.` });
      router.push("/vendors");
    } catch {
      toast({
        title: "Error",
        description: "Failed to add vendor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add Vendor" backHref="/vendors" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="border-l-4 border-blue-700 p-8">
              <div className="space-y-5">
                {/* Name + Contact Person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Vendor name"
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
                      placeholder="Primary contact"
                      value={form.contactPerson}
                      onChange={(e) => updateField("contactPerson", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
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
                      placeholder="(555) 123-4567"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Address
                  </label>
                  <Input
                    placeholder="Street address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="bg-gray-50 border-none h-12 rounded-lg"
                  />
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      City
                    </label>
                    <Input
                      placeholder="City"
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
                      placeholder="State"
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
                      placeholder="Zip"
                      value={form.zipCode}
                      onChange={(e) => updateField("zipCode", e.target.value)}
                      className="bg-gray-50 border-none h-12 rounded-lg"
                    />
                  </div>
                </div>

                {/* Lead Time + Minimum Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Lead Time (days)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 3"
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
                      placeholder="e.g. 100.00"
                      value={form.minimumOrder}
                      onChange={(e) => updateField("minimumOrder", e.target.value)}
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
                    placeholder="Any additional notes about this vendor..."
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
              onClick={() => router.push("/vendors")}
              className="h-11 px-5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

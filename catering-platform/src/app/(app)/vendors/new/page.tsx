"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="p-6">
      <PageHeader title="Add Vendor" backHref="/vendors" />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Vendor name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  placeholder="Primary contact"
                  value={form.contactPerson}
                  onChange={(e) => updateField("contactPerson", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  placeholder="Zip"
                  value={form.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTime">Lead Time (days)</Label>
                <Input
                  id="leadTime"
                  type="number"
                  min="0"
                  placeholder="e.g. 3"
                  value={form.leadTime}
                  onChange={(e) => updateField("leadTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
                <Input
                  id="minimumOrder"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 100.00"
                  value={form.minimumOrder}
                  onChange={(e) => updateField("minimumOrder", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this vendor..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/vendors")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Vendor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

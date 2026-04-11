"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  useVendor,
  updateVendor,
  deleteVendor,
} from "@/lib/hooks/useVendors";
import { formatCurrency } from "@/lib/utils";

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
      <div className="p-6 text-destructive">
        Vendor not found or failed to load.
      </div>
    );
  }

  const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-6">
      <PageHeader
        title={vendor.name}
        description={vendor.contactPerson ? `Contact: ${vendor.contactPerson}` : undefined}
        backHref="/vendors"
        action={
          !editing
            ? {
                label: "Edit",
                onClick: () => setEditing(true),
                icon: <Pencil className="h-4 w-4" />,
              }
            : undefined
        }
      />

      <div className="max-w-2xl space-y-6">
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
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
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
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
                      value={form.minimumOrder}
                      onChange={(e) => updateField("minimumOrder", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Vendor
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
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
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.contactPerson && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{vendor.contactPerson}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{vendor.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{vendor.phone}</span>
              </div>
              {fullAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{fullAddress}</span>
                </div>
              )}

              <div className="pt-2 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lead Time</p>
                  <p className="font-medium">
                    {vendor.leadTime != null
                      ? `${vendor.leadTime} day${vendor.leadTime !== 1 ? "s" : ""}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Order</p>
                  <p className="font-medium">
                    {vendor.minimumOrder != null
                      ? formatCurrency(vendor.minimumOrder)
                      : "—"}
                  </p>
                </div>
              </div>

              {vendor.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap">{vendor.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Supplied Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Supplied ingredients coming soon.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
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

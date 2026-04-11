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
import { useClient, updateClient, deleteClient } from "@/lib/hooks/useClients";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const { data: client, loading, error } = useClient(id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zipCode || "",
        notes: client.notes || "",
      });
    }
  }, [client]);

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
      await updateClient(id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast({ title: "Client updated", description: "Changes have been saved." });
      setEditing(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteClient(id);
      toast({ title: "Client deleted", description: "The client has been removed." });
      router.push("/clients");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error || !client) {
    return (
      <div className="p-6 text-destructive">
        Client not found or failed to load.
      </div>
    );
  }

  const fullAddress = [client.address, client.city, client.state, client.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-6">
      <PageHeader
        title={client.name}
        description={client.company || undefined}
        backHref="/clients"
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
              <CardTitle>Edit Client</CardTitle>
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
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(e) => updateField("company", e.target.value)}
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
                    Delete Client
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        if (client) {
                          setForm({
                            name: client.name,
                            email: client.email,
                            phone: client.phone,
                            company: client.company || "",
                            address: client.address || "",
                            city: client.city || "",
                            state: client.state || "",
                            zipCode: client.zipCode || "",
                            notes: client.notes || "",
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
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{client.phone}</span>
              </div>
              {fullAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{fullAddress}</span>
                </div>
              )}
              {client.company && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{client.company}</p>
                </div>
              )}
              {client.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Event History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Event history coming soon.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{client.name}</strong>? This
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

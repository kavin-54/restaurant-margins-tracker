"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
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
import { useEvents, type Event } from "@/lib/hooks/useEvents";

function formatDate(date: Date | any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date.seconds * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "confirmed":
    case "inquiry":
    case "proposal":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "COMPLETED";
    case "confirmed":
      return "CONFIRMED";
    case "inquiry":
      return "INQUIRY";
    case "proposal":
      return "IN PLANNING";
    case "cancelled":
      return "CANCELLED";
    default:
      return status.toUpperCase();
  }
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const { data: client, loading, error } = useClient(id);
  const { data: allEvents } = useEvents();

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

  const clientEvents = useMemo(() => {
    if (!allEvents || !id) return [];
    return allEvents.filter((e) => e.clientId === id);
  }, [allEvents, id]);

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
      toast({
        title: "Client updated",
        description: "Changes have been saved.",
      });
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
      toast({
        title: "Client deleted",
        description: "The client has been removed.",
      });
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

  // Parse dietary preferences from notes or a dedicated field
  const dietaryPreferences = client.notes
    ? client.notes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const isUpcoming = (event: Event) => {
    const d =
      event.eventDate instanceof Date
        ? event.eventDate
        : new Date((event.eventDate as any).seconds * 1000);
    return d >= new Date();
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={client.name}
        description={client.company || undefined}
        backHref="/clients"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Card + Preferences */}
        <div className="space-y-6">
          {editing ? (
            /* Edit Form */
            <div className="bg-white/85 backdrop-blur-[12px] rounded-2xl ambient-shadow p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                Edit Client
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="city" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      State
                    </Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Zip
                    </Label>
                    <Input
                      id="zipCode"
                      value={form.zipCode}
                      onChange={(e) => updateField("zipCode", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                    <Button onClick={handleSave} disabled={saving} size="sm">
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Contact Info Card (glass panel) */
            <div className="bg-white/85 backdrop-blur-[12px] rounded-2xl ambient-shadow p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                Contact Information
              </h2>
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-600 text-lg">
                      mail
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Email
                    </p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {client.email}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-600 text-lg">
                      phone
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Phone
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {client.phone}
                    </p>
                  </div>
                </div>

                {/* Address */}
                {fullAddress && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-lg">
                        location_on
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        Address
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {fullAddress}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit / Delete buttons */}
              <div className="flex gap-2 mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 h-9 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    edit
                  </span>
                  Edit
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex-1 h-9 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    delete
                  </span>
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Dietary Preferences */}
          {dietaryPreferences.length > 0 && !editing && (
            <div className="bg-white/85 backdrop-blur-[12px] rounded-2xl ambient-shadow p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Dietary Preferences
              </h2>
              <div className="flex flex-wrap gap-2">
                {dietaryPreferences.map((pref) => (
                  <span
                    key={pref}
                    className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100/30 text-purple-700"
                  >
                    {pref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Event History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl ambient-shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Event History
              </h2>
              {clientEvents.length > 0 && (
                <span className="text-xs font-bold text-gray-400">
                  {clientEvents.length} event
                  {clientEvents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {clientEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-gray-400 text-2xl">
                    event
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-500">
                  No events yet for this client.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientEvents.map((event) => {
                  const upcoming = isUpcoming(event);
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={`block rounded-xl p-4 transition-colors hover:bg-gray-50 ${
                        upcoming ? "border-l-4 border-blue-700" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {event.eventType || "Event"}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">
                                calendar_today
                              </span>
                              {formatDate(event.eventDate)}
                            </span>
                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">
                                group
                              </span>
                              {event.guestCount} guests
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(
                            event.status
                          )}`}
                        >
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                {/* View Full Archive link */}
                {clientEvents.length > 3 && (
                  <div className="pt-3 border-t border-gray-100 text-center">
                    <Link
                      href="/events"
                      className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      View Full Archive
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
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

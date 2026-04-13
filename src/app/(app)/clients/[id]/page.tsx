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
import { useEvents, addEvent, type Event } from "@/lib/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import {
  addDocument,
  getDocuments,
} from "@/lib/firebase/firestore";
import { useCollection } from "@/lib/hooks/useFirestore";
import { orderBy } from "firebase/firestore";

// --- Allergen constants ---
const ALLERGENS = [
  "Nuts",
  "Dairy",
  "Gluten",
  "Shellfish",
  "Eggs",
  "Soy",
  "Sesame",
] as const;

// --- Communication note type ---
interface CommunicationNote {
  id: string;
  text: string;
  addedBy: string;
  addedByEmail: string;
  createdAt: Date;
}

function formatDate(date: Date | any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date.seconds * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(date: Date | any): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date.seconds * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function toDate(date: Date | any): Date {
  if (!date) return new Date(0);
  return date instanceof Date ? date : new Date(date.seconds * 1000);
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
  const { user } = useAuth();
  const id = params.id as string;
  const { data: client, loading, error } = useClient(id);
  const { data: allEvents } = useEvents();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Communication log
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Allergen state
  const [allergens, setAllergens] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [savingAllergens, setSavingAllergens] = useState(false);

  // Template creation
  const [creatingTemplate, setCreatingTemplate] = useState(false);

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

  // Communication notes subcollection
  const { data: communicationNotes } = useCollection<CommunicationNote>(
    `clients/${id}/notes`,
    orderBy("createdAt", "desc")
  );

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
      // Load allergens from client data
      setAllergens((client as any).allergens || []);
      setSpecialInstructions((client as any).specialInstructions || "");
    }
  }, [client]);

  const clientEvents = useMemo(() => {
    if (!allEvents || !id) return [];
    return allEvents.filter((e) => e.clientId === id);
  }, [allEvents, id]);

  // --- Revenue summary calculations ---
  const revenueSummary = useMemo(() => {
    const completedEvents = clientEvents.filter(
      (e) => e.status === "completed"
    );
    const now = new Date();
    const thisYearEvents = clientEvents.filter((e) => {
      const d = toDate(e.eventDate);
      return d.getFullYear() === now.getFullYear();
    });

    const totalRevenue = completedEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const totalCost = completedEvents.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0
    );
    const avgMargin =
      completedEvents.length > 0
        ? completedEvents.reduce((sum, e) => sum + (e.marginPercentage || 0), 0) /
          completedEvents.length
        : 0;
    const avgGuests =
      clientEvents.length > 0
        ? Math.round(
            clientEvents.reduce((sum, e) => sum + (e.guestCount || 0), 0) /
              clientEvents.length
          )
        : 0;

    const clientSince = client?.createdAt
      ? formatDate(client.createdAt)
      : "";

    return {
      totalRevenue,
      totalCost,
      totalEvents: clientEvents.length,
      thisYearEvents: thisYearEvents.length,
      avgGuests,
      avgMargin,
      clientSince,
    };
  }, [clientEvents, client]);

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
      } as any);
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

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await addDocument<CommunicationNote>(`clients/${id}/notes`, {
        text: newNote.trim(),
        addedBy: user?.displayName || user?.email || "Unknown",
        addedByEmail: user?.email || "",
        createdAt: new Date(),
      } as any);
      setNewNote("");
      toast({ title: "Note added" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add note.",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  }

  function toggleAllergen(allergen: string) {
    setAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  }

  async function handleSaveAllergens() {
    setSavingAllergens(true);
    try {
      await updateClient(id, {
        allergens,
        specialInstructions: specialInstructions.trim() || undefined,
      } as any);
      toast({ title: "Dietary profile updated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update dietary profile.",
        variant: "destructive",
      });
    } finally {
      setSavingAllergens(false);
    }
  }

  async function handleCreateTemplateFromEvent(event: Event) {
    setCreatingTemplate(true);
    try {
      await addEvent({
        clientId: id,
        clientName: client!.name,
        eventDate: new Date(),
        eventType: event.eventType || "Event",
        guestCount: event.guestCount,
        status: "inquiry",
        totalCost: 0,
        totalPrice: 0,
        marginPercentage: 0,
        notes: `Template from ${event.eventType} on ${formatDate(event.eventDate)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast({
        title: "Event created from template",
        description:
          "A new event has been created with the same settings. Edit it to adjust details.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create event from template.",
        variant: "destructive",
      });
    } finally {
      setCreatingTemplate(false);
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

  const isUpcoming = (event: Event) => {
    const d = toDate(event.eventDate);
    return d >= new Date();
  };

  const completedEvents = clientEvents.filter((e) => e.status === "completed");
  const upcomingEvents = clientEvents.filter(isUpcoming);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={client.name}
        description={client.company || undefined}
        backHref="/clients"
      />

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(revenueSummary.totalRevenue),
            icon: "payments",
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Total Events",
            value: revenueSummary.totalEvents.toString(),
            icon: "event",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "This Year",
            value: revenueSummary.thisYearEvents.toString(),
            icon: "calendar_today",
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Avg Guests",
            value: revenueSummary.avgGuests.toString(),
            icon: "group",
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Avg Margin",
            value: `${revenueSummary.avgMargin.toFixed(1)}%`,
            icon: "trending_up",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Client Since",
            value: revenueSummary.clientSince || "--",
            icon: "schedule",
            color: "text-gray-600",
            bg: "bg-gray-50",
            small: true,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5"
            style={{
              boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
            }}
          >
            <div
              className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}
            >
              <span
                className={`material-symbols-outlined text-lg ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>
            <p
              className={`${
                stat.small ? "text-sm" : "text-2xl"
              } font-extrabold text-gray-900`}
            >
              {stat.value}
            </p>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Card + Allergen Profile + Communication Log */}
        <div className="space-y-6">
          {editing ? (
            /* Edit Form */
            <div
              className="bg-white rounded-2xl p-6"
              style={{
                boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
              }}
            >
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                Edit Client
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="company"
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
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
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
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
                  <Label
                    htmlFor="address"
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
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
                    <Label
                      htmlFor="city"
                      className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      City
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="state"
                      className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      State
                    </Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="zipCode"
                      className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
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
                  <Label
                    htmlFor="notes"
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
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
            /* Contact Info Card */
            <div
              className="bg-white rounded-2xl p-6"
              style={{
                boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
              }}
            >
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                Contact Information
              </h2>
              <div className="space-y-4">
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

          {/* Dietary & Allergen Profile */}
          {!editing && (
            <div
              className="bg-white rounded-2xl p-6"
              style={{
                boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
              }}
            >
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Dietary & Allergen Profile
              </h2>

              {/* Allergen checklist */}
              <div className="flex flex-wrap gap-2 mb-4">
                {ALLERGENS.map((allergen) => {
                  const active = allergens.includes(allergen);
                  return (
                    <button
                      key={allergen}
                      onClick={() => toggleAllergen(allergen)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        active
                          ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {active ? "check_circle" : "circle"}
                      </span>
                      {allergen}
                    </button>
                  );
                })}
              </div>

              {/* Special Instructions */}
              <div className="space-y-2 mb-4">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Special Instructions
                </label>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                  placeholder="Detailed dietary notes, preferences, restrictions..."
                  className="text-sm"
                />
              </div>

              <button
                onClick={handleSaveAllergens}
                disabled={savingAllergens}
                className="w-full h-9 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">
                  save
                </span>
                {savingAllergens ? "Saving..." : "Save Dietary Profile"}
              </button>
            </div>
          )}

          {/* Communication Log */}
          {!editing && (
            <div
              className="bg-white rounded-2xl p-6"
              style={{
                boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
              }}
            >
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Notes & Communication
              </h2>

              {/* Add note */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    add
                  </span>
                  Add
                </button>
              </div>

              {/* Notes timeline */}
              {communicationNotes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No notes yet. Add a note above.
                </p>
              ) : (
                <div className="space-y-0">
                  {communicationNotes.map((note) => (
                    <div
                      key={note.id}
                      className="border-l-4 border-blue-700 pl-4 py-3"
                    >
                      <p className="text-sm text-gray-900">{note.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {note.addedBy}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[10px] font-medium text-gray-400">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Event History + Event Templates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event History */}
          <div
            className="bg-white rounded-2xl p-6"
            style={{
              boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
            }}
          >
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
                    <div key={event.id} className="flex items-center gap-3">
                      <Link
                        href={`/events/${event.id}`}
                        className={`flex-1 block rounded-xl p-4 transition-colors hover:bg-gray-50 ${
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
                              {event.totalPrice > 0 && (
                                <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">
                                    payments
                                  </span>
                                  {formatCurrency(event.totalPrice)}
                                </span>
                              )}
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
                    </div>
                  );
                })}

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

          {/* Event Templates */}
          {completedEvents.length > 0 && (
            <div
              className="bg-white rounded-2xl p-6"
              style={{
                boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Event Templates
                </h2>
                <span className="text-xs text-gray-400 font-medium">
                  Create new events from past events
                </span>
              </div>

              <div className="space-y-3">
                {completedEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {event.eventType || "Event"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(event.eventDate)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {event.guestCount} guests
                        </span>
                        {event.totalPrice > 0 && (
                          <span className="text-xs text-gray-500">
                            {formatCurrency(event.totalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreateTemplateFromEvent(event)}
                      disabled={creatingTemplate}
                      className="h-8 px-3 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">
                        content_copy
                      </span>
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

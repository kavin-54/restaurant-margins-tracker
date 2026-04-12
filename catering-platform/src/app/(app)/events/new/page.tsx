"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { LoadingSpinner } from "@/components/layout/LoadingScreen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useClients } from "@/lib/hooks/useClients";
import { addEvent } from "@/lib/hooks/useEvents";
import { useEvents } from "@/lib/hooks/useEvents";
import { useIngredients } from "@/lib/hooks/useIngredients";

const SERVICE_STYLES = [
  "Buffet",
  "Plated",
  "Cocktail",
  "Drop-Off",
  "Family Style",
  "Food Stations",
];

export default function NewEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: events } = useEvents();
  const { data: ingredients } = useIngredients();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eventName: "",
    clientId: "",
    eventDate: "",
    eventType: "",
    guestCount: "",
    notes: "",
  });

  if (clientsLoading) return <LoadingScreen />;

  const selectedClient = clients?.find((c) => c.id === form.clientId);
  const activeJobsCount = events?.filter((e) => e.status === "confirmed" || e.status === "inquiry").length ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.eventName.trim() || !form.clientId || !form.eventDate || !form.eventType || !form.guestCount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const newEvent = await addEvent({
        clientId: form.clientId,
        clientName: selectedClient?.name || "",
        eventDate: new Date(form.eventDate + "T00:00:00"),
        eventType: form.eventType,
        guestCount: parseInt(form.guestCount, 10),
        status: "inquiry",
        totalCost: 0,
        totalPrice: 0,
        marginPercentage: 0,
        notes: form.notes.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      toast({ title: "Event created", description: `${form.eventName} has been created.` });
      router.push(`/events/${newEvent.id}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Create New Event" backHref="/events" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Form card */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden flex">
              {/* Left accent stripe */}
              <div className="w-1 bg-blue-700 flex-shrink-0" />

              <div className="flex-1 p-6 lg:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Event Details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Event Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Johnson Wedding Reception"
                      value={form.eventName}
                      onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                      className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  {/* Client */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Client *
                    </label>
                    <Select
                      value={form.clientId}
                      onValueChange={(v) => setForm({ ...form, clientId: v })}
                    >
                      <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Event Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                      className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  {/* Service Style */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Service Style *
                    </label>
                    <Select
                      value={form.eventType}
                      onValueChange={(v) => setForm({ ...form, eventType: v })}
                    >
                      <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select service style" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_STYLES.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Guest Count */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Guest Count *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 150"
                      value={form.guestCount}
                      onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
                      className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  {/* Notes - full width */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Notes
                    </label>
                    <textarea
                      placeholder="Additional details, dietary requirements, venue info..."
                      rows={4}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Button pair */}
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => router.push("/events")}
                    className="h-11 px-6 border-2 border-blue-700 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 active:scale-95 transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-11 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && <LoadingSpinner className="mr-1" />}
                    {saving ? "Creating..." : "Create Event"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right column - Info panels */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Jobs */}
          <div className="bg-white rounded-2xl ambient-shadow p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-xl">work</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Jobs</p>
                <p className="text-2xl font-extrabold text-gray-900">{activeJobsCount}</p>
              </div>
            </div>
          </div>

          {/* Stock Level */}
          <div className="bg-white rounded-2xl ambient-shadow p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-xl">inventory_2</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Stock Level</p>
                <p className="text-2xl font-extrabold text-gray-900">
                  {ingredients?.length ?? 0}
                  <span className="text-sm font-medium text-gray-400 ml-1">items</span>
                </p>
              </div>
            </div>
          </div>

          {/* Pro tip */}
          <div className="bg-purple-100/30 border-none rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-purple-600 text-xl mt-0.5">lightbulb</span>
              <div>
                <p className="text-sm font-bold text-purple-900 mb-1">Pro Tip</p>
                <p className="text-xs text-purple-700 leading-relaxed">
                  Add recipes to your event menu after creating it to automatically calculate costs and margins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

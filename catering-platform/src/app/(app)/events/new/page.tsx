"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { LoadingSpinner } from "@/components/layout/LoadingScreen";

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
      <PageHeader title="Create Event" backHref="/events" />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Event Name */}
            <div className="space-y-1.5">
              <Label htmlFor="eventName">Event Name *</Label>
              <Input
                id="eventName"
                placeholder="e.g. Johnson Wedding Reception"
                value={form.eventName}
                onChange={(e) => setForm({ ...form, eventName: e.target.value })}
              />
            </div>

            {/* Client + Event Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm({ ...form, clientId: v })}
                >
                  <SelectTrigger id="client">
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

              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Event Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
            </div>

            {/* Service Style + Guest Count row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventType">Service Style *</Label>
                <Select
                  value={form.eventType}
                  onValueChange={(v) => setForm({ ...form, eventType: v })}
                >
                  <SelectTrigger id="eventType">
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

              <div className="space-y-1.5">
                <Label htmlFor="guestCount">Guest Count *</Label>
                <Input
                  id="guestCount"
                  type="number"
                  min="1"
                  placeholder="e.g. 150"
                  value={form.guestCount}
                  onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional details, dietary requirements, venue info..."
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/events")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <LoadingSpinner className="mr-2" />}
            {saving ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}

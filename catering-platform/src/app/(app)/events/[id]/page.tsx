"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Copy,
  Plus,
  X,
  DollarSign,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { LoadingSpinner } from "@/components/layout/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  useEvent,
  useEventMenuItems,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  addEventMenuItem,
  removeEventMenuItem,
  duplicateEvent,
  type EventStatus,
} from "@/lib/hooks/useEvents";
import { useClients } from "@/lib/hooks/useClients";
import { useRecipes, type Recipe } from "@/lib/hooks/useRecipes";

const SERVICE_STYLES = [
  "Buffet",
  "Plated",
  "Cocktail",
  "Drop-Off",
  "Family Style",
  "Food Stations",
];

const STATUS_OPTIONS: { label: string; value: EventStatus }[] = [
  { label: "Inquiry", value: "inquiry" },
  { label: "Proposal", value: "proposal" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_COLORS: Record<EventStatus, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  proposal: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toInputDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const { data: event, loading: eventLoading } = useEvent(id);
  const { data: menuItems, loading: menuLoading } = useEventMenuItems(id);
  const { data: clients } = useClients();
  const { data: recipes } = useRecipes();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    clientId: string;
    eventDate: string;
    eventType: string;
    guestCount: string;
    notes: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    recipeId: "",
    quantity: "",
    servings: "",
  });
  const [addingItem, setAddingItem] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Selected recipe for the add dialog
  const selectedRecipe = useMemo(() => {
    return recipes?.find((r) => r.id === addItemForm.recipeId) || null;
  }, [recipes, addItemForm.recipeId]);

  const calculatedLineCost = useMemo(() => {
    if (!selectedRecipe || !addItemForm.quantity) return 0;
    return selectedRecipe.costPerServing * parseInt(addItemForm.quantity, 10);
  }, [selectedRecipe, addItemForm.quantity]);

  if (eventLoading || menuLoading) return <LoadingScreen />;
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/events")}>
          Back to Events
        </Button>
      </div>
    );
  }

  function startEditing() {
    if (!event) return;
    setEditForm({
      clientId: event.clientId,
      eventDate: toInputDate(event.eventDate),
      eventType: event.eventType,
      guestCount: String(event.guestCount),
      notes: event.notes || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!editForm || !event) return;
    const client = clients?.find((c) => c.id === editForm.clientId);
    setSavingEdit(true);
    try {
      await updateEvent(event.id, {
        clientId: editForm.clientId,
        clientName: client?.name || event.clientName,
        eventDate: new Date(editForm.eventDate + "T00:00:00"),
        eventType: editForm.eventType,
        guestCount: parseInt(editForm.guestCount, 10),
        notes: editForm.notes.trim() || undefined,
      });
      toast({ title: "Event updated" });
      setEditing(false);
      setEditForm(null);
    } catch {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleStatusChange(newStatus: EventStatus) {
    try {
      await updateEventStatus(event!.id, newStatus);
      toast({ title: "Status updated", description: `Event is now ${newStatus}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }

  async function handleAddMenuItem() {
    if (!selectedRecipe || !addItemForm.quantity) return;
    setAddingItem(true);
    try {
      const qty = parseInt(addItemForm.quantity, 10);
      const lineCost = selectedRecipe.costPerServing * qty;

      await addEventMenuItem(event!.id, {
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name,
        quantity: qty,
        costPerServing: selectedRecipe.costPerServing,
        lineCost,
        servings: addItemForm.servings ? parseInt(addItemForm.servings, 10) : selectedRecipe.servings,
        notes: undefined,
      });

      // Recalculate total cost
      const currentItems = menuItems || [];
      const newTotalCost = currentItems.reduce((sum, item) => sum + item.lineCost, 0) + lineCost;
      const margin = event!.totalPrice > 0
        ? ((event!.totalPrice - newTotalCost) / event!.totalPrice) * 100
        : 0;
      await updateEvent(event!.id, { totalCost: newTotalCost, marginPercentage: margin });

      toast({ title: "Menu item added" });
      setShowAddItem(false);
      setAddItemForm({ recipeId: "", quantity: "", servings: "" });
    } catch {
      toast({ title: "Error", description: "Failed to add menu item.", variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  }

  async function handleRemoveMenuItem(itemId: string, itemLineCost: number) {
    try {
      await removeEventMenuItem(event!.id, itemId);

      const newTotalCost = (event!.totalCost || 0) - itemLineCost;
      const margin = event!.totalPrice > 0
        ? ((event!.totalPrice - newTotalCost) / event!.totalPrice) * 100
        : 0;
      await updateEvent(event!.id, { totalCost: Math.max(0, newTotalCost), marginPercentage: margin });

      toast({ title: "Menu item removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove menu item.", variant: "destructive" });
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const newEvent = await duplicateEvent(event!.id);
      toast({ title: "Event duplicated" });
      router.push(`/events/${newEvent.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to duplicate event.", variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEvent(event!.id);
      toast({ title: "Event deleted" });
      router.push("/events");
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  const marginColor =
    event.marginPercentage > 0
      ? "text-green-600"
      : event.marginPercentage < 0
      ? "text-red-600"
      : "text-muted-foreground";

  return (
    <div>
      <PageHeader title={event.eventType} backHref="/events" />

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Badge variant="secondary" className={`text-sm px-3 py-1 ${STATUS_COLORS[event.status]}`}>
          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </Badge>
        <Select value={event.status} onValueChange={(v) => handleStatusChange(v as EventStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Change status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Event Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Event Details</CardTitle>
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditForm(null); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit && <LoadingSpinner className="mr-1" />}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!editing ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Client</dt>
                  <dd className="font-medium">{event.clientName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">{formatDate(event.eventDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Service Style</dt>
                  <dd className="font-medium">{event.eventType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Guest Count</dt>
                  <dd className="font-medium">{event.guestCount}</dd>
                </div>
                {event.notes && (
                  <div className="pt-2 border-t">
                    <dt className="text-muted-foreground mb-1">Notes</dt>
                    <dd className="text-foreground whitespace-pre-wrap">{event.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={editForm!.clientId}
                    onValueChange={(v) => setEditForm({ ...editForm!, clientId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editForm!.eventDate}
                    onChange={(e) => setEditForm({ ...editForm!, eventDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Service Style</Label>
                  <Select
                    value={editForm!.eventType}
                    onValueChange={(v) => setEditForm({ ...editForm!, eventType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Guest Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editForm!.guestCount}
                    onChange={(e) => setEditForm({ ...editForm!, guestCount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={editForm!.notes}
                    onChange={(e) => setEditForm({ ...editForm!, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-semibold">{formatCurrency(event.totalCost)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(event.totalPrice)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-100">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className={`text-lg font-semibold ${marginColor}`}>
                    {event.marginPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Menu Items</CardTitle>
          <Button size="sm" onClick={() => setShowAddItem(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Menu Item
          </Button>
        </CardHeader>
        <CardContent>
          {(!menuItems || menuItems.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No menu items yet. Add recipes to build the event menu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recipe</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">Cost/Serving</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Line Cost</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{item.recipeName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right hidden sm:table-cell">
                        {formatCurrency(item.costPerServing)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(item.lineCost)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                        {item.notes || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMenuItem(item.id, item.lineCost)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
          {duplicating ? <LoadingSpinner className="mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          Duplicate Event
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Event
        </Button>
      </div>

      {/* Add Menu Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Recipe</Label>
              <Select
                value={addItemForm.recipeId}
                onValueChange={(v) => setAddItemForm({ ...addItemForm, recipeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                  {recipes?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={addItemForm.quantity}
                  onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Servings</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder={selectedRecipe ? String(selectedRecipe.servings) : ""}
                  value={addItemForm.servings}
                  onChange={(e) => setAddItemForm({ ...addItemForm, servings: e.target.value })}
                />
              </div>
            </div>

            {selectedRecipe && addItemForm.quantity && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost per serving</span>
                  <span className="font-medium">{formatCurrency(selectedRecipe.costPerServing)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated line cost</span>
                  <span className="font-semibold">{formatCurrency(calculatedLineCost)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddItem(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMenuItem}
                disabled={!addItemForm.recipeId || !addItemForm.quantity || addingItem}
              >
                {addingItem && <LoadingSpinner className="mr-2" />}
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this event? This action cannot be undone. All menu items
            associated with this event will also be removed.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <LoadingSpinner className="mr-2" />}
              {deleting ? "Deleting..." : "Delete Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

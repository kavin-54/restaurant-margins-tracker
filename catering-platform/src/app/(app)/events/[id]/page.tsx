"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useRecipes } from "@/lib/hooks/useRecipes";

const SERVICE_STYLES = [
  "Buffet",
  "Plated",
  "Cocktail",
  "Drop-Off",
  "Family Style",
  "Food Stations",
];

const STATUS_OPTIONS: { label: string; value: EventStatus }[] = [
  { label: "In Progress", value: "inquiry" },
  { label: "Proposed", value: "proposal" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_BADGE: Record<EventStatus, string> = {
  inquiry: "bg-blue-100 text-blue-700",
  proposal: "bg-amber-50 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<EventStatus, string> = {
  inquiry: "In Progress",
  proposal: "Proposed",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "\u2014";
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
        <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">error_outline</span>
        <p className="text-gray-500 font-medium">Event not found.</p>
        <button
          onClick={() => router.push("/events")}
          className="mt-4 h-10 px-5 border-2 border-blue-700 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 transition"
        >
          Back to Events
        </button>
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
      toast({ title: "Status updated", description: `Event is now ${STATUS_LABEL[newStatus]}.` });
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
      : "text-gray-400";

  return (
    <div>
      {/* Header with status badge */}
      <PageHeader title={event.eventType} backHref="/events">
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[event.status]}`}
          >
            {STATUS_LABEL[event.status]}
          </span>
          <Select value={event.status} onValueChange={(v) => handleStatusChange(v as EventStatus)}>
            <SelectTrigger className="w-[180px] bg-gray-50 border-none h-9 rounded-lg text-sm">
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
      </PageHeader>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Event Details Card */}
        <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Event Details</h3>
            {!editing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setEditForm(null); }}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition disabled:opacity-50"
                >
                  {savingEdit && <LoadingSpinner className="mr-1" />}
                  Save
                </button>
              </div>
            )}
          </div>
          <div className="p-6">
            {!editing ? (
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400 font-medium">Client</dt>
                  <dd className="font-semibold text-gray-900">{event.clientName}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400 font-medium">Date</dt>
                  <dd className="font-semibold text-gray-900">{formatDate(event.eventDate)}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400 font-medium">Service Style</dt>
                  <dd className="font-semibold text-gray-900">{event.eventType}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400 font-medium">Guest Count</dt>
                  <dd className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400">group</span>
                    {event.guestCount}
                  </dd>
                </div>
                {event.notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <dt className="text-gray-400 font-medium mb-1">Notes</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap leading-relaxed">{event.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Client</label>
                  <Select
                    value={editForm!.clientId}
                    onValueChange={(v) => setEditForm({ ...editForm!, clientId: v })}
                  >
                    <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg focus:ring-2 focus:ring-blue-500/20">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Date</label>
                  <input
                    type="date"
                    value={editForm!.eventDate}
                    onChange={(e) => setEditForm({ ...editForm!, eventDate: e.target.value })}
                    className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Service Style</label>
                  <Select
                    value={editForm!.eventType}
                    onValueChange={(v) => setEditForm({ ...editForm!, eventType: v })}
                  >
                    <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg focus:ring-2 focus:ring-blue-500/20">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Guest Count</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm!.guestCount}
                    onChange={(e) => setEditForm({ ...editForm!, guestCount: e.target.value })}
                    className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Notes</label>
                  <textarea
                    rows={3}
                    value={editForm!.notes}
                    onChange={(e) => setEditForm({ ...editForm!, notes: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Financial Summary</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/80">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-blue-600 text-xl">receipt_long</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Cost</p>
                <p className="text-xl font-extrabold text-gray-900">{formatCurrency(event.totalCost)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/80">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-green-600 text-xl">attach_money</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Price</p>
                <p className="text-xl font-extrabold text-gray-900">{formatCurrency(event.totalPrice)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/80">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-purple-600 text-xl">trending_up</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Margin</p>
                <p className={`text-xl font-extrabold ${marginColor}`}>
                  {event.marginPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Section */}
      <div className="bg-white rounded-2xl ambient-shadow overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Menu Items</h3>
          <button
            onClick={() => setShowAddItem(true)}
            className="h-9 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add Menu Item
          </button>
        </div>
        <div className="p-6">
          {(!menuItems || menuItems.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">restaurant_menu</span>
              <p className="text-sm text-gray-400 font-medium">
                No menu items yet. Add recipes to build the event menu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Recipe
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden sm:table-cell">
                      Cost/Serving
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      Line Cost
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden md:table-cell">
                      Notes
                    </th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.recipeName}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                        {formatCurrency(item.costPerServing)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(item.lineCost)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                        {item.notes || "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                          onClick={() => handleRemoveMenuItem(item.id, item.lineCost)}
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDuplicate}
          disabled={duplicating}
          className="h-11 px-5 border-2 border-blue-700 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 active:scale-95 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
        >
          {duplicating ? (
            <LoadingSpinner className="mr-1" />
          ) : (
            <span className="material-symbols-outlined text-lg">content_copy</span>
          )}
          Duplicate Event
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="h-11 px-5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-150 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
          Delete Event
        </button>
      </div>

      {/* Add Menu Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Recipe</label>
              <Select
                value={addItemForm.recipeId}
                onValueChange={(v) => setAddItemForm({ ...addItemForm, recipeId: v })}
              >
                <SelectTrigger className="bg-gray-50 border-none h-12 rounded-lg focus:ring-2 focus:ring-blue-500/20">
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
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Quantity</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={addItemForm.quantity}
                  onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })}
                  className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Servings</label>
                <input
                  type="number"
                  min="1"
                  placeholder={selectedRecipe ? String(selectedRecipe.servings) : ""}
                  value={addItemForm.servings}
                  onChange={(e) => setAddItemForm({ ...addItemForm, servings: e.target.value })}
                  className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>

            {selectedRecipe && addItemForm.quantity && (
              <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Cost per serving</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(selectedRecipe.costPerServing)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Estimated line cost</span>
                  <span className="font-extrabold text-gray-900">{formatCurrency(calculatedLineCost)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddItem(false)}
                className="h-11 px-5 border-2 border-blue-700 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMenuItem}
                disabled={!addItemForm.recipeId || !addItemForm.quantity || addingItem}
                className="h-11 px-5 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
              >
                {addingItem && <LoadingSpinner className="mr-1" />}
                Add Item
              </button>
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
          <p className="text-sm text-gray-500 py-2 leading-relaxed">
            Are you sure you want to delete this event? This action cannot be undone. All menu items
            associated with this event will also be removed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="h-11 px-5 border-2 border-blue-700 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-11 px-5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
            >
              {deleting && <LoadingSpinner className="mr-1" />}
              {deleting ? "Deleting..." : "Delete Event"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useCallback } from "react";
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
  updateEventMenuItem,
  removeEventMenuItem,
  duplicateEvent,
  type EventStatus,
} from "@/lib/hooks/useEvents";
import { useClients } from "@/lib/hooks/useClients";
import { useRecipes, useRecipeLines } from "@/lib/hooks/useRecipes";
import { useIngredients } from "@/lib/hooks/useIngredients";
import { ALLERGENS } from "@/lib/constants/allergens";

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

const CATEGORY_BADGE: Record<string, string> = {
  appetizer: "bg-orange-100 text-orange-700",
  main: "bg-blue-100 text-blue-700",
  side: "bg-green-100 text-green-700",
  dessert: "bg-pink-100 text-pink-700",
  sauce: "bg-yellow-100 text-yellow-700",
  base: "bg-gray-100 text-gray-600",
  marinade: "bg-amber-100 text-amber-700",
  beverage: "bg-cyan-100 text-cyan-700",
  bread: "bg-amber-100 text-amber-700",
  salad: "bg-emerald-100 text-emerald-700",
  soup: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-600",
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

// ---- Allergen Cross-Reference Component ----
function AllergenSummary({
  menuItems,
  recipes,
  ingredients,
  clientNotes,
}: {
  menuItems: { recipeId: string; recipeName: string }[];
  recipes: { id: string; name: string }[] | null;
  ingredients: { id: string; name: string; category: string }[] | null;
  clientNotes?: string;
}) {
  // For now, we derive allergens from recipe names / categories as a placeholder
  // In a full implementation, we'd traverse recipe lines -> ingredients -> allergens
  // Since the hooks-level Recipe doesn't carry allergens, we show a summary based on available data

  const allergenMap = useMemo(() => {
    // Build a map of allergen -> dishes that may contain it
    const map: Record<string, string[]> = {};

    // We'll do a simple keyword-based detection from recipe names and categories
    // This is a heuristic since the hook-level Recipe type doesn't carry allergen data
    const keywordAllergens: Record<string, string[]> = {
      milk: ["cream", "cheese", "butter", "milk", "dairy", "bechamel", "alfredo", "mozzarella", "parmesan", "ricotta"],
      eggs: ["egg", "meringue", "custard", "quiche", "frittata", "souffle", "mayonnaise"],
      fish: ["fish", "salmon", "tuna", "cod", "halibut", "tilapia", "anchovy", "trout"],
      shellfish: ["shrimp", "crab", "lobster", "scallop", "mussel", "clam", "oyster", "prawn"],
      "tree-nuts": ["almond", "walnut", "pecan", "cashew", "pistachio", "macadamia", "hazelnut"],
      peanuts: ["peanut"],
      wheat: ["bread", "pasta", "flour", "cake", "pie", "pastry", "croissant", "noodle", "wheat", "biscuit"],
      soy: ["soy", "tofu", "edamame", "teriyaki", "miso"],
      sesame: ["sesame", "tahini", "hummus"],
    };

    menuItems.forEach((item) => {
      const name = item.recipeName.toLowerCase();
      Object.entries(keywordAllergens).forEach(([allergen, keywords]) => {
        if (keywords.some((kw) => name.includes(kw))) {
          if (!map[allergen]) map[allergen] = [];
          if (!map[allergen].includes(item.recipeName)) {
            map[allergen].push(item.recipeName);
          }
        }
      });
    });

    return map;
  }, [menuItems]);

  const allergenKeys = Object.keys(allergenMap);

  // Parse client dietary preferences for conflicts
  const clientRestrictions = useMemo(() => {
    if (!clientNotes) return [];
    const lower = clientNotes.toLowerCase();
    const found: string[] = [];
    ALLERGENS.forEach((a) => {
      if (lower.includes(a.value) || lower.includes(a.label.toLowerCase())) {
        found.push(a.value);
      }
    });
    // Also check for common dietary terms
    if (lower.includes("gluten-free") || lower.includes("gluten free") || lower.includes("celiac")) {
      found.push("wheat");
    }
    if (lower.includes("nut-free") || lower.includes("nut free") || lower.includes("nut allergy")) {
      found.push("tree-nuts");
      found.push("peanuts");
    }
    if (lower.includes("dairy-free") || lower.includes("dairy free") || lower.includes("lactose")) {
      found.push("milk");
    }
    return [...new Set(found)];
  }, [clientNotes]);

  if (menuItems.length === 0) {
    return null;
  }

  const allergenLabel = (key: string) => ALLERGENS.find((a) => a.value === key)?.label || key;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden mb-6"
      style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
    >
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <span className="material-symbols-outlined text-amber-500 text-xl">health_and_safety</span>
        <h3 className="text-sm font-bold text-gray-900">Allergen Summary</h3>
      </div>
      <div className="p-6">
        {clientRestrictions.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-red-500 text-base">warning</span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Client Dietary Restrictions</span>
            </div>
            <p className="text-sm text-red-700 font-medium">
              {clientRestrictions.map((r) => allergenLabel(r)).join(", ")}
            </p>
          </div>
        )}

        {allergenKeys.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-base">verified</span>
            </div>
            <p className="text-sm text-green-700 font-semibold">
              No common allergens detected in menu items
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allergenKeys.map((allergen) => {
              const isConflict = clientRestrictions.includes(allergen);
              return (
                <div
                  key={allergen}
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    isConflict ? "bg-red-50 border border-red-200" : "bg-gray-50"
                  }`}
                >
                  {isConflict && (
                    <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">warning</span>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isConflict ? "text-red-700" : "text-gray-900"}`}>
                        {allergenLabel(allergen)}
                      </span>
                      {isConflict && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          Conflict
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Found in: {allergenMap[allergen].join(", ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Safe items */}
        {menuItems.length > 0 && allergenKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Allergen-Free Items</p>
            <div className="flex flex-wrap gap-2">
              {menuItems
                .filter((item) => {
                  const name = item.recipeName.toLowerCase();
                  return !allergenKeys.some((allergen) => {
                    const keywordAllergens: Record<string, string[]> = {
                      milk: ["cream", "cheese", "butter", "milk", "dairy", "bechamel", "alfredo", "mozzarella", "parmesan", "ricotta"],
                      eggs: ["egg", "meringue", "custard", "quiche", "frittata", "souffle", "mayonnaise"],
                      fish: ["fish", "salmon", "tuna", "cod", "halibut", "tilapia", "anchovy", "trout"],
                      shellfish: ["shrimp", "crab", "lobster", "scallop", "mussel", "clam", "oyster", "prawn"],
                      "tree-nuts": ["almond", "walnut", "pecan", "cashew", "pistachio", "macadamia", "hazelnut"],
                      peanuts: ["peanut"],
                      wheat: ["bread", "pasta", "flour", "cake", "pie", "pastry", "croissant", "noodle", "wheat", "biscuit"],
                      soy: ["soy", "tofu", "edamame", "teriyaki", "miso"],
                      sesame: ["sesame", "tahini", "hummus"],
                    };
                    return keywordAllergens[allergen]?.some((kw) => name.includes(kw));
                  });
                })
                .map((item) => (
                  <span
                    key={item.recipeId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full"
                  >
                    <span className="material-symbols-outlined text-sm">verified</span>
                    {item.recipeName}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const { data: event, loading: eventLoading } = useEvent(id);
  const { data: menuItems, loading: menuLoading } = useEventMenuItems(id);
  const { data: clients } = useClients();
  const { data: recipes } = useRecipes();
  const { data: ingredients } = useIngredients();

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

  // Proposal builder state
  const [activeTab, setActiveTab] = useState<"details" | "menu">("details");
  const [targetMargin, setTargetMargin] = useState(35);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");

  const selectedRecipe = useMemo(() => {
    return recipes?.find((r) => r.id === addItemForm.recipeId) || null;
  }, [recipes, addItemForm.recipeId]);

  const calculatedLineCost = useMemo(() => {
    if (!selectedRecipe || !addItemForm.quantity) return 0;
    return selectedRecipe.costPerServing * parseInt(addItemForm.quantity, 10);
  }, [selectedRecipe, addItemForm.quantity]);

  // Menu totals
  const menuTotals = useMemo(() => {
    if (!menuItems || menuItems.length === 0) {
      return { totalFoodCost: 0, suggestedPrice: 0, profit: 0 };
    }
    const totalFoodCost = menuItems.reduce((sum, item) => sum + item.lineCost, 0);
    const marginDecimal = targetMargin / 100;
    const suggestedPrice = marginDecimal < 1 ? totalFoodCost / (1 - marginDecimal) : totalFoodCost;
    const profit = suggestedPrice - totalFoodCost;
    return { totalFoodCost, suggestedPrice, profit };
  }, [menuItems, targetMargin]);

  // Filtered recipes for selector
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    if (!recipeSearchQuery.trim()) return recipes;
    const q = recipeSearchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    );
  }, [recipes, recipeSearchQuery]);

  // Get client for the event
  const eventClient = useMemo(() => {
    if (!event || !clients) return null;
    return clients.find((c) => c.id === event.clientId) || null;
  }, [event, clients]);

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
      setShowRecipeSelector(false);
      setAddItemForm({ recipeId: "", quantity: "", servings: "" });
    } catch {
      toast({ title: "Error", description: "Failed to add menu item.", variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  }

  async function handleQuickAddRecipe(recipe: typeof recipes extends (infer T)[] | null ? T : never) {
    if (!recipe || !event) return;
    const qty = Math.max(1, event.guestCount);
    const lineCost = recipe.costPerServing * qty;

    try {
      await addEventMenuItem(event.id, {
        recipeId: recipe.id,
        recipeName: recipe.name,
        quantity: qty,
        costPerServing: recipe.costPerServing,
        lineCost,
        servings: recipe.servings,
        notes: undefined,
      });

      const currentItems = menuItems || [];
      const newTotalCost = currentItems.reduce((sum, item) => sum + item.lineCost, 0) + lineCost;
      const margin = event.totalPrice > 0
        ? ((event.totalPrice - newTotalCost) / event.totalPrice) * 100
        : 0;
      await updateEvent(event.id, { totalCost: newTotalCost, marginPercentage: margin });

      toast({ title: "Menu item added", description: `${recipe.name} added with ${qty} servings.` });
    } catch {
      toast({ title: "Error", description: "Failed to add menu item.", variant: "destructive" });
    }
  }

  async function handleUpdateItemQuantity(itemId: string, currentItem: NonNullable<typeof menuItems>[number], delta: number) {
    const newQty = Math.max(1, currentItem.quantity + delta);
    const newLineCost = currentItem.costPerServing * newQty;
    const oldLineCost = currentItem.lineCost;

    try {
      await updateEventMenuItem(event!.id, itemId, {
        quantity: newQty,
        lineCost: newLineCost,
      });

      const newTotalCost = (event!.totalCost || 0) - oldLineCost + newLineCost;
      const margin = event!.totalPrice > 0
        ? ((event!.totalPrice - newTotalCost) / event!.totalPrice) * 100
        : 0;
      await updateEvent(event!.id, { totalCost: Math.max(0, newTotalCost), marginPercentage: margin });
    } catch {
      toast({ title: "Error", description: "Failed to update quantity.", variant: "destructive" });
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

  async function handleGenerateProposal() {
    if (!menuItems || menuItems.length === 0) {
      toast({ title: "No menu items", description: "Add menu items before generating a proposal.", variant: "destructive" });
      return;
    }
    try {
      await updateEvent(event!.id, {
        totalCost: menuTotals.totalFoodCost,
        totalPrice: menuTotals.suggestedPrice,
        marginPercentage: targetMargin,
      });
      await updateEventStatus(event!.id, "proposal");
      toast({ title: "Proposal generated", description: "Event status updated to Proposed with calculated pricing." });
    } catch {
      toast({ title: "Error", description: "Failed to generate proposal.", variant: "destructive" });
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

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${
            activeTab === "details"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">info</span>
            Details
          </span>
        </button>
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${
            activeTab === "menu"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            Menu Builder
            {menuItems && menuItems.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {menuItems.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {activeTab === "details" && (
        <>
          {/* Info cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Event Details Card */}
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
            >
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
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
            >
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
        </>
      )}

      {activeTab === "menu" && (
        <>
          {/* Menu Builder Section */}
          <div
            className="bg-white rounded-2xl overflow-hidden mb-6"
            style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Menu Items</h3>
              <button
                onClick={() => setShowRecipeSelector(true)}
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
                  <p className="text-sm text-gray-400 font-medium mb-4">
                    No menu items yet. Add recipes to build the event menu.
                  </p>
                  <button
                    onClick={() => setShowRecipeSelector(true)}
                    className="h-10 px-5 border-2 border-blue-700 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 transition flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Browse Recipes
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {menuItems.map((item) => {
                    const recipe = recipes?.find((r) => r.id === item.recipeId);
                    const category = recipe?.category || "other";
                    const servingsNeeded = event.guestCount > 0 ? Math.ceil(event.guestCount / (item.servings || 1)) : item.quantity;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{item.recipeName}</h4>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                CATEGORY_BADGE[category] || CATEGORY_BADGE.other
                              }`}
                            >
                              {category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">payments</span>
                              {formatCurrency(item.costPerServing)}/serving
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">group</span>
                              ~{servingsNeeded} needed for {event.guestCount} guests
                            </span>
                          </div>
                        </div>

                        {/* Quantity adjuster */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateItemQuantity(item.id, item, -1)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:border-blue-300 hover:text-blue-600 transition"
                          >
                            <span className="material-symbols-outlined text-base">remove</span>
                          </button>
                          <span className="w-12 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateItemQuantity(item.id, item, 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:border-blue-300 hover:text-blue-600 transition"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                          </button>
                        </div>

                        {/* Line cost */}
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(item.lineCost)}</p>
                        </div>

                        {/* Remove */}
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveMenuItem(item.id, item.lineCost)}
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Running Totals & Proposal */}
          {menuItems && menuItems.length > 0 && (
            <div
              className="bg-white rounded-2xl overflow-hidden mb-6"
              style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Proposal Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-blue-50/80">
                    <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-1">Total Food Cost</p>
                    <p className="text-xl font-extrabold text-blue-700">{formatCurrency(menuTotals.totalFoodCost)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50/80">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Target Margin</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-16 bg-white border border-gray-200 h-9 rounded-lg px-2 text-lg font-extrabold text-gray-900 text-center focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-300"
                      />
                      <span className="text-lg font-extrabold text-gray-900">%</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50/80">
                    <p className="text-[10px] uppercase font-bold text-green-400 tracking-widest mb-1">Suggested Price</p>
                    <p className="text-xl font-extrabold text-green-700">{formatCurrency(menuTotals.suggestedPrice)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/80">
                    <p className="text-[10px] uppercase font-bold text-purple-400 tracking-widest mb-1">Profit</p>
                    <p className="text-xl font-extrabold text-purple-700">{formatCurrency(menuTotals.profit)}</p>
                  </div>
                </div>

                {/* Per-head breakdown */}
                <div className="flex items-center gap-6 py-3 px-4 rounded-xl bg-gray-50 mb-6">
                  <div className="text-sm">
                    <span className="text-gray-400 font-medium">Per Guest: </span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(event.guestCount > 0 ? menuTotals.suggestedPrice / event.guestCount : 0)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400 font-medium">Cost Per Guest: </span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(event.guestCount > 0 ? menuTotals.totalFoodCost / event.guestCount : 0)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400 font-medium">Guest Count: </span>
                    <span className="font-bold text-gray-900">{event.guestCount}</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateProposal}
                  className="h-12 px-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">description</span>
                  Generate Proposal
                </button>
              </div>
            </div>
          )}

          {/* Allergen Cross-Reference */}
          <AllergenSummary
            menuItems={menuItems || []}
            recipes={recipes}
            ingredients={ingredients}
            clientNotes={eventClient?.notes}
          />
        </>
      )}

      {/* Recipe Selector Dialog */}
      <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Recipe to Menu</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search recipes by name or category..."
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border-none h-11 rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 -mx-6 px-6 pb-4">
            {filteredRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">search_off</span>
                <p className="text-sm text-gray-400 font-medium">No recipes found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecipes.map((recipe) => {
                  const alreadyAdded = menuItems?.some((mi) => mi.recipeId === recipe.id);
                  return (
                    <div
                      key={recipe.id}
                      className={`flex items-center gap-4 p-4 rounded-xl transition ${
                        alreadyAdded ? "bg-green-50/50 border border-green-100" : "bg-gray-50/80 hover:bg-gray-100/80"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{recipe.name}</h4>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              CATEGORY_BADGE[recipe.category] || CATEGORY_BADGE.other
                            }`}
                          >
                            {recipe.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatCurrency(recipe.costPerServing)}/serving</span>
                          <span>{recipe.servings} servings per batch</span>
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleQuickAddRecipe(recipe)}
                          className="h-9 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legacy Add Menu Item Dialog (kept for direct quantity input) */}
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

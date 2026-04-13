"use client";

import { useCollection, useDocument } from "./useFirestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { orderBy, where, QueryConstraint } from "firebase/firestore";
import { useMemo } from "react";

export type EventStatus = "inquiry" | "proposal" | "confirmed" | "completed" | "cancelled";

export interface EventMenuItem {
  id: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  costPerServing: number;
  lineCost: number;
  servings: number;
  notes?: string;
}

export interface Event {
  id: string;
  clientId: string;
  clientName: string;
  eventDate: Date;
  eventType: string;
  guestCount: number;
  status: EventStatus;
  totalCost: number;
  totalPrice: number;
  marginPercentage: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useEvents(statusFilter?: EventStatus, additionalConstraints: QueryConstraint[] = []) {
  const constraints = useMemo(() => {
    const base = statusFilter
      ? [where("status", "==", statusFilter), orderBy("eventDate", "desc")]
      : [orderBy("eventDate", "desc")];
    return [...base, ...additionalConstraints];
  }, [statusFilter, additionalConstraints]);
  return useCollection<Event>("events", constraints);
}

export function useEvent(id: string) {
  return useDocument<Event>("events", id);
}

const MENU_ITEMS_ORDER = [orderBy("recipeName")];
export function useEventMenuItems(eventId: string) {
  return useCollection<EventMenuItem>(
    `events/${eventId}/menuItems`,
    MENU_ITEMS_ORDER
  );
}

export async function addEvent(data: Omit<Event, "id">) {
  const now = new Date();
  return addDocument<Event>("events", {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<Event, "id" | "createdAt">>
) {
  return updateDocument<Event>("events", id, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteEvent(id: string) {
  return deleteDocument("events", id);
}

export async function addEventMenuItem(
  eventId: string,
  data: Omit<EventMenuItem, "id">
) {
  return addDocument<EventMenuItem>(`events/${eventId}/menuItems`, data);
}

export async function updateEventMenuItem(
  eventId: string,
  itemId: string,
  data: Partial<Omit<EventMenuItem, "id">>
) {
  return updateDocument<EventMenuItem>(
    `events/${eventId}/menuItems`,
    itemId,
    data
  );
}

export async function removeEventMenuItem(
  eventId: string,
  itemId: string
) {
  return deleteDocument(`events/${eventId}/menuItems`, itemId);
}

export async function duplicateEvent(eventId: string) {
  const event = await getEventData(eventId);
  if (!event) throw new Error("Event not found");

  const newEvent = await addEvent({
    ...event,
    status: "inquiry" as EventStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  // Copy menu items
  const menuItems = await getEventMenuItems(eventId);
  for (const item of menuItems) {
    const { id, ...itemData } = item;
    await addEventMenuItem(newEvent.id, itemData);
  }

  return newEvent;
}

export async function updateEventStatus(
  eventId: string,
  newStatus: EventStatus
) {
  return updateEvent(eventId, { status: newStatus });
}

// Helper functions
async function getEventData(eventId: string): Promise<Event | null> {
  const { getDocument } = await import("@/lib/firebase/firestore");
  return getDocument<Event>("events", eventId);
}

async function getEventMenuItems(eventId: string): Promise<EventMenuItem[]> {
  const { getDocuments } = await import("@/lib/firebase/firestore");
  return getDocuments<EventMenuItem>(`events/${eventId}/menuItems`, orderBy("recipeName"));
}

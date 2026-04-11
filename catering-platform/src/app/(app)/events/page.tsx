"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, CalendarDays, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useEvents, type EventStatus } from "@/lib/hooks/useEvents";

const STATUS_TABS: { label: string; value: EventStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Inquiry", value: "inquiry" },
  { label: "Proposal", value: "proposal" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filterArg = statusFilter === "all" ? undefined : statusFilter;
  const { data: events, loading } = useEvents(filterArg);

  const filtered = useMemo(() => {
    if (!events) return [];
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.eventType?.toLowerCase().includes(q) ||
        e.clientName?.toLowerCase().includes(q)
    );
  }, [events, search]);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Events"
        action={{
          label: "New Event",
          href: "/events/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by event type or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-12 w-12" />}
          title="No events yet"
          description="Create your first event to start tracking catering orders, costs, and margins."
          action={{ label: "Create Event", href: "/events/new" }}
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Guests</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} legacyBehavior>
                  <tr className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {event.eventType}
                      <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">
                        {event.clientName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {event.clientName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {formatDate(event.eventDate)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                      {event.guestCount}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[event.status]}
                      >
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(event.totalPrice)}
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

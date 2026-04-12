"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { formatCurrency } from "@/lib/utils";
import { useEvents, type EventStatus } from "@/lib/hooks/useEvents";

const STATUS_TABS: { label: string; value: EventStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Proposed", value: "proposal" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "inquiry" },
  { label: "Completed", value: "completed" },
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ITEMS_PER_PAGE = 10;

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedEvents = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter/search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Plan and manage your catering events"
        action={{
          label: "New Event",
          href: "/events/new",
          icon: "add",
        }}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${
              statusFilter === tab.value
                ? "bg-blue-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
          search
        </span>
        <input
          type="text"
          placeholder="Search by event type or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-50 border-none h-12 rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="event"
          title="No events yet"
          description="Create your first event to start tracking catering orders, costs, and margins."
          action={{ label: "Create Event", href: "/events/new" }}
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    Event Name
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden sm:table-cell">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden md:table-cell">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden md:table-cell">
                    Guests
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t border-gray-100 hover:bg-gray-50 group transition cursor-pointer"
                    onClick={() => (window.location.href = `/events/${event.id}`)}
                  >
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900">
                        {event.eventType}
                      </span>
                      <span className="block sm:hidden text-xs text-gray-400 mt-0.5">
                        {event.clientName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                      {event.clientName}
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden md:table-cell">
                      {formatDate(event.eventDate)}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        <span className="material-symbols-outlined text-base">group</span>
                        {event.guestCount}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[event.status]}`}
                      >
                        {STATUS_LABEL[event.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/events/${event.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </Link>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-gray-400 font-medium">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
                {filtered.length} events
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      currentPage === page
                        ? "bg-blue-700 text-white"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

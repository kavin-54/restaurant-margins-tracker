"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { formatCurrency } from "@/lib/utils";
import { ProductionDashboard } from "@/components/ProductionDashboard";
import { useEvents, type EventStatus, type Event } from "@/lib/hooks/useEvents";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DAILY_CAPACITY = 500;

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

const STATUS_DOT: Record<EventStatus, string> = {
  confirmed: "bg-green-500",
  proposal: "bg-amber-400",
  inquiry: "bg-blue-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-400",
};

const STATUS_BLOCK_BG: Record<EventStatus, string> = {
  confirmed: "bg-green-50 border-green-200 hover:bg-green-100",
  proposal: "bg-amber-50 border-amber-200 hover:bg-amber-100",
  inquiry: "bg-blue-50 border-blue-200 hover:bg-blue-100",
  completed: "bg-gray-50 border-gray-200 hover:bg-gray-100",
  cancelled: "bg-red-50 border-red-200 hover:bg-red-100",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ViewMode = "calendar" | "list";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Get Monday of the week containing the given date */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun 1=Mon ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function weekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${monday.toLocaleDateString("en-US", yearOpts)} - ${sunday.toLocaleDateString("en-US", yearOpts)}`;
  }
  return `${monday.toLocaleDateString("en-US", opts)} - ${sunday.toLocaleDateString("en-US", yearOpts)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-5 flex items-start gap-4"
      style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
    >
      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-blue-600 text-xl">
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5 truncate">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

function CapacityBar({
  dayDate,
  guests,
}: {
  dayDate: Date;
  guests: number;
}) {
  const pct = Math.min(100, Math.round((guests / MAX_DAILY_CAPACITY) * 100));
  const color =
    pct > 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-green-500";
  const textColor =
    pct > 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-gray-500";

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Load
        </span>
        <span className={`text-[10px] font-bold ${textColor} flex items-center gap-0.5`}>
          {pct > 90 && (
            <span className="material-symbols-outlined text-xs">warning</span>
          )}
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const filterArg = statusFilter === "all" ? undefined : statusFilter;
  const { data: events, loading } = useEvents(filterArg);

  // Filtered events (search)
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

  // Week dates
  const days = useMemo(() => weekDates(weekStart), [weekStart]);

  // Events grouped by day for the current week
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    days.forEach((d) => map.set(d.toDateString(), []));
    (filtered ?? []).forEach((ev) => {
      const key = ev.eventDate?.toDateString?.();
      if (key && map.has(key)) {
        map.get(key)!.push(ev);
      }
    });
    return map;
  }, [filtered, days]);

  // Guests per day (for capacity)
  const guestsPerDay = useMemo(() => {
    const m = new Map<string, number>();
    days.forEach((d) => {
      const key = d.toDateString();
      const dayEvents = eventsByDay.get(key) ?? [];
      m.set(key, dayEvents.reduce((s, e) => s + (e.guestCount || 0), 0));
    });
    return m;
  }, [eventsByDay, days]);

  // Stat computations
  const stats = useMemo(() => {
    const today = new Date();
    const allEvents = filtered ?? [];
    const todaysEvents = allEvents.filter(
      (e) => e.eventDate && isSameDay(e.eventDate, today)
    );
    const weekEvents = allEvents.filter((e) => {
      if (!e.eventDate) return false;
      const d = e.eventDate;
      return d >= days[0] && d < addDays(days[6], 1);
    });
    const weekGuests = weekEvents.reduce(
      (s, e) => s + (e.guestCount || 0),
      0
    );
    const weekRevenue = weekEvents.reduce(
      (s, e) => s + (e.totalPrice || 0),
      0
    );
    const capacityDays = days.filter((d) => {
      const g = guestsPerDay.get(d.toDateString()) ?? 0;
      return g > 0;
    });
    const avgUtil =
      capacityDays.length > 0
        ? Math.round(
            capacityDays.reduce(
              (s, d) =>
                s +
                ((guestsPerDay.get(d.toDateString()) ?? 0) /
                  MAX_DAILY_CAPACITY) *
                  100,
              0
            ) / capacityDays.length
          )
        : 0;

    return {
      todayCount: todaysEvents.length,
      weekGuests,
      weekRevenue,
      avgUtil,
    };
  }, [filtered, days, guestsPerDay]);

  // Over-capacity days
  const overCapacityDays = useMemo(() => {
    return days.filter(
      (d) => (guestsPerDay.get(d.toDateString()) ?? 0) > MAX_DAILY_CAPACITY
    );
  }, [days, guestsPerDay]);

  // Pagination (list view)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedEvents = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  // Week nav
  const goThisWeek = () => setWeekStart(getMonday(new Date()));
  const goPrevWeek = () => setWeekStart((w) => addDays(w, -7));
  const goNextWeek = () => setWeekStart((w) => addDays(w, 7));

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

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="today"
          label="Today's Events"
          value={stats.todayCount}
          sub={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
        />
        <StatCard
          icon="group"
          label="This Week's Guests"
          value={stats.weekGuests.toLocaleString()}
        />
        <StatCard
          icon="attach_money"
          label="This Week's Revenue"
          value={formatCurrency(stats.weekRevenue)}
        />
        <StatCard
          icon="speed"
          label="Capacity Utilization"
          value={`${stats.avgUtil}%`}
          sub="Avg active days"
        />
      </div>

      {/* Today's Production Dashboard */}
      <div className="mb-6">
        <ProductionDashboard />
      </div>

      {/* Overcapacity Warning */}
      {overCapacityDays.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 text-xl mt-0.5">
            error
          </span>
          <div>
            <p className="text-sm font-bold text-red-700">
              Capacity Exceeded
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {overCapacityDays
                .map((d) => formatShortDate(d))
                .join(", ")}{" "}
              exceed the {MAX_DAILY_CAPACITY}-guest daily maximum. Consider
              rescheduling or splitting events.
            </p>
          </div>
        </div>
      )}

      {/* View Toggle + Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-2">
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

        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "calendar"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              calendar_view_week
            </span>
            Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              view_list
            </span>
            List
          </button>
        </div>
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
      ) : viewMode === "calendar" ? (
        /* ---------------------------------------------------------------- */
        /* Calendar View                                                    */
        /* ---------------------------------------------------------------- */
        <div>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {formatWeekRange(weekStart)}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={goPrevWeek}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_left
                </span>
              </button>
              <button
                onClick={goThisWeek}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                Today
              </button>
              <button
                onClick={goNextWeek}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
          >
            <div className="grid grid-cols-7 border-b border-gray-100">
              {days.map((d, i) => {
                const today = isToday(d);
                return (
                  <div
                    key={i}
                    className={`text-center py-3 ${
                      today
                        ? "bg-blue-50"
                        : i < 6
                        ? "border-r border-gray-100"
                        : ""
                    } ${i < 6 && today ? "border-r border-blue-100" : ""} ${
                      i < 6 && !today ? "border-r border-gray-100" : ""
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {DAY_LABELS[i]}
                    </p>
                    <p
                      className={`text-lg font-extrabold mt-0.5 ${
                        today ? "text-blue-700" : "text-gray-900"
                      }`}
                    >
                      {d.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const key = d.toDateString();
                const dayEvents = eventsByDay.get(key) ?? [];
                const today = isToday(d);

                return (
                  <div
                    key={i}
                    className={`min-h-[200px] p-2 ${
                      today ? "bg-blue-50/30 ring-2 ring-inset ring-blue-200" : ""
                    } ${i < 6 ? "border-r border-gray-100" : ""}`}
                  >
                    <div className="space-y-2">
                      {dayEvents.map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/events/${ev.id}`}
                          className={`block rounded-lg p-3 text-sm cursor-pointer hover:shadow-md transition-all border ${
                            STATUS_BLOCK_BG[ev.status]
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[ev.status]}`}
                            />
                            <span className="font-semibold text-gray-900 truncate text-xs">
                              {ev.eventType}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {ev.clientName}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">
                                group
                              </span>
                              {ev.guestCount}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {formatTime(ev.eventDate)}
                            </span>
                          </div>
                        </Link>
                      ))}
                      {dayEvents.length === 0 && (
                        <p className="text-[10px] text-gray-300 text-center pt-8 font-medium">
                          No events
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Capacity bars */}
            <div className="grid grid-cols-7 border-t border-gray-100">
              {days.map((d, i) => {
                const guests = guestsPerDay.get(d.toDateString()) ?? 0;
                return (
                  <div
                    key={i}
                    className={`pt-2 ${i < 6 ? "border-r border-gray-100" : ""}`}
                  >
                    <CapacityBar dayDate={d} guests={guests} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* List View                                                        */
        /* ---------------------------------------------------------------- */
        <>
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "0px 10px 40px rgba(45,51,53,0.06)" }}
          >
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
                  <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden lg:table-cell">
                    Revenue
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
                    onClick={() =>
                      (window.location.href = `/events/${event.id}`)
                    }
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
                        <span className="material-symbols-outlined text-base">
                          group
                        </span>
                        {event.guestCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden lg:table-cell">
                      {formatCurrency(event.totalPrice || 0)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          STATUS_BADGE[event.status]
                        }`}
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
                          <span className="material-symbols-outlined text-lg">
                            visibility
                          </span>
                        </Link>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="material-symbols-outlined text-lg">
                            more_vert
                          </span>
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
                  <span className="material-symbols-outlined text-lg">
                    chevron_left
                  </span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
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
                  )
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <span className="material-symbols-outlined text-lg">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

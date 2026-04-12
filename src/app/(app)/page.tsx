"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useEvents, type EventStatus } from "@/lib/hooks/useEvents";
import { useWasteLog } from "@/lib/hooks/useWaste";
import { formatCurrency } from "@/lib/utils";

// --- Helpers ---

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  proposal: { label: "Proposed", className: "bg-amber-50 text-amber-700" },
  inquiry: { label: "In Planning", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const AMBIENT_SHADOW = "0px 10px 40px rgba(45,51,53,0.06)";

// --- Components ---

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  change,
  changePositive,
}: {
  label: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  change?: string;
  changePositive?: boolean;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`material-symbols-outlined text-sm ${
                  changePositive ? "text-green-600" : "text-red-500"
                }`}
              >
                {changePositive ? "arrow_upward" : "arrow_downward"}
              </span>
              <span
                className={`text-xs font-semibold ${
                  changePositive ? "text-green-600" : "text-red-500"
                }`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
        >
          <span className={`material-symbols-outlined text-xl ${iconColor}`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  href: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl bg-white p-5 transition-all duration-150 hover:scale-[1.02] hover:shadow-md"
      style={{ boxShadow: AMBIENT_SHADOW }}
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        <span className={`material-symbols-outlined text-lg ${iconColor}`}>
          {icon}
        </span>
      </div>
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
    </Link>
  );
}

// --- Main Dashboard ---

export default function DashboardPage() {
  const { data: events, loading: eventsLoading } = useEvents();
  const { data: wasteEntries, loading: wasteLoading } = useWasteLog();

  const loading = eventsLoading || wasteLoading;

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);

  // Derived metrics
  const metrics = useMemo(() => {
    const allEvents = events ?? [];
    const allWaste = wasteEntries ?? [];

    const activeEvents = allEvents.filter(
      (e) =>
        e.status !== "cancelled" &&
        e.status !== "completed"
    );

    const thisMonthEvents = allEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d >= monthStart && d <= now;
    });

    const weekRevenue = allEvents
      .filter((e) => {
        const d = new Date(e.eventDate);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, e) => sum + (e.totalPrice || 0), 0);

    const totalRevenue = thisMonthEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const totalCost = thisMonthEvents.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0
    );
    const avgMargin =
      totalRevenue > 0
        ? ((totalRevenue - totalCost) / totalRevenue) * 100
        : 0;

    const pendingOrders = allEvents.filter(
      (e) => e.status === "inquiry" || e.status === "proposal"
    ).length;

    const wasteCost = allWaste
      .filter((w) => {
        const d = new Date(w.date);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, w) => sum + (w.totalCost || 0), 0);

    return {
      activeEvents: activeEvents.length,
      weekRevenue,
      avgMargin,
      pendingOrders,
      wasteCost,
    };
  }, [events, wasteEntries, weekStart, weekEnd, monthStart, now]);

  // Upcoming events (future, sorted ascending, max 5)
  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter(
        (e) =>
          new Date(e.eventDate) >= now &&
          e.status !== "cancelled" &&
          e.status !== "completed"
      )
      .sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      )
      .slice(0, 5);
  }, [events, now]);

  // Events needing reconciliation
  const needsAttention = useMemo(() => {
    if (!events) return [];
    return events.filter(
      (e) =>
        e.status === "completed" &&
        (e.totalCost === 0 || e.totalPrice === 0 || e.marginPercentage === 0)
    );
  }, [events]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-blue-600">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Welcome Back, Chef
        </h1>
        <p className="mt-1 font-medium text-gray-500">
          Here&apos;s what&apos;s cooking today
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Events"
          value={String(metrics.activeEvents)}
          icon="event"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          change="vs last week"
        />
        <MetricCard
          label="Week Revenue"
          value={formatCurrency(metrics.weekRevenue)}
          icon="payments"
          iconBg="bg-green-100"
          iconColor="text-green-600"
          changePositive={true}
          change="this week"
        />
        <MetricCard
          label="Avg Margin"
          value={`${metrics.avgMargin.toFixed(1)}%`}
          icon="trending_up"
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          changePositive={metrics.avgMargin >= 30}
          change="this month"
        />
        <MetricCard
          label="Pending Orders"
          value={String(metrics.pendingOrders)}
          icon="inventory_2"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Two-column: Upcoming Events + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Events */}
        <div
          className="lg:col-span-2 rounded-2xl bg-white"
          style={{ boxShadow: AMBIENT_SHADOW }}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Upcoming Events</h2>
            <Link
              href="/events"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
            >
              View All
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="px-6 pb-6">
              <p className="py-8 text-center text-sm text-gray-400">
                No upcoming events
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingEvents.map((event) => {
                const d = new Date(event.eventDate);
                const month = d
                  .toLocaleDateString("en-US", { month: "short" })
                  .toUpperCase();
                const day = d.getDate();
                const status = STATUS_MAP[event.status] ?? {
                  label: event.status,
                  className: "bg-gray-100 text-gray-700",
                };

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                  >
                    {/* Date box */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {month}
                      </span>
                      <span className="text-xl font-extrabold leading-none text-gray-900">
                        {day}
                      </span>
                    </div>

                    {/* Event info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gray-900">
                        {event.eventType || "Event"}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {event.clientName}
                      </p>
                    </div>

                    {/* Guest count */}
                    <div className="hidden items-center gap-1 text-sm text-gray-500 sm:flex">
                      <span className="material-symbols-outlined text-base text-gray-400">
                        group
                      </span>
                      {event.guestCount}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionCard
              href="/recipes/new"
              icon="menu_book"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title="New Recipe"
              subtitle="Create a dish"
            />
            <QuickActionCard
              href="/waste/log"
              icon="delete_sweep"
              iconBg="bg-red-100"
              iconColor="text-red-500"
              title="Log Waste"
              subtitle="Record waste"
            />
            <QuickActionCard
              href="/vendors/new"
              icon="local_shipping"
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              title="Add Vendor"
              subtitle="New supplier"
            />
            <QuickActionCard
              href="/inventory"
              icon="inventory_2"
              iconBg="bg-green-100"
              iconColor="text-green-600"
              title="Stock Check"
              subtitle="Review inventory"
            />
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {needsAttention.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="material-symbols-outlined mt-0.5 text-xl text-amber-600">
            warning
          </span>
          <div>
            <p className="font-bold text-amber-900">
              {needsAttention.length} event{needsAttention.length !== 1 ? "s" : ""} need reconciliation
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              Completed events with missing cost or revenue data require attention.{" "}
              <Link
                href={`/events/${needsAttention[0]?.id}`}
                className="font-semibold underline hover:text-amber-900"
              >
                Review now
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

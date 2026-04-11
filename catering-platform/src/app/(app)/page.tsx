"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Trash2,
  Plus,
  BookOpen,
  BarChart3,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEvents, type Event, type EventStatus } from "@/lib/hooks/useEvents";
import { useWasteLog, type WasteEntry } from "@/lib/hooks/useWaste";
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

const STATUS_COLORS: Record<EventStatus, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  proposal: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Components ---

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="rounded-lg bg-blue-50 p-3">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
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

    const thisWeekEvents = allEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d >= weekStart && d < weekEnd;
    });

    const thisMonthEvents = allEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d >= monthStart && d <= now;
    });

    const totalRevenue = thisMonthEvents.reduce(
      (sum, e) => sum + (e.totalPrice || 0),
      0
    );
    const totalCost = thisMonthEvents.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0
    );
    const foodCostPct =
      totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    const wasteCost = allWaste
      .filter((w) => {
        const d = new Date(w.date);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, w) => sum + (w.totalCost || 0), 0);

    return {
      thisWeekCount: thisWeekEvents.length,
      totalRevenue,
      foodCostPct,
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

  // Events needing reconciliation (completed but 0 margin or cost data missing)
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Overview of your catering operations
        </p>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="This Week's Events"
          value={String(metrics.thisWeekCount)}
          icon={CalendarDays}
          subtitle="Upcoming this week"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon={DollarSign}
          subtitle="This month"
        />
        <MetricCard
          title="Food Cost %"
          value={`${metrics.foodCostPct.toFixed(1)}%`}
          icon={TrendingUp}
          subtitle="This month"
        />
        <MetricCard
          title="Waste Cost"
          value={formatCurrency(metrics.wasteCost)}
          icon={Trash2}
          subtitle="This week"
        />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">
              Upcoming Events
            </CardTitle>
            <Link
              href="/events"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No upcoming events
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {event.clientName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(event.eventDate)} &middot;{" "}
                        {event.guestCount} guests
                      </p>
                    </div>
                    <Badge
                      className={`ml-3 shrink-0 ${STATUS_COLORS[event.status]}`}
                      variant="secondary"
                    >
                      {event.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton
                href="/events/new"
                icon={Plus}
                label="New Event"
              />
              <QuickActionButton
                href="/recipes/new"
                icon={BookOpen}
                label="New Recipe"
              />
              <QuickActionButton
                href="/waste/log"
                icon={Trash2}
                label="Log Waste"
              />
              <QuickActionButton
                href="/reports"
                icon={BarChart3}
                label="View Reports"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsAttention.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-3 transition-colors hover:bg-amber-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {event.clientName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(event.eventDate)} &middot;{" "}
                      {event.guestCount} guests
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs font-medium text-amber-600">
                    Needs reconciliation
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

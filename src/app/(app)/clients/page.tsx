"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useClients } from "@/lib/hooks/useClients";

const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
];

const ROWS_PER_PAGE = 10;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientsPage() {
  const { data: clients, loading, error } = useClients();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [search]);

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load clients. Please try again.
      </div>
    );
  }

  // Stat calculations
  const totalClients = clients?.length ?? 0;
  const activeThisMonth = clients
    ? clients.filter((c) => {
        if (!c.updatedAt) return false;
        const updated =
          c.updatedAt instanceof Date
            ? c.updatedAt
            : new Date((c.updatedAt as any).seconds * 1000);
        const now = new Date();
        return (
          updated.getMonth() === now.getMonth() &&
          updated.getFullYear() === now.getFullYear()
        );
      }).length
    : 0;
  const corporatePartners = clients
    ? clients.filter((c) => c.company && c.company.trim().length > 0).length
    : 0;

  const stats = [
    {
      label: "Total Clients",
      value: totalClients,
      icon: "group",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active This Month",
      value: activeThisMonth,
      icon: "trending_up",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Corporate Partners",
      value: corporatePartners,
      icon: "business",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Client Satisfaction",
      value: "98%",
      icon: "sentiment_satisfied",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client relationships"
        action={{
          label: "Add Client",
          href: "/clients/new",
          icon: "person_add",
        }}
      />

      {clients && clients.length > 0 ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-6 ambient-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}
                  >
                    <span
                      className={`material-symbols-outlined text-xl ${stat.color}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Data Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              No clients match your search.
            </div>
          ) : (
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Name
                    </th>
                    <th className="text-left px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Company
                    </th>
                    <th className="text-left px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Email
                    </th>
                    <th className="text-left px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Phone
                    </th>
                    <th className="text-right px-6 py-4 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((client, idx) => {
                    const colorIdx =
                      ((page - 1) * ROWS_PER_PAGE + idx) %
                      AVATAR_COLORS.length;
                    const color = AVATAR_COLORS[colorIdx];
                    return (
                      <tr
                        key={client.id}
                        className="group border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/clients/${client.id}`}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-bold shrink-0`}
                            >
                              {getInitials(client.name)}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">
                              {client.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {client.company ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                              {client.company}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {client.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {client.phone}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/clients/${client.id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100"
                          >
                            <span className="material-symbols-outlined text-gray-400 text-xl">
                              more_vert
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {(page - 1) * ROWS_PER_PAGE + 1}--
                    {Math.min(page * ROWS_PER_PAGE, filtered.length)} of{" "}
                    {filtered.length} clients
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        chevron_left
                      </span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                            p === page
                              ? "bg-blue-700 text-white"
                              : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="group"
          title="No clients yet"
          description="Add your first client to start managing contacts and event bookings."
          action={{ label: "Add Client", href: "/clients/new" }}
        />
      )}
    </div>
  );
}

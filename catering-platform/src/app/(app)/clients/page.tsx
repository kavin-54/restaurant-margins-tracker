"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClients } from "@/lib/hooks/useClients";

export default function ClientsPage() {
  const { data: clients, loading, error } = useClients();
  const [search, setSearch] = useState("");

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

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load clients. Please try again.
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Clients"
        description="Manage your client contacts and information"
        action={{
          label: "Add Client",
          href: "/clients/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {clients && clients.length > 0 ? (
        <>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No clients match your search.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/clients/${client.id}`}
                          className="block font-medium text-foreground hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.company || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No clients yet"
          description="Add your first client to start managing contacts and event bookings."
          action={{ label: "Add Client", href: "/clients/new" }}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { label: "Log Waste", icon: "delete_sweep", href: "/waste", color: "from-red-500 to-red-700" },
  { label: "Add Ingredient", icon: "egg_alt", href: "/ingredients/new", color: "from-green-500 to-green-700" },
  { label: "New Event", icon: "event", href: "/events/new", color: "from-purple-500 to-purple-700" },
  { label: "New Recipe", icon: "menu_book", href: "/recipes/new", color: "from-orange-500 to-orange-700" },
  { label: "New Client", icon: "person_add", href: "/clients/new", color: "from-cyan-500 to-cyan-700" },
];

export function FloatingActionButton() {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  function handleAction(href: string) {
    setExpanded(false);
    router.push(href);
  }

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-200"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Action items */}
        {expanded && (
          <div className="flex flex-col items-end gap-2 mb-2">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={action.href}
                onClick={() => handleAction(action.href)}
                className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
              >
                {/* Label pill */}
                <span className="bg-white rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-md whitespace-nowrap">
                  {action.label}
                </span>
                {/* Icon circle */}
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg active:scale-90 transition-transform duration-150`}
                >
                  <span className="material-symbols-outlined text-white text-xl">{action.icon}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-90 transition-all duration-200 ${
            expanded ? "rotate-45" : "rotate-0"
          }`}
          aria-label={expanded ? "Close quick actions" : "Open quick actions"}
        >
          <span className="material-symbols-outlined text-white text-3xl">add</span>
        </button>
      </div>
    </>
  );
}

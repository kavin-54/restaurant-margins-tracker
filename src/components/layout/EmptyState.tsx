"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center ambient-shadow bg-white">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-blue-600 text-3xl">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-sm font-medium">{description}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="h-11 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 inline-flex items-center gap-2 px-5"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="h-11 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 inline-flex items-center gap-2 px-5"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

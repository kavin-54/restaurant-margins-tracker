"use client";

import React from "react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: string;
  };
  children?: React.ReactNode;
}

export function PageHeader({ title, description, backHref, action, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-slate-100 hover:text-gray-600 transition-all duration-150"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{title}</h1>
            {description && (
              <p className="text-sm text-gray-500 mt-1 font-medium">{description}</p>
            )}
          </div>
        </div>
        {action && (
          action.href ? (
            <Link
              href={action.href}
              className="h-11 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 px-5"
            >
              {action.icon && <span className="material-symbols-outlined text-lg">{action.icon}</span>}
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="h-11 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 flex items-center gap-2 px-5"
            >
              {action.icon && <span className="material-symbols-outlined text-lg">{action.icon}</span>}
              {action.label}
            </button>
          )
        )}
      </div>
      {children}
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-white/85 backdrop-blur-md border-b border-slate-200/40 px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-400 hover:bg-slate-100 lg:hidden"
      >
        <span className="material-symbols-outlined text-xl">menu</span>
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input
            type="text"
            placeholder="Search events, recipes, clients..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-100 border-none text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-slate-100 transition-colors relative">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined text-xl">help_outline</span>
        </button>
        <Link
          href="/events/new"
          className="hidden md:flex h-10 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 items-center gap-2 px-5"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Event
        </Link>
      </div>
    </header>
  );
}

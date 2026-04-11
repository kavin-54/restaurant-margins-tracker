"use client";

import React from "react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

export function Header({ onMenuToggle, title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {title && (
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      )}
    </header>
  );
}

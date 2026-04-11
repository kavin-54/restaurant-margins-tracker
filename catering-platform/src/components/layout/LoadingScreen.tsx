"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className || ""}`} />;
}

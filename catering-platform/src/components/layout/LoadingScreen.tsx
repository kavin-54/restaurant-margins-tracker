"use client";

import React from "react";

export function LoadingScreen() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center animate-pulse">
        <span className="material-symbols-outlined text-blue-600 text-2xl">restaurant</span>
      </div>
      <p className="text-sm font-medium text-gray-400 tracking-wide">Loading...</p>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className || ""}`}>
      <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

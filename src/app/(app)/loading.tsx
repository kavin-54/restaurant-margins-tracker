import React from "react";

export default function Loading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center animate-spin mx-auto mb-4">
          <span className="material-symbols-outlined text-blue-600 text-2xl">progress_activity</span>
        </div>
        <p className="text-sm font-medium text-gray-400 tracking-wide">Loading...</p>
      </div>
    </div>
  );
}

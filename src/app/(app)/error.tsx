"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-red-500 text-4xl">error_outline</span>
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-500 max-w-md mb-8">
        An unexpected error occurred. This has been logged and we'll look into it.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = "/"}
          className="px-6 py-3 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

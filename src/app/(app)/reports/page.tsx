"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const REPORT_CARDS = [
  {
    title: "Cost Analysis",
    description: "Break down food costs across events and recipes to identify savings opportunities.",
    icon: "payments",
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Event Performance",
    description: "Review revenue, margins, and guest satisfaction per event.",
    icon: "event",
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Waste Summary",
    description: "Analyze waste patterns by category, ingredient, and time period.",
    icon: "delete_sweep",
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    title: "Vendor Comparison",
    description: "Compare vendor pricing, lead times, and reliability side by side.",
    icon: "local_shipping",
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export default function ReportsPage() {
  const { toast } = useToast();

  function handleReportClick(title: string) {
    toast({
      title: "Coming soon",
      description: `${title} report is under development.`,
    });
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Insights and analytics for your operations"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORT_CARDS.map((report) => (
          <button
            key={report.title}
            onClick={() => handleReportClick(report.title)}
            className="bg-white rounded-2xl ambient-shadow p-6 text-left cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] group"
          >
            <div className={`w-12 h-12 ${report.bgColor} rounded-xl flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined text-2xl ${report.iconColor}`}>{report.icon}</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
              {report.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              {report.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

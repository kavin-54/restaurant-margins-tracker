"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  Trash2,
  Truck,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const REPORT_CARDS = [
  {
    title: "Event P&L",
    description: "Profit & loss breakdown by event",
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Food Cost Trends",
    description: "Track food cost % over time",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Waste Analysis",
    description: "Waste patterns by category and ingredient",
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    title: "Vendor Comparison",
    description: "Compare vendor pricing and reliability",
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Margin Trends",
    description: "Track margins across events and service styles",
    icon: BarChart3,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Recipe Profitability",
    description: "Most and least profitable recipes",
    icon: BookOpen,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
];

const SUMMARY_METRICS = [
  { label: "Overall Food Cost %", value: "--" },
  { label: "Average Event Margin", value: "--" },
  { label: "Total Waste This Month", value: "--" },
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
    <div className="p-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights into your catering operations performance"
      />

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {REPORT_CARDS.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.title}
              className="cursor-pointer transition-all duration-150 hover:shadow-md hover:border-primary/20 active:scale-[0.98]"
              onClick={() => handleReportClick(report.title)}
            >
              <CardContent className="flex items-start gap-4 pt-6">
                <div
                  className={`flex-shrink-0 rounded-lg p-3 ${report.bgColor}`}
                >
                  <Icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {report.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {report.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {SUMMARY_METRICS.map((metric) => (
              <div key={metric.label} className="text-center">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

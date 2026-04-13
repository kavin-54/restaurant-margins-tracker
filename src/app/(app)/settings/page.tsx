"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useToast } from "@/components/ui/use-toast";
import {
  useSystemConfig,
  updateSystemConfig,
} from "@/lib/hooks/useSystemConfig";

const DEFAULT_CONFIG = {
  businessName: "",
  contactEmail: "",
  contactPhone: "",
  taxRate: 8.875,
  defaultMarkupPercentage: 35,
  defaultMinMarginPercentage: 20,
  laborCostPerHour: 150,
  prepTimeMinutesPerServing: 5,
  currency: "INR",
  timezone: "Asia/Kolkata",
};

export default function SettingsPage() {
  const { data: config, loading } = useSystemConfig();
  const { toast } = useToast();

  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (config && !initialized) {
      setForm({
        businessName: config.businessName || "",
        contactEmail: config.contactEmail || "",
        contactPhone: config.contactPhone || "",
        taxRate: config.taxRate ?? DEFAULT_CONFIG.taxRate,
        defaultMarkupPercentage:
          config.defaultMarkupPercentage ?? DEFAULT_CONFIG.defaultMarkupPercentage,
        defaultMinMarginPercentage:
          config.defaultMinMarginPercentage ?? DEFAULT_CONFIG.defaultMinMarginPercentage,
        laborCostPerHour:
          config.laborCostPerHour ?? DEFAULT_CONFIG.laborCostPerHour,
        prepTimeMinutesPerServing:
          config.prepTimeMinutesPerServing ?? DEFAULT_CONFIG.prepTimeMinutesPerServing,
        currency: config.currency || DEFAULT_CONFIG.currency,
        timezone: config.timezone || DEFAULT_CONFIG.timezone,
      });
      setInitialized(true);
    } else if (!loading && !config && !initialized) {
      setInitialized(true);
    }
  }, [config, loading, initialized]);

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (config) {
        await updateSystemConfig({
          businessName: form.businessName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          taxRate: Number(form.taxRate),
          defaultMarkupPercentage: Number(form.defaultMarkupPercentage),
          defaultMinMarginPercentage: Number(form.defaultMinMarginPercentage),
          laborCostPerHour: Number(form.laborCostPerHour),
          prepTimeMinutesPerServing: Number(form.prepTimeMinutesPerServing),
          currency: form.currency,
          timezone: form.timezone,
        });
      } else {
        const { setDoc, doc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase/config");
        await setDoc(doc(db, "systemConfig", "default"), {
          ...form,
          taxRate: Number(form.taxRate),
          defaultMarkupPercentage: Number(form.defaultMarkupPercentage),
          defaultMinMarginPercentage: Number(form.defaultMinMarginPercentage),
          laborCostPerHour: Number(form.laborCostPerHour),
          prepTimeMinutesPerServing: Number(form.prepTimeMinutesPerServing),
          updatedAt: new Date(),
        });
      }

      toast({
        title: "Settings saved",
        description: "Your configuration has been updated.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="System configuration and preferences"
      />

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Business Info */}
        <div className="bg-white rounded-2xl ambient-shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-xl">business</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Business Info</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Business Name</label>
              <input
                placeholder="Your Catering Company"
                value={form.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Contact Email</label>
                <input
                  type="email"
                  placeholder="info@example.com"
                  value={form.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                  className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financial Defaults */}
        <div className="bg-white rounded-2xl ambient-shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-xl">payments</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Financial Defaults</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Tax Rate (%)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={form.taxRate}
                onChange={(e) => updateField("taxRate", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Default Markup (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.defaultMarkupPercentage}
                onChange={(e) => updateField("defaultMarkupPercentage", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Min Margin (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.defaultMinMarginPercentage}
                onChange={(e) => updateField("defaultMinMarginPercentage", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Labor & Operations */}
        <div className="bg-white rounded-2xl ambient-shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 text-xl">schedule</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Labor & Operations</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Labor Cost per Hour (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.laborCostPerHour}
                onChange={(e) => updateField("laborCostPerHour", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Prep Time per Serving (min)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.prepTimeMinutesPerServing}
                onChange={(e) => updateField("prepTimeMinutesPerServing", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Locale */}
        <div className="bg-white rounded-2xl ambient-shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-xl">language</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Locale</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Currency</label>
              <input
                placeholder="INR"
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Timezone</label>
              <input
                placeholder="Asia/Kolkata"
                value={form.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
                className="w-full bg-gray-50 border-none h-12 rounded-lg px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="h-12 px-8 bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

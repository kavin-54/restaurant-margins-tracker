"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  useSystemConfig,
  updateSystemConfig,
  SystemConfig,
} from "@/lib/hooks/useSystemConfig";
import { addDocument } from "@/lib/firebase/firestore";

const DEFAULT_CONFIG = {
  businessName: "",
  contactEmail: "",
  contactPhone: "",
  taxRate: 8.875,
  defaultMarkupPercentage: 35,
  defaultMinMarginPercentage: 20,
  laborCostPerHour: 18,
  prepTimeMinutesPerServing: 5,
  currency: "USD",
  timezone: "America/New_York",
};

export default function SettingsPage() {
  const { data: config, loading, error } = useSystemConfig();
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
      // Config doesn't exist yet, use defaults
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
        // Update existing config
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
        // Create initial config document with "default" id
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
    <div className="p-6">
      <PageHeader
        title="Settings"
        description="Configure your catering platform preferences"
      />

      <form onSubmit={handleSave}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Business Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Business Info
              </h3>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Your Catering Company"
                  value={form.businessName}
                  onChange={(e) => updateField("businessName", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="info@example.com"
                    value={form.contactEmail}
                    onChange={(e) =>
                      updateField("contactEmail", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={form.contactPhone}
                    onChange={(e) =>
                      updateField("contactPhone", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Financial Defaults */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Financial Defaults
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    value={form.taxRate}
                    onChange={(e) => updateField("taxRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultMarkupPercentage">
                    Default Markup (%)
                  </Label>
                  <Input
                    id="defaultMarkupPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.defaultMarkupPercentage}
                    onChange={(e) =>
                      updateField("defaultMarkupPercentage", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultMinMarginPercentage">
                    Min Margin (%)
                  </Label>
                  <Input
                    id="defaultMinMarginPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.defaultMinMarginPercentage}
                    onChange={(e) =>
                      updateField("defaultMinMarginPercentage", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Labor & Operations */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Labor & Operations
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="laborCostPerHour">
                    Labor Cost per Hour ($)
                  </Label>
                  <Input
                    id="laborCostPerHour"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.laborCostPerHour}
                    onChange={(e) =>
                      updateField("laborCostPerHour", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prepTimeMinutesPerServing">
                    Prep Time per Serving (min)
                  </Label>
                  <Input
                    id="prepTimeMinutesPerServing"
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.prepTimeMinutesPerServing}
                    onChange={(e) =>
                      updateField("prepTimeMinutesPerServing", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Locale */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Locale
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    placeholder="USD"
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="America/New_York"
                    value={form.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={saving}
                className="w-full sm:w-auto gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

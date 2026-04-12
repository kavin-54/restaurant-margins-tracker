import { ServiceStyle } from "@/lib/types";

export const SERVICE_STYLES: { value: ServiceStyle; label: string; description: string }[] = [
  { value: "buffet", label: "Buffet", description: "Self-service stations" },
  { value: "plated", label: "Plated / Sit-Down", description: "Pre-portioned plates served to seated guests" },
  { value: "cocktail", label: "Cocktail / Passed", description: "Passed hors d'oeuvres, pieces per person per hour" },
  { value: "drop-off", label: "Drop-Off", description: "Deliver food in trays, client handles service" },
  { value: "family-style", label: "Family Style", description: "Shared platters served to tables" },
  { value: "food-stations", label: "Food Stations", description: "Multiple themed mini-buffet stations" },
];

export const DEFAULT_BUFFERS: Record<ServiceStyle, number> = {
  buffet: 7,
  plated: 5,
  cocktail: 8,
  "drop-off": 7,
  "family-style": 6,
  "food-stations": 7,
};

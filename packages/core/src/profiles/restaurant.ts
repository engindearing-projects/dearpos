import type { BusinessProfile } from "../profile-types";

export const restaurant: BusinessProfile = {
  id: "restaurant",
  name: "Restaurant — Table Service",
  description: "Sit-down restaurant with tables, modifiers, and kitchen tickets. Modeled on Jewel of the North.",

  features: [
    "tableService",
    "kitchenTickets",
    "splitChecks",
    "tipPrompts",
  ],

  defaults: {
    taxRate: 0.089,
    tipSuggestions: [0.18, 0.20, 0.22],
    requirePinForVoid: true,
    requireManagerForRefund: true,
  },

  ui: {
    primaryAction: "openTable",
    showCategoryGrid: true,
    showTableLayout: false, // v0.2 — floor plan editor
    showSearchBarcode: false,
  },
};

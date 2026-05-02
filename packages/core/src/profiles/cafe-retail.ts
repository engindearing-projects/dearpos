import type { BusinessProfile } from "../profile-types";

export const cafeRetail: BusinessProfile = {
  id: "cafe-retail",
  name: "Café / Retail — Quick Ring-Up",
  description: "Coffee shops, boutiques, bottle shops. Fast checkout, SKU + barcode, modifier-heavy drinks.",

  features: [
    "kitchenTickets",     // for the espresso bar
    "barcodeScanning",
    "tipPrompts",
  ],

  defaults: {
    taxRate: 0.089,
    tipSuggestions: [0.15, 0.18, 0.20],
    requirePinForVoid: true,
    requireManagerForRefund: false,
  },

  ui: {
    primaryAction: "ringUp",
    showCategoryGrid: true,
    showTableLayout: false,
    showSearchBarcode: true,
  },
};

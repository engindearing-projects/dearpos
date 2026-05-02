// A BusinessProfile decides how the UI behaves and which fields show up.
// It does NOT fork the schema — every profile uses the same Item/Variant/Modifier spine.
//
// Adding a new profile (food truck, bakery, salon, bottle shop) means writing
// one config file. No schema changes, no UI forks.

export type ProfileFeature =
  | "tableService"        // table numbers, guest counts, seat assignment
  | "kitchenTickets"      // route ordered items to kitchen stations
  | "splitChecks"         // split a single order across multiple payments
  | "barcodeScanning"     // scan-to-add for retail / café
  | "weighableItems"      // produce, candy-by-the-pound
  | "tipPrompts"          // tip selector at checkout
  | "loyaltyLookup";      // future: pull customer by phone for loyalty

export interface BusinessProfile {
  id: string;                       // "restaurant" | "cafe-retail"
  name: string;                     // human label
  description: string;

  features: ProfileFeature[];

  defaults: {
    taxRate: number;                // decimal, e.g. 0.089 for Spokane
    tipSuggestions: number[];       // [0.15, 0.18, 0.20] or [] for retail
    requirePinForVoid: boolean;
    requireManagerForRefund: boolean;
  };

  ui: {
    primaryAction: "ringUp" | "openTable";   // what the home screen does
    showCategoryGrid: boolean;
    showTableLayout: boolean;
    showSearchBarcode: boolean;
  };
}

import type { BusinessProfile } from "../profile-types";
import { restaurant } from "./restaurant";
import { cafeRetail } from "./cafe-retail";

export const profiles: Record<string, BusinessProfile> = {
  restaurant,
  "cafe-retail": cafeRetail,
};

export function getProfile(id: string): BusinessProfile {
  const p = profiles[id];
  if (!p) throw new Error(`Unknown business profile: ${id}`);
  return p;
}

export { restaurant, cafeRetail };

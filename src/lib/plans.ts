import type { Plan } from "./types";
import { PLAN_CATALOG } from "./plan-config";

/** Display list derived from the central plan config — edit numbers there. */
export const PLANS: Plan[] = PLAN_CATALOG.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.priceLabel,
  cadence: p.cadence,
  blurb: p.blurb,
  highlighted: p.highlighted,
  features: p.highlights,
}));

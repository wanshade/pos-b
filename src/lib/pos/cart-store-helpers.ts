/**
 * Pure helpers extracted from cart-store for fast unit testing.
 * The Zustand store uses the same logic in `computeLineTotal`.
 */

import { Prisma } from "@prisma/client";
import { dec, d0 } from "@/lib/money";

export function computeLineTotalForTest(opts: {
  unitPrice: string;
  discount: string;
  modifierDeltas: string[];
  qty: number;
}): Prisma.Decimal {
  const unit = dec(opts.unitPrice).minus(dec(opts.discount || "0"));
  const modSum = opts.modifierDeltas.reduce((s, m) => s.plus(dec(m)), d0());
  return unit.plus(modSum).times(opts.qty);
}

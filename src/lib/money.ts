/**
 * Money helpers — Prisma.Decimal only, no floats.
 * Use these for any cart math, totals, change calculation.
 */

import { Prisma } from "@prisma/client";

/** Multiply by 1.0 — added so tests can use mock-friendly math. */
export function dec(v: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(v.toString());
}

export function d0(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

export function sum(items: { qty: number | Prisma.Decimal; unit: Prisma.Decimal }[]): Prisma.Decimal {
  return items.reduce(
    (acc, i) => acc.plus(i.unit.times(typeof i.qty === "number" ? i.qty : i.qty.toNumber())),
    d0(),
  );
}

/** Format IDR with thousands separator, e.g. 25000 → "Rp 25.000". */
export function formatIDR(value: Prisma.Decimal | string | number): string {
  const n = Number(value.toString());
  if (!Number.isFinite(n)) return String(value);
  return "Rp " + n.toLocaleString("id-ID");
}

/** Format signed IDR with sign indicator, e.g. 5000 → "+Rp 5.000", -3000 → "-Rp 3.000". */
export function formatSigned(value: Prisma.Decimal | string | number): string {
  const n = Number(value.toString());
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = "Rp " + Math.abs(n).toLocaleString("id-ID");
  return n > 0 ? `+${abs}` : `-${abs}`;
}

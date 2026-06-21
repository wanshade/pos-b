/**
 * POS cart store (Zustand).
 *
 * The cart lives in client memory and is persisted to localStorage so a
 * page reload doesn't lose the cashier's in-progress order.
 *
 * NOTE: cart items reference MenuItem/variant/modifier IDs that exist in
 * the DB. We snapshot the names + prices so receipt/inventory math
 * works even if menu data changes while the order is in flight.
 */

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { Prisma } from "@prisma/client";
import { dec, d0 } from "@/lib/money";

export type CartVariant = {
  id: string;
  name: string;
  priceDelta: string; // decimal string
};

export type CartModifier = {
  id: string;
  groupName: string;
  name: string;
  priceDelta: string; // decimal string
};

export type CartLine = {
  /** local-only line id (uuid-like). Not the OrderItem.id. */
  lineId: string;
  menuItemId: string;
  nameSnapshot: string;
  variant: CartVariant | null;
  modifiers: CartModifier[];
  qty: number;
  /** base price + variant priceDelta (per unit, before line discount). */
  unitPrice: string;
  /** per-unit discount amount, default 0. */
  discount: string;
  notes: string;
};

export type CartState = {
  // lines
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "lineId" | "qty" | "discount" | "notes">) => void;
  updateQty: (lineId: string, qty: number) => void;
  updateLineDiscount: (lineId: string, discount: string) => void;
  updateLineNotes: (lineId: string, notes: string) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;

  // order-level
  orderDiscount: string; // IDR, default 0
  orderDiscountCode: string;
  orderNotes: string;
  customerName: string;
  setOrderDiscount: (v: string) => void;
  setOrderDiscountCode: (v: string) => void;
  setOrderNotes: (v: string) => void;
  setCustomerName: (v: string) => void;
  setType: (t: "DINE_IN" | "TAKEOUT" | "DELIVERY") => void;
  type: "DINE_IN" | "TAKEOUT" | "DELIVERY";

  // computations (functions, not state)
  lineTotal: (line: CartLine) => Prisma.Decimal;
  subtotal: () => Prisma.Decimal;
  total: (taxRatePct: number) => Prisma.Decimal;

  // persistence helpers
  serialize: () => SerializedCart;
  load: (data: SerializedCart) => void;
};

export type SerializedCart = {
  lines: CartLine[];
  orderDiscount: string;
  orderDiscountCode: string;
  orderNotes: string;
  customerName: string;
  type: "DINE_IN" | "TAKEOUT" | "DELIVERY";
};

function rid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * In-memory storage used when `window.localStorage` is unavailable or throws
 * (jsdom without an origin gives a no-op `{}`; Safari private mode and some
 * sandboxed iframes throw on access). Without this fallback the Zustand
 * `persist` middleware would call `setItem` on a non-function and crash on
 * every `setState`.
 */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function safeStorage(): StateStorage {
  try {
    const ls = typeof window !== "undefined" ? window.localStorage : undefined;
    if (ls && typeof ls.getItem === "function" && typeof ls.setItem === "function") {
      return ls;
    }
  } catch {
    // access can throw in restricted environments — fall through to noop
  }
  return noopStorage;
}

/** unitPrice already includes variant delta. Discount is per-unit IDR. */
function computeLineTotal(line: CartLine): Prisma.Decimal {
  const unit = dec(line.unitPrice).minus(dec(line.discount || "0"));
  const modSum = line.modifiers.reduce((s, m) => s.plus(dec(m.priceDelta)), d0());
  return unit.plus(modSum).times(line.qty);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orderDiscount: "0",
      orderDiscountCode: "",
      orderNotes: "",
      customerName: "",
      type: "DINE_IN",

      addLine: (line) => {
        // merge with existing line if same item + variant + same modifiers (in same order)
        const existing = get().lines.find((l) => isSameLine(l, line));
        if (existing) {
          set((s) => ({
            lines: s.lines.map((l) => (l.lineId === existing.lineId ? { ...l, qty: l.qty + 1 } : l)),
          }));
        } else {
          set((s) => ({
            lines: [...s.lines, { ...line, lineId: rid(), qty: 1, discount: "0", notes: "" }],
          }));
        }
      },

      updateQty: (lineId, qty) => {
        if (qty <= 0) {
          get().removeLine(lineId);
          return;
        }
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, qty: Math.max(1, qty) } : l)),
        }));
      },

      updateLineDiscount: (lineId, discount) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, discount } : l)),
        }));
      },

      updateLineNotes: (lineId, notes) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, notes } : l)),
        }));
      },

      removeLine: (lineId) => {
        set((s) => ({ lines: s.lines.filter((l) => l.lineId !== lineId) }));
      },

      clear: () => set({
        lines: [],
        orderDiscount: "0",
        orderDiscountCode: "",
        orderNotes: "",
        customerName: "",
        type: "DINE_IN",
      }),

      setOrderDiscount: (v) => set({ orderDiscount: v }),
      setOrderDiscountCode: (v) => set({ orderDiscountCode: v }),
      setOrderNotes: (v) => set({ orderNotes: v }),
      setCustomerName: (v) => set({ customerName: v }),
      setType: (t) => set({ type: t }),

      lineTotal: computeLineTotal,
      subtotal: () => get().lines.reduce((s, l) => s.plus(computeLineTotal(l)), d0()),
      total: (taxRatePct) => {
        const sub = get().subtotal();
        const disc = dec(get().orderDiscount || "0");
        const taxBase = sub.minus(disc);
        const tax = taxBase.times(taxRatePct).dividedBy(100);
        return taxBase.plus(tax);
      },

      serialize: () => ({
        lines: get().lines,
        orderDiscount: get().orderDiscount,
        orderDiscountCode: get().orderDiscountCode,
        orderNotes: get().orderNotes,
        customerName: get().customerName,
        type: get().type,
      }),

      load: (data) => set(data),
    }),
    {
      name: "pos-cart",
      version: 1,
      storage: createJSONStorage(safeStorage),
    },
  ),
);

function isSameLine(a: CartLine, b: Omit<CartLine, "lineId" | "qty" | "discount" | "notes">): boolean {
  if (a.menuItemId !== b.menuItemId) return false;
  if ((a.variant?.id ?? null) !== (b.variant?.id ?? null)) return false;
  const aMods = [...a.modifiers].map((m) => m.id).sort().join(",");
  const bMods = [...b.modifiers].map((m) => m.id).sort().join(",");
  return aMods === bMods;
}

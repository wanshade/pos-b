/**
 * Zod schemas for the inventory domain.
 */

import { z } from "zod";

/** Signed decimal as a string, up to 2 decimals. Can be negative. */
const signedDecimal = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^-?\d+(\.\d{1,2})?$/, "Must be a number like 5, -3, 10.50");

/**
 * Manual stock adjustment form.
 * type is restricted to user-creatable movement types (no SALE — that's
 * automated from the POS terminal; no TRANSFER_* — single-outlet v1).
 */
export const stockAdjustmentSchema = z.object({
  stockItemId: z.string().min(1, "Pick an item"),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "OPNAME", "TRANSFER_IN", "TRANSFER_OUT"]),
  qty: signedDecimal.refine(
    (s) => Number(s) !== 0,
    "Quantity cannot be zero",
  ),
  reason: z.string().trim().max(280).optional().transform((s) => (s === "" ? null : s)),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// ---------- Shift ----------

/** Non-negative decimal string, up to 2 decimals. */
const money = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative number like 0, 200000, or 50000.50");

export const openShiftSchema = z.object({
  outletId: z.string().min(1, "Pick an outlet"),
  openingCash: money,
  notes: z.string().trim().max(500).optional().transform((s) => (s === "" ? null : s)),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;

export const closeShiftSchema = z.object({
  closingCash: money,
  notes: z.string().trim().max(500).optional().transform((s) => (s === "" ? null : s)),
});

export type CloseShiftInput = z.infer<typeof closeShiftSchema>;

// ---------- PurchaseOrder ----------

const lineItemShape = z.object({
  menuItemId: z.string().min(1, "Pick an item"),
  qty: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Qty must be a positive number")
    .refine((s) => Number(s) > 0, "Qty must be greater than 0"),
  unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/, "Unit cost must be a non-negative number"),
});

/** Non-negative decimal string up to 2 dp — used for "receive qty" inputs. */
export const receiveQtyRe = /^\d+(\.\d{1,2})?$/;

export const lineItemsArraySchema = z.array(lineItemShape).min(1, "Add at least one line item");

const optionalPOText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s === undefined || s === "" ? null : s));

export const purchaseOrderCreateSchema = z.object({
  // Supplier details are entered inline per-PO (no separate Supplier record).
  supplierName: z.string().trim().min(1, "Supplier name is required").max(120),
  supplierContact: optionalPOText(120),
  supplierPhone: optionalPOText(40),
  supplierEmail: optionalPOText(120).refine(
    (s) => s === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    "Invalid email",
  ),
  supplierAddress: optionalPOText(500),
  notes: z.string().trim().max(500).optional().transform((s) => (s === "" ? null : s)),
  /** "draft" keeps it editable; "order" marks it ORDERED immediately. */
  intent: z.enum(["draft", "order"]).default("order"),
  items: z.string().transform((s, ctx) => {
    try {
      const parsed = JSON.parse(s);
      const result = lineItemsArraySchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: "Invalid line items" });
        return z.NEVER;
      }
      return result.data;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid line items JSON" });
      return z.NEVER;
    }
  }),
});

export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
export type LineItemInput = z.infer<typeof lineItemShape>;

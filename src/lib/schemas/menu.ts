/**
 * Zod schemas for the menu domain (Category, MenuItem, …).
 * Shared between client forms and server actions.
 *
 * Money fields are validated as DECIMAL STRINGS (e.g. "15000" or "15000.50"),
 * NOT numbers, to avoid IEEE-754 drift. The server action wraps them in
 * Prisma.Decimal for storage and arithmetic.
 */

import { z } from "zod";

// ---------- Category ----------

/** Hex color in #RRGGBB form, e.g. "#FF8800". Empty/missing → null. */
const hexColor = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === undefined || s === "" ? null : s))
  .refine(
    (s) => s === null || /^#[0-9A-Fa-f]{6}$/.test(s),
    "Color must be a 6-digit hex like #FF8800",
  );

const iconName = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((s) => (s === undefined || s === "" ? null : s));

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  sortOrder: z.coerce.number().int().min(0).default(0),
  color: hexColor,
  icon: iconName,
  isActive: z.coerce.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ---------- MenuItem ----------

/** Non-negative decimal as a string, up to 2 decimal places. Empty/undefined → "0". */
const moneyString = (
  fieldName: string,
  { allowZero = true, optional = false }: { allowZero?: boolean; optional?: boolean } = {},
) => {
  const regex = z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, `${fieldName} must be a number like 15000 or 15000.50`)
    .refine(
      (s) => (allowZero ? true : Number(s) > 0),
      `${fieldName} must be greater than 0`,
    );
  const base = z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === undefined || s === "" ? "0" : s))
    .pipe(regex);
  return optional ? base.optional().transform((s) => s ?? "0") : base;
};

const optionalString = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((s) => (s === undefined || s === "" ? null : s));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((s) => (s === undefined || s === "" ? null : s))
  .refine(
    (s) => s === null || /^https?:\/\//i.test(s),
    "Image URL must start with http:// or https://",
  );

export const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  categoryId: z.string().min(1, "Category is required"),
  sku: optionalString.refine(
    (s) => s === null || s.length >= 1,
    "SKU cannot be empty",
  ),
  barcode: optionalString,
  price: moneyString("Price"),
  cost: moneyString("Cost", { allowZero: true }),
  imageUrl: optionalUrl,
  isAvailable: z.coerce.boolean().default(true),
  trackStock: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

// ---------- MenuVariant ----------

/** Signed decimal string. e.g. "0", "5000", "-3000", "1500.50". */
const signedMoneyString = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === undefined || s === "" ? "0" : s))
  .pipe(
    z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "Must be a number like 0, 5000, or -3000"),
  );

export const menuVariantSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  priceDelta: signedMoneyString,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type MenuVariantInput = z.infer<typeof menuVariantSchema>;

// ---------- Modifier ----------

export const modifierSchema = z.object({
  groupName: z.string().trim().min(1, "Group is required").max(40),
  name: z.string().trim().min(1, "Name is required").max(60),
  priceDelta: signedMoneyString,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type ModifierInput = z.infer<typeof modifierSchema>;

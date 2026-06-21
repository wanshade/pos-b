/**
 * Server actions for /shifts — open, close.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit/log";
import { openShiftSchema, closeShiftSchema } from "@/lib/schemas/inventory";

export type OpenShiftState =
  | { status: "idle" }
  | { status: "success"; message: string; id?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export type CloseShiftState =
  | { status: "idle" }
  | { status: "success"; message: string; variance?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

function fieldErrorsFromZod(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export async function openShiftAction(
  _prev: OpenShiftState,
  formData: FormData,
): Promise<OpenShiftState> {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { status: "error", message: "User not found" };

  const parsed = openShiftSchema.safeParse({
    outletId: formData.get("outletId"),
    openingCash: formData.get("openingCash") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // One open shift per user
  const existing = await db.shift.findFirst({ where: { userId, status: "OPEN" } });
  if (existing) {
    return { status: "error", message: "You already have an open shift", fieldErrors: {} };
  }

  const outlet = await db.outlet.findUnique({ where: { id: parsed.data.outletId } });
  if (!outlet) {
    return { status: "error", message: "Outlet not found", fieldErrors: { outletId: "Pick a valid outlet" } };
  }

  const shift = await db.shift.create({
    data: {
      userId,
      outletId: parsed.data.outletId,
      openingCash: new Prisma.Decimal(parsed.data.openingCash),
      status: "OPEN",
      notes: parsed.data.notes,
    },
  });
  revalidatePath("/shifts");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  return { status: "success", message: "Shift opened", id: shift.id };
}

export async function closeShiftAction(
  shiftId: string,
  _prev: CloseShiftState,
  formData: FormData,
): Promise<CloseShiftState> {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { status: "error", message: "User not found" };

  const parsed = closeShiftSchema.safeParse({
    closingCash: formData.get("closingCash") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const shift = await db.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return { status: "error", message: "Shift not found" };
  if (shift.status !== "OPEN") return { status: "error", message: "Shift is not open" };
  if (shift.userId !== userId) return { status: "error", message: "You can only close your own shift" };

  // expectedCash = openingCash + sum of CASH payments collected on PAID orders
  // in this shift. (Voided/refunded orders are excluded: a void means the sale
  // never settled, a refund should hand cash back to the customer — neither
  // belongs in the expected drawer count.)
  const cashRows = await db.payment.aggregate({
    _sum: { amount: true },
    where: {
      method: "CASH",
      order: { shiftId, status: "PAID" },
    },
  });
  const openingCash = shift.openingCash;
  const cashSales = cashRows._sum.amount ?? new Prisma.Decimal(0);
  const expectedCash = openingCash.plus(cashSales);
  const closingCash = new Prisma.Decimal(parsed.data.closingCash);
  const variance = closingCash.minus(expectedCash);

  await db.shift.update({
    where: { id: shiftId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingCash,
      expectedCash,
      variance,
      notes: parsed.data.notes ?? shift.notes,
    },
  });
  revalidatePath("/shifts");
  revalidatePath(`/shifts/${shiftId}`);
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: "Shift closed",
    variance: variance.toString(),
  };
}

/** Helper: get the current user's open shift (if any). */
export async function getCurrentOpenShift() {
  const session = await getSession();
  if (!session) return null;
  const userId = (session.user as { id?: string }).id;
  if (!userId) return null;
  return db.shift.findFirst({ where: { userId, status: "OPEN" } });
}

/** Server-side redirect helper for /shifts. */
export async function goToShift() {
  const open = await getCurrentOpenShift();
  if (open) redirect(`/shifts/${open.id}`);
  redirect("/shifts/open");
}

export async function deleteShift(shiftId: string) {
  await requireRole(["ADMIN"]);

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    include: { user: { select: { name: true } } },
  });
  if (!shift) throw new Error("Shift not found");

  const orderCount = await db.order.count({
    where: { shiftId, status: { in: ["PAID", "HELD", "DRAFT"] } },
  });
  if (orderCount > 0) {
    throw new Error(
      `Cannot delete shift — it has ${orderCount} order(s) attached. Delete or reassign those orders first.`,
    );
  }

  await db.shift.delete({ where: { id: shiftId } });

  const session = await getSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  await recordAudit({
    action: "shift.delete",
    entity: "Shift",
    entityId: shiftId,
    data: {
      user: shift.user.name,
      openedAt: shift.openedAt.toISOString(),
      status: shift.status,
    },
    userId,
  });

  revalidatePath("/shifts");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  redirect("/shifts/all");
}

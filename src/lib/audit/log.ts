/**
 * Audit log helper.
 * Use this from server actions to record every privileged action.
 * Failures here are logged but never throw — auditing must not block
 * the main operation.
 */

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";

export type AuditInput = {
  action: string; // e.g. "user.create", "order.void", "settings.update"
  entity: string; // e.g. "User", "Order", "Outlet"
  entityId?: string;
  data?: Record<string, unknown> | unknown[];
  /** Override the actor. Defaults to current session user (or null). */
  userId?: string | null;
};

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    let userId: string | null = input.userId ?? null;
    if (userId === null) {
      try {
        const session = await getSession();
        userId = (session?.user as { id?: string } | undefined)?.id ?? null;
      } catch {
        userId = null;
      }
    }

    let ip: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    } catch {
      // not in a request context (e.g. seed script)
    }

    await db.auditLog.create({
      data: {
        userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        data: input.data ? JSON.stringify(input.data) : null,
        ip,
      },
    });
  } catch (e) {
    // never fail the calling action
    console.error("audit log failed:", e);
  }
}

/** Query helper with filters. */
export type AuditFilter = {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  take?: number;
};

export async function listAudit(filter: AuditFilter) {
  const where: import("@prisma/client").Prisma.AuditLogWhereInput = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.action) where.action = filter.action;
  if (filter.entity) where.entity = filter.entity;
  if (filter.entityId) where.entityId = filter.entityId;
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }
  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filter.take ?? 200,
    include: { user: { select: { name: true, email: true } } },
  });
}

/**
 * Server actions for /admin/users (admin only).
 * - createUser: create with role + bcrypt-hashed password
 * - updateUser: change name, role, isActive, or reset password
 * - deactivateUser: toggle isActive
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireRole, getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit/log";

export type UserFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Invalid email").max(120),
  role: z.enum(["ADMIN", "MANAGER", "KASIR", "KITCHEN"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["ADMIN", "MANAGER", "KASIR", "KITCHEN"]),
  isActive: z.coerce.boolean().default(true),
  password: z.string().max(100).optional(), // empty = don't change
});

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireRole(["ADMIN"]);
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { status: "error", message: `Email "${parsed.data.email}" already in use`, fieldErrors: { email: "Already in use" } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as Role,
      isActive: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: parsed.data.email,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });

  await recordAudit({
    action: "user.create",
    entity: "User",
    entityId: user.id,
    data: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/users");
  return { status: "success", message: `Created ${user.name}` };
}

export async function updateUser(id: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireRole(["ADMIN"]);
  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const before = await db.user.findUnique({ where: { id } });
  if (!before) return { status: "error", message: "User not found" };

  const data: Prisma.UserUpdateInput = {
    name: parsed.data.name,
    role: parsed.data.role as Role,
    isActive: parsed.data.isActive,
  };
  if (parsed.data.password && parsed.data.password.length >= 8) {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    // Look up the user's existing credential account by userId + providerId.
    // We can't upsert on a stable key: createUser assigns Account.id = randomUUID(),
    // so the old `where: { id: 'cred-${id}' }` never matched and silently created a
    // *second* credential account, leaving the real password unchanged.
    const credAccount = await db.account.findFirst({
      where: { userId: id, providerId: "credential" },
    });
    if (credAccount) {
      await db.account.update({
        where: { id: credAccount.id },
        data: { password: passwordHash },
      });
    } else {
      await db.account.create({
        data: {
          id: randomUUID(),
          accountId: before.email,
          providerId: "credential",
          password: passwordHash,
          userId: id,
        },
      });
    }
  }

  const updated = await db.user.update({ where: { id }, data });
  await recordAudit({
    action: "user.update",
    entity: "User",
    entityId: id,
    data: { before: { name: before.name, role: before.role, isActive: before.isActive }, after: { name: updated.name, role: updated.role, isActive: updated.isActive }, passwordChanged: Boolean(parsed.data.password) },
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}/edit`);
  return { status: "success", message: `Updated ${updated.name}` };
}

export async function deactivateUser(id: string, isActive: boolean) {
  await requireRole(["ADMIN"]);
  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw new Error("User not found");
  await db.user.update({ where: { id }, data: { isActive } });
  await recordAudit({
    action: isActive ? "user.reactivate" : "user.deactivate",
    entity: "User",
    entityId: id,
    data: { name: before.name },
  });
  revalidatePath("/admin/users");
}

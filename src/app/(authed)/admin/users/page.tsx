import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewUserForm } from "./new-user-form";

export const metadata = { title: "Users — POS App" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireRole(["ADMIN"]);
  const users = await db.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} user{users.length === 1 ? "" : "s"} · admin can create, deactivate, change roles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
          <CardDescription>Name, email, role, and a one-time password.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <ul className="divide-y">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{u.email}</span>
                      {!u.isActive && (
                        <Badge variant="secondary" className="text-[10px]">inactive</Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">{u.role}</Badge>
                  <Link
                    href={`/admin/users/${u.id}/edit`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${u.name}`}
                  >
                    <PencilIcon className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

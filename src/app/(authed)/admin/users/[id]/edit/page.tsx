import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { EditUserForm, DeactivateUserButton } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit: {user.name}</h1>
        <p className="text-sm text-muted-foreground">
          {user.email} · last updated {user.updatedAt.toLocaleString()}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EditUserForm
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                {user.isActive ? "User is active" : "User is deactivated"}
              </div>
              <p className="text-xs text-muted-foreground">
                Deactivating prevents sign-in but preserves history.
              </p>
            </div>
            <DeactivateUserButton userId={user.id} isActive={user.isActive} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

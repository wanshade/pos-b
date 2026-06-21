import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenShiftForm } from "./open-form";

export const metadata = { title: "Open shift — POS App" };
export const dynamic = "force-dynamic";

export default async function OpenShiftPage() {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  const [existing, outlets] = await Promise.all([
    userId ? db.shift.findFirst({ where: { userId, status: "OPEN" } }) : Promise.resolve(null),
    db.outlet.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (existing) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Open shift</h1>
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            You already have an open shift (opened {existing.openedAt.toLocaleString()}).{" "}
            <a className="text-primary underline" href={`/shifts/${existing.id}`}>
              Go to it →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Open shift</h1>
        <p className="text-sm text-muted-foreground">
          Count the cash in the drawer and enter the amount below.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Starting cash</CardTitle>
          <CardDescription>This is the float the cashier starts with.</CardDescription>
        </CardHeader>
        <CardContent>
          {outlets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outlets configured.</p>
          ) : (
            <OpenShiftForm outlets={outlets.map((o) => ({ id: o.id, name: o.name }))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

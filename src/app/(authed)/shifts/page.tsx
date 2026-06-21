import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My shifts — POS App" };
export const dynamic = "force-dynamic";

export default async function MyShiftsPage() {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  if (!userId) return null;

  const shifts = await db.shift.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
    take: 100,
    include: { outlet: { select: { name: true } } },
  });
  const openShift = shifts.find((s) => s.status === "OPEN");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My shifts</h1>
          <p className="text-sm text-muted-foreground">
            {shifts.length} total
            {openShift && <> · 1 currently open</>}
          </p>
        </div>
        {openShift ? (
          <Button nativeButton={false} render={<Link href={`/shifts/${openShift.id}`} />}>
            View current shift
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link href="/shifts/open" />}>
            <PlusIcon className="size-4" /> Open shift
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t opened any shifts yet.
            </p>
          ) : (
            <ul className="divide-y">
              {shifts.map((s) => (
                <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/shifts/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                      {s.outlet.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {s.openedAt.toLocaleString()}
                      {s.closedAt && ` → ${s.closedAt.toLocaleString()}`}
                    </div>
                  </div>
                  <span className={
                    "rounded px-1.5 py-0.5 text-[10px] font-medium " +
                    (s.status === "OPEN" ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-800")
                  }>
                    {s.status}
                  </span>
                  {s.variance && (
                    <div className={"text-right font-mono text-sm " + (
                      Number(s.variance) === 0
                        ? "text-muted-foreground"
                        : Number(s.variance) > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                    )}>
                      {Number(s.variance) > 0 ? "+" : ""}Rp {Number(s.variance).toLocaleString("id-ID")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

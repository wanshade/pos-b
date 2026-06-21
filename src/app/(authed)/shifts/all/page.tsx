import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AllShiftsFilters } from "./filters";
import { DeleteShiftButton } from "./delete-shift-button";

export const metadata = { title: "All shifts — POS App" };
export const dynamic = "force-dynamic";

type SearchParams = {
  userId?: string;
  from?: string;
  to?: string;
  status?: string;
};

export default async function AllShiftsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuth();
  const role = (session.user as { role?: "ADMIN" | "MANAGER" | "KASIR" }).role ?? "KASIR";
  const isAdmin = role === "ADMIN";
  if (role !== "ADMIN" && role !== "MANAGER") {
    return null;
  }
  const sp = await searchParams;

  const where: import("@prisma/client").Prisma.ShiftWhereInput = {};
  if (sp.userId) where.userId = sp.userId;
  if (sp.status === "OPEN" || sp.status === "CLOSED") where.status = sp.status;
  if (sp.from || sp.to) {
    where.openedAt = {};
    if (sp.from) {
      const d = new Date(sp.from);
      if (!isNaN(d.getTime())) where.openedAt.gte = d;
    }
    if (sp.to) {
      const d = new Date(sp.to);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        where.openedAt.lte = d;
      }
    }
  }

  const [shifts, users] = await Promise.all([
    db.shift.findMany({
      where,
      orderBy: { openedAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true } },
        outlet: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All shifts</h1>
        <p className="text-sm text-muted-foreground">
          Manager+ view. Showing the most recent {shifts.length} (max 200).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <AllShiftsFilters
            users={users.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
            current={{
              userId: sp.userId ?? "",
              from: sp.from ?? "",
              to: sp.to ?? "",
              status: sp.status ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shifts match these filters.</p>
          ) : (
            <ul className="divide-y">
              {shifts.map((s) => (
                <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[2fr_1fr_auto_auto_auto] sm:items-center">
                  <div>
                    <Link href={`/shifts/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                      {s.user.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{s.outlet.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.openedAt.toLocaleString()}
                    {s.closedAt && ` → ${s.closedAt.toLocaleString()}`}
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
                  {isAdmin && (
                    <DeleteShiftButton
                      shiftId={s.id}
                      userName={s.user.name}
                      openedAt={s.openedAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    />
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

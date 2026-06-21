import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { listAudit } from "@/lib/audit/log";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/report-filters";

export const metadata = { title: "Audit log — POS App" };
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;

  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;
  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);

  const [logs, users] = await Promise.all([
    listAudit({ from, to, take: 200 }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every privileged action — order voids, user changes, settings, stock adjustments.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilters current={{ from: sp.from ?? "", to: sp.to ?? "" }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent events ({logs.length})</CardTitle>
          <CardDescription>Newest first; JSON payload omitted for brevity.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events in this range.</p>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => (
                <li key={l.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">{l.action}</Badge>
                      <span className="text-sm text-muted-foreground">{l.entity}{l.entityId ? ` #${l.entityId.slice(-6)}` : ""}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {l.user?.name ?? "system"}{l.ip ? ` from ${l.ip}` : ""}
                    </div>
                  </div>
                  <span className="text-right text-xs text-muted-foreground sm:min-w-[20ch]">
                    {l.createdAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

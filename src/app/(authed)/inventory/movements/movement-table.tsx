"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";

type Row = {
  id: string;
  itemName: string;
  categoryName: string;
  categoryColor: string | null;
  type: string;
  qty: string;
  unit: string;
  reason: string | null;
  refType: string | null;
  refId: string | null;
  createdByName: string;
  createdAt: string;
};

const TYPES = [
  { value: "__all__", label: "All types" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SALE", label: "Sale" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "OPNAME", label: "Opname" },
];

const TYPE_BADGE: Record<string, string> = {
  PURCHASE: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SALE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  ADJUSTMENT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  TRANSFER_IN: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  TRANSFER_OUT: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  OPNAME: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

export function MovementTable({
  rows,
  items,
  current,
}: {
  rows: Row[];
  items: { id: string; name: string }[];
  current: { from: string; to: string; menuItemId: string; type: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [menuItemId, setMenuItemId] = useState(current.menuItemId || "__all__");
  const [type, setType] = useState(current.type || "__all__");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!needle) return true;
      return (
        r.itemName.toLowerCase().includes(needle) ||
        r.type.toLowerCase().includes(needle) ||
        (r.reason ?? "").toLowerCase().includes(needle) ||
        r.createdByName.toLowerCase().includes(needle)
      );
    });
  }, [rows, q]);

  const apply = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (menuItemId !== "__all__") params.set("menuItemId", menuItemId);
    if (type !== "__all__") params.set("type", type);
    start(() => {
      router.push(`/inventory/movements${params.toString() ? "?" + params.toString() : ""}`);
    });
  };

  const clear = () => {
    setFrom(""); setTo(""); setMenuItemId("__all__"); setType("__all__"); setQ("");
    start(() => router.push("/inventory/movements"));
  };

  const hasServerFilters = from || to || menuItemId !== "__all__" || type !== "__all__";

  return (
    <div className="space-y-4">
      {/* Server filters */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 px-4 py-3 border-b">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From date</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To date</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</label>
            <Select
              value={menuItemId}
              onValueChange={(v) => setMenuItemId(v as string)}
              items={items.map((i) => ({ value: i.id, label: i.name }))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All items</SelectItem>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as string)}
              items={TYPES.map((t) => ({ value: t.value, label: t.label }))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={apply} disabled={pending} className="gap-1.5">
              <HugeiconsIcon icon={FilterIcon} className="size-3.5" />
              Apply
            </Button>
            {hasServerFilters && (
              <Button size="sm" variant="ghost" onClick={clear} disabled={pending}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Client search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search item, reason, type, or user…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm shadow-xs outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> movements
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {rows.length === 0 ? "No movements" : "No movements match"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length === 0 ? "Stock changes will appear here." : "Try adjusting your filters or search."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="hidden sm:flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex-1 min-w-0">Item</span>
            <span className="w-28 shrink-0">Type</span>
            <span className="w-24 shrink-0 text-right">Qty</span>
            <span className="flex-1 min-w-0">Reason / Ref</span>
            <span className="w-28 shrink-0 text-right">User</span>
            <span className="w-32 shrink-0 text-right">Date / Time</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {filtered.map((r) => {
              const positive = Number(r.qty) >= 0;
              const d = new Date(r.createdAt);
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-nowrap"
                >
                  {/* Item */}
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    {r.categoryColor && (
                      <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: r.categoryColor }} />
                    )}
                    <span className="truncate text-sm font-medium">{r.itemName}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground truncate">{r.categoryName}</span>
                  </span>

                  {/* Type */}
                  <span className="w-full sm:w-28 shrink-0">
                    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", TYPE_BADGE[r.type] ?? "bg-muted text-muted-foreground")}>
                      {r.type.replace("_", " ")}
                    </span>
                  </span>

                  {/* Qty */}
                  <span className="w-24 shrink-0 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                      positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                    )}>
                      <HugeiconsIcon icon={positive ? ArrowUp01Icon : ArrowDown01Icon} className="size-3.5" />
                      {positive ? "+" : ""}{r.qty} {r.unit}
                    </span>
                  </span>

                  {/* Reason */}
                  <span className="order-last sm:order-none w-full sm:flex-1 min-w-0 text-xs text-muted-foreground truncate">
                    {r.reason ?? "—"}
                    {r.refType && (
                      <span className="ml-2 font-mono">
                        {r.refType}{r.refId ? `#${r.refId.slice(-6)}` : ""}
                      </span>
                    )}
                  </span>

                  {/* User */}
                  <span className="w-28 shrink-0 text-right text-xs text-muted-foreground truncate">
                    {r.createdByName}
                  </span>

                  {/* Date/Time */}
                  <span className="w-full sm:w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    {" "}
                    {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

type Row = {
  id: string;
  name: string;
  categoryName: string;
  categoryColor: string | null;
  currentQty: string;
  minQty: string;
  maxQty: string;
  unit: string;
  status: "ok" | "low" | "empty";
};

type TabKey = "all" | "low" | "empty" | "ok";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ok", label: "In Stock" },
  { key: "low", label: "Low" },
  { key: "empty", label: "Empty" },
];

const STATUS_STYLE = {
  ok: { label: "OK", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  low: { label: "Low", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  empty: { label: "Empty", cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

export function StockTable({
  rows,
  canAdjust,
}: {
  rows: Row[];
  canAdjust: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: rows.length, ok: 0, low: 0, empty: 0 };
    for (const r of rows) counts[r.status]++;
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.categoryName.toLowerCase().includes(needle)
      );
    });
  }, [rows, tab, q]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                tab === t.key ? "bg-primary-foreground/15" : "bg-muted",
              )}
            >
              {tabCounts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + summary */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search item name or category…"
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
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> items
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={AlertCircleIcon} className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {rows.length === 0 ? "No tracked items" : "No items match"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length === 0 ? "Enable stock tracking on menu items." : "Try a different filter or search."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="hidden sm:flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex-1 min-w-0">Item</span>
            <span className="w-24 shrink-0 text-right">Current</span>
            <span className="w-20 shrink-0 text-right">Min / Max</span>
            <span className="w-16 shrink-0 text-center">Status</span>
            <span className="w-20 shrink-0 text-right">Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {filtered.map((r) => {
              const st = STATUS_STYLE[r.status];
              return (
                <div
                  key={r.id}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-nowrap"
                >
                  {/* Item */}
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    {r.categoryColor && (
                      <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: r.categoryColor }} />
                    )}
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground truncate">{r.categoryName}</span>
                  </span>

                  {/* Current qty */}
                  <span className="w-24 shrink-0 text-right">
                    <span className={cn("text-sm font-semibold tabular-nums", r.status === "empty" && "text-muted-foreground")}>
                      {r.currentQty}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">{r.unit}</span>
                  </span>

                  {/* Min/Max */}
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {r.minQty} / {r.maxQty}
                  </span>

                  {/* Status */}
                  <span className="w-16 shrink-0 flex justify-center">
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", st.cls)}>
                      <span className={cn("size-1.5 rounded-full", st.dot)} />
                      {st.label}
                    </span>
                  </span>

                  {/* Actions */}
                  <span className="w-20 shrink-0 flex justify-end">
                    {canAdjust && (
                      <Link
                        href={`/inventory/adjust?menuItemId=${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Adjust ${r.name}`}
                      >
                        Adjust
                        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                      </Link>
                    )}
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

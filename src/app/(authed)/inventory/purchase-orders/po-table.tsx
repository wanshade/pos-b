"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/money";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  DeliveryTruck01Icon,
} from "@hugeicons/core-free-icons";

type Row = {
  id: string;
  poNumber: string;
  status: string;
  supplierName: string;
  total: string;
  lineCount: number;
  createdAt: string;
};

type TabKey = "all" | "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "ORDERED", label: "Ordered" },
  { key: "PARTIAL", label: "Partial" },
  { key: "RECEIVED", label: "Received" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  ORDERED: { label: "Ordered", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  PARTIAL: { label: "Partial", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  RECEIVED: { label: "Received", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

export function PurchaseOrdersTable({ rows }: { rows: Row[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: rows.length, DRAFT: 0, ORDERED: 0, PARTIAL: 0, RECEIVED: 0, CANCELLED: 0 };
    for (const r of rows) {
      if (r.status in counts) counts[r.status as TabKey]++;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!needle) return true;
      return (
        r.poNumber.toLowerCase().includes(needle) ||
        r.supplierName.toLowerCase().includes(needle) ||
        r.status.toLowerCase().includes(needle)
      );
    });
  }, [rows, tab, q]);

  const tabTotal = useMemo(() => {
    return filtered.reduce((s, r) => s + Number(r.total), 0);
  }, [filtered]);

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
            placeholder="Search PO #, supplier, or status…"
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> orders
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            <span className="font-semibold text-foreground tabular-nums">{formatIDR(tabTotal)}</span> total
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={DeliveryTruck01Icon} className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {rows.length === 0 ? "No purchase orders" : "No orders match"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length === 0 ? "Create a PO to restock items." : "Try a different filter or search."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="hidden sm:flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="w-32 shrink-0">PO #</span>
            <span className="flex-1 min-w-0">Supplier</span>
            <span className="w-28 shrink-0 text-right">Total</span>
            <span className="w-14 shrink-0 text-right">Lines</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-32 shrink-0 text-right">Date</span>
            <span className="w-20 shrink-0 text-right">Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {filtered.map((r) => {
              const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
              const d = new Date(r.createdAt);
              return (
                <Link
                  key={r.id}
                  href={`/inventory/purchase-orders/${r.id}`}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-nowrap"
                >
                  {/* PO # */}
                  <span className="w-full sm:w-32 shrink-0 font-mono text-sm font-medium text-primary group-hover:underline">
                    {r.poNumber}
                  </span>

                  {/* Supplier */}
                  <span className="order-last sm:order-none w-full sm:flex-1 min-w-0 text-sm text-muted-foreground truncate">
                    {r.supplierName}
                  </span>

                  {/* Total */}
                  <span className="w-24 sm:w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatIDR(r.total)}
                  </span>

                  {/* Lines */}
                  <span className="w-14 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                    {r.lineCount}
                  </span>

                  {/* Status */}
                  <span className="w-full sm:w-24 shrink-0 flex sm:justify-center">
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", st.cls)}>
                      <span className={cn("size-1.5 rounded-full", st.dot)} />
                      {st.label}
                    </span>
                  </span>

                  {/* Date */}
                  <span className="w-full sm:w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>

                  {/* Arrow */}
                  <span className="w-20 shrink-0 flex justify-end">
                    <span className="hidden sm:flex items-center text-muted-foreground/40 transition-colors group-hover:text-foreground">
                      <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

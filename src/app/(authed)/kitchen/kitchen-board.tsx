"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { KitchenStatus, OrderType } from "@prisma/client";
import {
  CheckIcon,
  ChevronRightIcon,
  Loader2Icon,
  Undo2Icon,
  ClockIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceKitchenOrder, revertKitchenOrder, type KitchenActionState } from "./actions";

export type KitchenItem = {
  id: string;
  name: string;
  variant: string | null;
  qty: number;
  notes: string | null;
  modifiers: string[];
};

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  type: OrderType;
  kitchenStatus: KitchenStatus;
  customerName: string | null;
  notes: string | null;
  cashierName: string | null;
  paidAt: string | null;
  queuedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  items: KitchenItem[];
};

const COLUMNS: { status: KitchenStatus; title: string; accent: string }[] = [
  { status: "QUEUED", title: "Queued", accent: "border-t-amber-500" },
  { status: "PREPARING", title: "Preparing", accent: "border-t-blue-500" },
  { status: "READY", title: "Ready", accent: "border-t-emerald-500" },
];

const TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: "Dine-in",
  TAKEOUT: "Takeout",
  DELIVERY: "Delivery",
};

const ADVANCE_LABEL: Record<string, string> = {
  QUEUED: "Start preparing",
  PREPARING: "Mark ready",
  READY: "Mark served",
};

function elapsed(since: string | null): string {
  if (!since) return "";
  const ms = Date.now() - new Date(since).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

/** Pick the timestamp relevant to the current column. */
function stageSince(o: KitchenOrder): string | null {
  if (o.kitchenStatus === "QUEUED") return o.queuedAt ?? o.paidAt;
  if (o.kitchenStatus === "PREPARING") return o.preparingAt;
  if (o.kitchenStatus === "READY") return o.readyAt;
  return null;
}

export function KitchenBoard({ initialOrders }: { initialOrders: KitchenOrder[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tick every 30s so "elapsed" labels stay fresh between server refreshes.
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = setInterval(() => router.refresh(), 15000);
    const tick = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [router]);

  const run = (
    fn: (id: string) => Promise<KitchenActionState>,
    id: string,
  ) => {
    setBusyId(id);
    setError(null);
    start(async () => {
      const res = await fn(id);
      if (res.status === "error") setError(res.message);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const cards = initialOrders.filter((o) => o.kitchenStatus === col.status);
          return (
            <div key={col.status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.title}
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {cards.length}
                </span>
              </div>

              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No orders
                </div>
              ) : (
                <div className="space-y-3">
                  {cards.map((o) => (
                    <article
                      key={o.id}
                      className={`rounded-xl border border-t-4 bg-card p-3 shadow-sm ${col.accent}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-semibold">{o.orderNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {TYPE_LABEL[o.type]}
                            {o.customerName ? ` · ${o.customerName}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                          <ClockIcon className="size-3" />
                          {elapsed(stageSince(o))}
                        </div>
                      </div>

                      <ul className="mt-2 space-y-1.5 border-t pt-2">
                        {o.items.map((it) => (
                          <li key={it.id} className="text-sm">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold tabular-nums">{it.qty}×</span>
                              <span className="font-medium">
                                {it.name}
                                {it.variant ? ` (${it.variant})` : ""}
                              </span>
                            </div>
                            {it.modifiers.length > 0 && (
                              <div className="pl-6 text-xs text-muted-foreground">
                                {it.modifiers.map((m) => `+ ${m}`).join(", ")}
                              </div>
                            )}
                            {it.notes && (
                              <div className="pl-6 text-xs font-medium text-amber-600 dark:text-amber-400">
                                ⚠ {it.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>

                      {o.notes && (
                        <p className="mt-2 rounded bg-muted px-2 py-1 text-xs">
                          <span className="font-medium">Order note: </span>
                          {o.notes}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={pending && busyId === o.id}
                          onClick={() => run(advanceKitchenOrder, o.id)}
                        >
                          {pending && busyId === o.id ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : o.kitchenStatus === "READY" ? (
                            <CheckIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
                          {ADVANCE_LABEL[o.kitchenStatus] ?? "Advance"}
                        </Button>
                        {o.kitchenStatus !== "QUEUED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending && busyId === o.id}
                            onClick={() => run(revertKitchenOrder, o.id)}
                            aria-label="Send back one step"
                          >
                            <Undo2Icon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {initialOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <UtensilsCrossedIcon className="size-10 opacity-30" />
          <p className="text-sm">No active orders. New paid orders will appear here.</p>
        </div>
      )}
    </>
  );
}

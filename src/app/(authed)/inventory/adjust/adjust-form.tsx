"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustStockAction, type AdjustFormState } from "./actions";

const IDLE: AdjustFormState = { status: "idle" };

export type StockOption = {
  id: string;
  name: string;
  currentQty: string;
  unit: string;
};

const TYPE_OPTIONS: { value: string; label: string; sign: "+" | "−" | "±" }[] = [
  { value: "PURCHASE",      label: "Purchase (stock in)",  sign: "+" },
  { value: "ADJUSTMENT",    label: "Adjustment (correction)", sign: "±" },
  { value: "OPNAME",        label: "Opname (count)",        sign: "±" },
  { value: "TRANSFER_IN",   label: "Transfer in",           sign: "+" },
  { value: "TRANSFER_OUT",  label: "Transfer out",          sign: "−" },
];

export function AdjustForm({
  stocks,
  preselectedStockId,
}: {
  stocks: StockOption[];
  preselectedStockId?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(adjustStockAction, IDLE);

  useEffect(() => {
    if (state.status === "success") {
      // brief delay so user sees the success message
      const t = setTimeout(() => router.push("/inventory"), 800);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="stockItemId">Menu item</Label>
        <select
          id="stockItemId"
          name="stockItemId"
          defaultValue={preselectedStockId ?? ""}
          required
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Pick an item
          </option>
          {stocks.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (current: {s.currentQty} {s.unit})
            </option>
          ))}
        </select>
        {state.status === "error" && state.fieldErrors?.stockItemId && (
          <p className="text-xs text-destructive">{state.fieldErrors.stockItemId}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          defaultValue="PURCHASE"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.sign} {t.label}
            </option>
          ))}
        </select>
        {state.status === "error" && state.fieldErrors?.type && (
          <p className="text-xs text-destructive">{state.fieldErrors.type}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qty">Quantity (signed)</Label>
        <Input
          id="qty"
          name="qty"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 50 or -3"
          required
        />
        <p className="text-xs text-muted-foreground">
          Positive = stock in. Negative = stock out. Cannot bring stock below 0.
        </p>
        {state.status === "error" && state.fieldErrors?.qty && (
          <p className="text-xs text-destructive">{state.fieldErrors.qty}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input id="reason" name="reason" placeholder="e.g. damaged, restock from PO #42" maxLength={280} />
        {state.status === "error" && state.fieldErrors?.reason && (
          <p className="text-xs text-destructive">{state.fieldErrors.reason}</p>
        )}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Record movement
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/inventory")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

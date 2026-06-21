"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeShiftAction, type CloseShiftState } from "../actions";
import { formatIDR } from "@/lib/money";

export function CloseShiftForm({
  shiftId,
  openingCash,
  cashSales,
  nonCashSales,
  expectedCash,
}: {
  shiftId: string;
  openingCash: string;
  cashSales: string;
  nonCashSales: string;
  expectedCash: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [closing, setClosing] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expected = Number(expectedCash);
  const counted = Number(closing);
  const liveVariance = closing === "" ? null : counted - expected;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    start(async () => {
      const result = await closeShiftAction(shiftId, { status: "idle" }, formData);
      if (result.status === "success") {
        toast.success("Shift closed successfully");
        router.push("/shifts");
        router.refresh();
      } else if (result.status === "error") {
        setError(result.message);
        toast.error(result.message);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Cash breakdown */}
      <div className="rounded-xl bg-secondary/50 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Opening cash</span>
          <span className="font-mono">{formatIDR(openingCash)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">+ Cash sales</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatIDR(cashSales)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">Non-cash sales (card, QRIS, etc.)</span>
          <span className="font-mono text-blue-600 dark:text-blue-400">{formatIDR(nonCashSales)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="font-medium">Expected cash in drawer</span>
          <span className="font-mono font-bold">{formatIDR(expectedCash)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="closingCash">Counted cash in drawer (IDR)</Label>
        <Input
          id="closingCash"
          name="closingCash"
          type="text"
          inputMode="decimal"
          required
          value={closing}
          onChange={(e) => {
            let val = e.target.value.replace(/[^0-9.]/g, "");
            const dot = val.indexOf(".");
            if (dot !== -1) {
              val = val.slice(0, dot + 1) + val.slice(dot + 1).replace(/\./g, "");
            }
            val = val.replace(/^0+(?=\d)/, "");
            if (val === "" || val === ".") val = "0";
            setClosing(val);
          }}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">
          Only count physical cash. Non-cash payments are not in the drawer.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" maxLength={500} />
      </div>

      {liveVariance !== null && (
        <p className={"text-sm font-medium " + (
          liveVariance === 0
            ? "text-muted-foreground"
            : liveVariance > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
        )}>
          Variance: {liveVariance > 0 ? "+" : ""}{formatIDR(liveVariance)}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={pending || closing === ""}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
        Close shift
      </Button>
    </form>
  );
}

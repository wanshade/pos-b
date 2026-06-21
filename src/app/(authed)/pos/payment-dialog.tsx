"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckIcon,
  Add01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { formatIDR, dec, d0 } from "@/lib/money";
import { useCart } from "@/lib/pos/cart-store";
import { payOrder } from "./pay-actions";

type PaymentRow = {
  method: "CASH" | "CARD" | "EWALLET" | "QRIS" | "TRANSFER";
  amount: string;
  reference: string;
};

const METHOD_OPTIONS: PaymentRow["method"][] = ["CASH", "CARD", "EWALLET", "QRIS", "TRANSFER"];
const METHOD_LABELS: Record<PaymentRow["method"], string> = {
  CASH: "Cash",
  CARD: "Card",
  EWALLET: "E-Wallet",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
};

export function PaymentDialog({
  open,
  onClose,
  activeShiftId,
  subtotal,
  discount,
  total,
  taxRatePct,
}: {
  open: boolean;
  onClose: () => void;
  activeShiftId: string;
  subtotal: import("@prisma/client").Prisma.Decimal;
  discount: import("@prisma/client").Prisma.Decimal;
  total: import("@prisma/client").Prisma.Decimal;
  taxRatePct: number;
}) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const lineTotal = useCart((s) => s.lineTotal);
  const orderDiscount = useCart((s) => s.orderDiscount);
  const orderNotes = useCart((s) => s.orderNotes);
  const customerName = useCart((s) => s.customerName);
  const type = useCart((s) => s.type);
  const clear = useCart((s) => s.clear);

  const [payments, setPayments] = useState<PaymentRow[]>([
    { method: "CASH", amount: total.toString(), reference: "" },
  ]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const paid = payments.reduce((s, p) => s.plus(dec(p.amount || "0")), d0());
  const change = paid.minus(total);
  const isExact = change.eq(0);
  const isShort = change.lt(0);

  const tax = total.minus(subtotal).plus(discount);

  const setRow = (idx: number, patch: Partial<PaymentRow>) => {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const isNonCash = (method: PaymentRow["method"]) => method !== "CASH";

  const computeRemaining = (excludeIdx: number) => {
    const otherPaid = payments
      .filter((_, i) => i !== excludeIdx)
      .reduce((s, p) => s.plus(dec(p.amount || "0")), d0());
    const remaining = total.minus(otherPaid);
    return remaining.gt(0) ? remaining.toString() : "0";
  };

  const setMethod = (idx: number, method: PaymentRow["method"]) => {
    if (isNonCash(method)) {
      setRow(idx, { method, amount: computeRemaining(idx) });
    } else {
      setRow(idx, { method, amount: "0" });
    }
  };

  const addRow = () => {
    const lastIdx = payments.length - 1;
    const remaining = total.minus(paid).plus(dec(payments[lastIdx]?.amount || "0"));
    setPayments((prev) => [
      ...prev,
      {
        method: "CASH",
        amount: remaining.gt(0) ? remaining.toString() : "0",
        reference: "",
      },
    ]);
  };
  const removeRow = (idx: number) => {
    if (payments.length === 1) return;
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePay = () => {
    setError(null);
    if (payments.length === 0) {
      setError("Add at least one payment row");
      return;
    }
    if (isShort) {
      setError(`Short by ${formatIDR(change.abs())}`);
      return;
    }
    start(async () => {
      try {
        const result = await payOrder({
          shiftId: activeShiftId,
          type,
          customerName,
          discount: orderDiscount,
          discountCode: "",
          notes: orderNotes,
          subtotal: subtotal.toString(),
          discountAmount: discount.toString(),
          tax: tax.toString(),
          total: total.toString(),
          lines: lines.map((l) => ({
            menuItemId: l.menuItemId,
            nameSnapshot: l.nameSnapshot,
            variantId: l.variant?.id ?? null,
            variantNameSnapshot: l.variant?.name ?? null,
            qty: l.qty,
            unitPrice: l.unitPrice,
            discount: l.discount || "0",
            lineTotal: lineTotal(l).toString(),
            notes: l.notes || "",
            modifiers: l.modifiers.map((m) => ({
              modifierId: m.id,
              groupNameSnapshot: m.groupName,
              nameSnapshot: m.name,
              priceDelta: m.priceDelta,
            })),
          })),
          payments: payments.filter((p) => Number(p.amount) > 0).map((p) => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference,
          })),
        });
        clear();
        router.push(`/pos/orders/${result.orderId}/receipt`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !pending) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>Confirm and process payment</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatIDR(subtotal)}</span>
            </div>
            {discount.gt(0) && (
              <div className="mt-1 flex items-center justify-between text-sm text-amber-600 dark:text-amber-400">
                <span>Discount</span>
                <span className="font-medium tabular-nums">-{formatIDR(discount)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxRatePct}%)</span>
              <span className="font-medium tabular-nums">{formatIDR(tax)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-base font-semibold">Total</span>
              <span className="text-base font-bold tabular-nums">{formatIDR(total)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="space-y-2.5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Payment Methods
            </div>
            {payments.map((p, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  {idx === 0 && (
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Method</label>
                  )}
                  <Select
                    value={p.method}
                    onValueChange={(v) => setMethod(idx, v as PaymentRow["method"])}
                    items={METHOD_OPTIONS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHOD_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  {idx === 0 && (
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
                  )}
                  {isNonCash(p.method) ? (
                    <Input
                      value={p.amount}
                      readOnly
                      inputMode="decimal"
                      className="h-9 bg-muted/50 text-sm font-semibold tabular-nums"
                    />
                  ) : (
                    <Input
                      value={p.amount}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9.]/g, "");
                        const dot = val.indexOf(".");
                        if (dot !== -1) {
                          val = val.slice(0, dot + 1) + val.slice(dot + 1).replace(/\./g, "");
                        }
                        val = val.replace(/^0+(?=\d)/, "");
                        if (val === "" || val === ".") val = "0";
                        setRow(idx, { amount: val });
                      }}
                      inputMode="decimal"
                      className="h-9 text-sm tabular-nums"
                    />
                  )}
                </div>
                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    aria-label="Remove payment row"
                    className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
              Split payment
            </button>
          </div>

          {/* Paid / Change */}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-medium tabular-nums">{formatIDR(paid)}</span>
            </div>
            <div
              className={cn(
                "mt-1 flex items-center justify-between text-sm font-bold",
                isShort ? "text-destructive" : isExact ? "" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              <span>{isShort ? "Short" : isExact ? "Exact" : "Change"}</span>
              <span className="tabular-nums">{isShort ? `-${formatIDR(change.abs())}` : formatIDR(change)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending} size="sm">
            Cancel
          </Button>
          <Button
            type="button"
            variant="buy"
            className="ml-auto gap-1.5"
            onClick={handlePay}
            disabled={pending || isShort}
            size="sm"
          >
            <HugeiconsIcon icon={CheckIcon} className="size-4" />
            Confirm Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

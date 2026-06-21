"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShoppingBag01Icon,
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
  PauseIcon,
  Cancel01Icon,
  CheckIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { formatIDR, dec, d0 } from "@/lib/money";
import { useCart } from "@/lib/pos/cart-store";
import { holdOrder } from "./hold-actions";
import { PaymentDialog } from "./payment-dialog";

export function CartPanel({
  activeShiftId,
  shiftTime,
}: {
  activeShiftId: string;
  shiftTime: string;
}) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const lineTotal = useCart((s) => s.lineTotal);
  const subtotal = useCart((s) => s.subtotal);
  const updateQty = useCart((s) => s.updateQty);
  const removeLine = useCart((s) => s.removeLine);
  const clear = useCart((s) => s.clear);
  const orderDiscount = useCart((s) => s.orderDiscount);
  const setOrderDiscount = useCart((s) => s.setOrderDiscount);
  const customerName = useCart((s) => s.customerName);
  const setCustomerName = useCart((s) => s.setCustomerName);
  const type = useCart((s) => s.type);
  const setType = useCart((s) => s.setType);
  const orderNotes = useCart((s) => s.orderNotes);

  const [taxRatePct] = useState(10);
  const [pending, start] = useTransition();
  const [payOpen, setPayOpen] = useState(false);

  const disc = dec(orderDiscount || "0");
  const tax = subtotal().minus(disc).times(taxRatePct).dividedBy(100);
  const tot = subtotal().minus(disc).plus(tax);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  const handleHold = () => {
    start(async () => {
      try {
        const result = await holdOrder({
          shiftId: activeShiftId,
          type,
          customerName,
          customerId: null,
          discount: orderDiscount,
          discountCode: "",
          notes: orderNotes,
          subtotal: subtotal().toString(),
          discountAmount: disc.toString(),
          tax: tax.toString(),
          total: tot.toString(),
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
        });
        clear();
        router.push(`/pos/holds?just=${result.orderNumber}`);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to hold order");
      }
    });
  };

  const typeButton = (val: typeof type, label: string) => (
    <button
      type="button"
      onClick={() => setType(val)}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
        type === val
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted">
            <HugeiconsIcon icon={ShoppingBag01Icon} className="size-4 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">Cart</h2>
          {itemCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono">{shiftTime}</span>
        </div>
      </div>

      {/* Cart lines */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-[15rem] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
              <HugeiconsIcon icon={ShoppingBag01Icon} className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Cart is empty</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Tap an item to add it</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => {
              const lt = lineTotal(l);
              return (
                <li
                  key={l.lineId}
                  className="group rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug">{l.nameSnapshot}</div>
                      {l.variant && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{l.variant.name}</div>
                      )}
                      {l.modifiers.length > 0 && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {l.modifiers.map((m) => `${m.groupName}: ${m.name}`).join(", ")}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.lineId)}
                      aria-label="Remove line"
                      className="shrink-0 rounded-md p-1 text-muted-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQty(l.lineId, l.qty - 1)}
                        className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={MinusSignIcon} className="size-3" />
                      </button>
                      <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(l.lineId, l.qty + 1)}
                        className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={PlusSignIcon} className="size-3" />
                      </button>
                    </div>
                    <span className="ml-auto text-sm font-semibold tabular-nums">{formatIDR(lt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="space-y-3.5 border-t border-border px-4 py-3.5">
        {/* Order type */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {typeButton("DINE_IN", "Dine In")}
          {typeButton("TAKEOUT", "Takeout")}
          {typeButton("DELIVERY", "Delivery")}
        </div>

        {/* Customer + Discount */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="(optional)"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount</label>
            <Input
              value={orderDiscount}
              onChange={(e) => setOrderDiscount(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={subtotal()} />
          {disc.gt(0) && <Row label="Discount" value={disc.neg()} negative />}
          <Row label={`Tax (${taxRatePct}%)`} value={tax} />
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-base font-semibold">Total</span>
            <span className="text-base font-bold tabular-nums">{formatIDR(tot)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lines.length === 0 || pending}
            onClick={handleHold}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={PauseIcon} className="size-3.5" />
            Hold
          </Button>
          <ConfirmDialog
            title="Clear cart"
            description="Remove all items from the cart? This cannot be undone."
            confirmLabel="Clear cart"
            successMessage="Cart cleared"
            onConfirm={() => { clear(); }}
          >
            {({ open }) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={lines.length === 0}
                onClick={open}
                className="gap-1.5"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                Clear
              </Button>
            )}
          </ConfirmDialog>
          <Button
            type="button"
            variant="buy"
            size="sm"
            className="ml-auto gap-1.5"
            disabled={lines.length === 0}
            onClick={() => setPayOpen(true)}
          >
            <HugeiconsIcon icon={CheckIcon} className="size-4" />
            Pay {itemCount > 0 && `(${itemCount})`}
          </Button>
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        activeShiftId={activeShiftId}
        subtotal={subtotal()}
        discount={disc}
        total={tot}
        taxRatePct={taxRatePct}
      />
    </div>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: import("@prisma/client").Prisma.Decimal;
  negative?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between", negative && "text-amber-600 dark:text-amber-400")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatIDR(value.abs())}</span>
    </div>
  );
}

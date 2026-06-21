"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useCart } from "@/lib/pos/cart-store";
import { discardHeldOrder, resumeOrderData } from "../hold-actions";

export function ResumeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const load = useCart((s) => s.load);

  const handleResume = () => {
    start(async () => {
      const data = await resumeOrderData(orderId);
      if (!data) {
        alert("Order not found or no longer HELD");
        return;
      }
      load({
        lines: data.lines.map((l) => ({
          lineId: Math.random().toString(36).slice(2),
          menuItemId: l.menuItemId,
          nameSnapshot: l.nameSnapshot,
          variant: l.variant,
          modifiers: l.modifiers,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discount: l.discount,
          notes: l.notes,
        })),
        orderDiscount: data.discount,
        orderDiscountCode: data.discountCode,
        orderNotes: data.notes,
        customerName: data.customerName,
        type: data.type,
      });
      await discardHeldOrder(orderId);
      router.push("/pos");
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={handleResume} className="gap-1.5">
        {pending ? (
          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
        ) : (
          <HugeiconsIcon icon={PlayIcon} className="size-4" />
        )}
        Resume
      </Button>
      <ConfirmDialog
        title="Discard held order"
        description="Discard this held order? This action cannot be undone."
        confirmLabel="Discard"
        successMessage="Held order discarded"
        onConfirm={() =>
          new Promise<void>((resolve, reject) => {
            start(async () => {
              try {
                await discardHeldOrder(orderId);
                router.refresh();
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          })
        }
      >
        {({ open }) => (
          <Button size="icon-sm" variant="ghost" disabled={pending} aria-label="Discard" onClick={open}>
            <HugeiconsIcon icon={Delete02Icon} className="size-4 text-muted-foreground" />
          </Button>
        )}
      </ConfirmDialog>
    </div>
  );
}

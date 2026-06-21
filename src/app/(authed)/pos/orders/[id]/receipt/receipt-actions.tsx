"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PrinterIcon,
  Cancel01Icon,
  Undo02Icon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { voidOrder, refundOrder, deleteOrder } from "./order-actions";

export function ReceiptActions({
  orderId,
  status,
  isAdmin,
}: {
  orderId: string;
  status: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleVoid = () => {
    const reason = prompt("Reason for voiding this order?");
    if (!reason) return;
    start(async () => {
      try {
        await voidOrder(orderId, reason);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to void");
      }
    });
  };

  const handleRefund = () => {
    const reason = prompt("Reason for refund?");
    if (!reason) return;
    start(async () => {
      try {
        await refundOrder(orderId, reason);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to refund");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
        <HugeiconsIcon icon={PrinterIcon} className="size-4" />
        Print
      </Button>
      {status === "PAID" && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={handleVoid} className="gap-1.5">
          {pending ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
          ) : (
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          )}
          Void
        </Button>
      )}
      {status === "PAID" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={handleRefund} className="gap-1.5">
          {pending ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
          ) : (
            <HugeiconsIcon icon={Undo02Icon} className="size-4" />
          )}
          Refund
        </Button>
      )}
      {isAdmin && (
        <ConfirmDialog
          title="Delete order"
          description="Permanently delete this order? This action cannot be undone."
          confirmLabel="Delete"
          successMessage="Order deleted successfully"
          onConfirm={() =>
            new Promise<void>((resolve, reject) => {
              start(async () => {
                try {
                  await deleteOrder(orderId);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              });
            })
          }
        >
          {({ open }) => (
            <Button size="sm" variant="destructive" disabled={pending} onClick={open} className="gap-1.5">
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              Delete
            </Button>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

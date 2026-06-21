"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteOrder } from "./[id]/receipt/order-actions";

export function DeleteOrderButton({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
}) {
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title="Delete order"
      description={`Permanently delete order ${orderNumber}? This action cannot be undone.`}
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
        <Button
          variant="destructive"
          size="icon-sm"
          aria-label={`Delete ${orderNumber}`}
          disabled={pending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          }}
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </Button>
      )}
    </ConfirmDialog>
  );
}

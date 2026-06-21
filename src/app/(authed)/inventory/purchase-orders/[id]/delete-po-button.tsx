"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deletePurchaseOrder } from "../actions";

export function DeletePOButton({
  poId,
  poNumber,
}: {
  poId: string;
  poNumber: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title="Delete purchase order"
      description={`Delete PO ${poNumber}? This permanently removes it from the system.`}
      confirmLabel="Delete"
      successMessage="Purchase order deleted successfully"
      onConfirm={() =>
        new Promise<void>((resolve, reject) => {
          start(async () => {
            try {
              await deletePurchaseOrder(poId);
              router.push("/inventory/purchase-orders");
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
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={open}
        >
          <TrashIcon className="size-4" />
          Delete
        </Button>
      )}
    </ConfirmDialog>
  );
}

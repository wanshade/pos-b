"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteMenuItem } from "./actions";

export function DeleteMenuItemButton({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title="Delete menu item"
      description={`Delete "${itemName}"? This action cannot be undone.`}
      confirmLabel="Delete"
      successMessage="Menu item deleted successfully"
      onConfirm={() =>
        new Promise<void>((resolve, reject) => {
          start(async () => {
            try {
              await deleteMenuItem(itemId);
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
          aria-label={`Delete ${itemName}`}
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

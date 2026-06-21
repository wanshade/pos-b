"use client";

import { useTransition } from "react";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteShift } from "../actions";

export function DeleteShiftButton({
  shiftId,
  userName,
  openedAt,
}: {
  shiftId: string;
  userName: string;
  openedAt: string;
}) {
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title="Delete shift"
      description={`Delete ${userName}'s shift (opened ${openedAt})? This action cannot be undone.`}
      confirmLabel="Delete"
      successMessage="Shift deleted successfully"
      onConfirm={() =>
        new Promise<void>((resolve, reject) => {
          start(async () => {
            try {
              await deleteShift(shiftId);
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
          aria-label={`Delete ${userName}'s shift`}
          disabled={pending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          }}
        >
          <TrashIcon className="size-4" />
        </Button>
      )}
    </ConfirmDialog>
  );
}

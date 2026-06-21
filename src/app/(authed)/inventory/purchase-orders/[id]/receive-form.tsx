"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, XIcon, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { receiveItems, cancelPO, markOrdered, type ReceiveState } from "./actions";

const IDLE: ReceiveState = { status: "idle" };

type LineRow = {
  id: string;
  itemName: string;
  qty: string;
  receivedQty: string;
  unitCost: string;
  unit: string;
};

export function ReceiveForm({
  poId,
  poStatus,
  lines,
}: {
  poId: string;
  poStatus: string;
  lines: LineRow[];
}) {
  const router = useRouter();
  const actionBound = receiveItems.bind(null, poId);
  const [state, action, pending] = useActionState(actionBound, IDLE);
  const [cancelling, startCancelling] = useTransition();
  const [ordering, startOrdering] = useTransition();

  const canReceive = poStatus === "ORDERED" || poStatus === "PARTIAL";
  const isDraft = poStatus === "DRAFT";
  const isDone = poStatus === "RECEIVED" || poStatus === "CANCELLED";

  return (
    <form action={action} className="space-y-4">
      <ul className="divide-y rounded-md border">
        {lines.map((l) => {
          const ordered = Number(l.qty);
          const received = Number(l.receivedQty);
          const remaining = ordered - received;
          return (
            <li key={l.id} className="grid gap-2 py-3 sm:grid-cols-[2fr_1fr_1fr_1fr_120px] sm:items-center">
              <div>
                <div className="font-medium">{l.itemName}</div>
                <div className="text-xs text-muted-foreground">
                  @ Rp {Number(l.unitCost).toLocaleString("id-ID")} / {l.unit}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Ordered</div>
                <div className="font-mono">{l.qty} {l.unit}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Received</div>
                <div className="font-mono">{l.receivedQty} {l.unit}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className="font-mono">{remaining} {l.unit}</div>
              </div>
              <div className="space-y-1">
                {canReceive ? (
                  <>
                    <label className="text-xs text-muted-foreground">Receive now</label>
                    <Input
                      name={`receive_${l.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      defaultValue=""
                      disabled={remaining <= 0}
                    />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
      )}

      {canReceive && (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
            Receive entered quantities
          </Button>
          <ConfirmDialog
            title="Cancel purchase order"
            description="Cancel this PO? This will mark it as cancelled and cannot be undone."
            confirmLabel="Cancel PO"
            successMessage="PO cancelled successfully"
            onConfirm={() =>
              new Promise<void>((resolve, reject) => {
                startCancelling(async () => {
                  try {
                    await cancelPO(poId);
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
                type="button"
                variant="destructive"
                size="sm"
                disabled={cancelling}
                onClick={open}
              >
                {cancelling ? <Loader2Icon className="size-4 animate-spin" /> : <XIcon className="size-4" />}
                Cancel PO
              </Button>
            )}
          </ConfirmDialog>
        </div>
      )}

      {isDraft && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={ordering}
            onClick={() => {
              startOrdering(async () => {
                await markOrdered(poId);
                router.refresh();
              });
            }}
          >
            {ordering ? <Loader2Icon className="size-4 animate-spin" /> : <TruckIcon className="size-4" />}
            Mark as ordered
          </Button>
          <ConfirmDialog
            title="Cancel draft PO"
            description="Cancel this draft PO? This will mark it as cancelled and cannot be undone."
            confirmLabel="Cancel PO"
            successMessage="Draft PO cancelled successfully"
            onConfirm={() =>
              new Promise<void>((resolve, reject) => {
                startCancelling(async () => {
                  try {
                    await cancelPO(poId);
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
                type="button"
                variant="destructive"
                size="sm"
                disabled={cancelling}
                onClick={open}
              >
                {cancelling ? <Loader2Icon className="size-4 animate-spin" /> : <XIcon className="size-4" />}
                Cancel PO
              </Button>
            )}
          </ConfirmDialog>
          <span className="text-xs text-muted-foreground">
            This PO is a draft. Mark it ordered before receiving stock.
          </span>
        </div>
      )}

      {isDone && (
        <p className="text-sm text-muted-foreground">
          This PO is {poStatus.toLowerCase()}. No further actions available.
        </p>
      )}
    </form>
  );
}

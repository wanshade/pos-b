"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, PlusIcon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addVariant,
  updateVariant,
  deleteVariant,
  type VariantFormState,
} from "./variant-actions";

const IDLE: VariantFormState = { status: "idle" };

export type Variant = {
  id: string;
  name: string;
  priceDelta: string;
  sortOrder: number;
};

function formatDelta(d: string): string {
  const n = Number(d);
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = "Rp " + Math.abs(n).toLocaleString("id-ID");
  return n > 0 ? `+${abs}` : `-${abs}`;
}

export function NewVariantForm({ menuItemId }: { menuItemId: string }) {
  const actionBound = addVariant.bind(null, menuItemId);
  const [state, action, pending] = useActionState(actionBound, IDLE);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_140px_100px_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="v-name">New variant name</Label>
        <Input id="v-name" name="name" placeholder="e.g. Large" maxLength={60} required />
        {state.status === "error" && state.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="v-delta">Price delta (IDR)</Label>
        <Input
          id="v-delta"
          name="priceDelta"
          placeholder="0  (or -3000, 5000)"
          inputMode="decimal"
        />
        {state.status === "error" && state.fieldErrors?.priceDelta && (
          <p className="text-xs text-destructive">{state.fieldErrors.priceDelta}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="v-sort">Sort</Label>
        <Input id="v-sort" name="sortOrder" type="number" min={0} defaultValue={0} />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
        Add
      </Button>
      {state.status === "error" && !state.fieldErrors && (
        <p className="sm:col-span-4 text-sm text-destructive">{state.message}</p>
      )}
    </form>
  );
}

export function VariantRow({ variant, menuItemId }: { variant: Variant; menuItemId: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="rounded-md border bg-card p-2">
      {editing ? (
        <EditVariantForm
          variant={variant}
          menuItemId={menuItemId}
          onClose={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{variant.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDelta(variant.priceDelta)} · sort {variant.sortOrder}
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      )}
    </li>
  );
}

function EditVariantForm({
  variant,
  menuItemId,
  onClose,
}: {
  variant: Variant;
  menuItemId: string;
  onClose: () => void;
}) {
  const actionBound = updateVariant.bind(null, variant.id, menuItemId);
  const [state, action, pending] = useActionState(actionBound, IDLE);
  const [deleting, startDeleting] = useTransition();

  return (
    <form action={action} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_140px_100px]">
        <div className="space-y-1">
          <Label htmlFor={`ev-name-${variant.id}`}>Name</Label>
          <Input id={`ev-name-${variant.id}`} name="name" defaultValue={variant.name} required maxLength={60} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ev-delta-${variant.id}`}>Price delta</Label>
          <Input
            id={`ev-delta-${variant.id}`}
            name="priceDelta"
            defaultValue={variant.priceDelta}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ev-sort-${variant.id}`}>Sort</Label>
          <Input
            id={`ev-sort-${variant.id}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={variant.sortOrder}
          />
        </div>
      </div>
      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <XIcon className="size-4" /> Cancel
        </Button>
        <span className="ml-auto" />
        <ConfirmDialog
          title="Delete variant"
          description={`Delete variant "${variant.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          successMessage="Variant deleted successfully"
          onConfirm={() =>
            new Promise<void>((resolve, reject) => {
              startDeleting(async () => {
                try {
                  await deleteVariant(variant.id, menuItemId);
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
              disabled={deleting}
              onClick={open}
            >
              {deleting ? <Loader2Icon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              Delete
            </Button>
          )}
        </ConfirmDialog>
      </div>
    </form>
  );
}

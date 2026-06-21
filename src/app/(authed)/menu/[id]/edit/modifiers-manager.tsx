"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, PlusIcon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addModifier,
  updateModifier,
  deleteModifier,
  type ModifierFormState,
} from "./modifier-actions";

const IDLE: ModifierFormState = { status: "idle" };

export type Modifier = {
  id: string;
  groupName: string;
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

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = out.get(k) ?? [];
    arr.push(it);
    out.set(k, arr);
  }
  return out;
}

export function NewModifierForm({ menuItemId }: { menuItemId: string }) {
  const actionBound = addModifier.bind(null, menuItemId);
  const [state, action, pending] = useActionState(actionBound, IDLE);

  return (
    <form
      action={action}
      className="grid gap-2 sm:grid-cols-[140px_1fr_140px_100px_auto] sm:items-end"
    >
      <div className="space-y-1">
        <Label htmlFor="m-group">Group</Label>
        <Input id="m-group" name="groupName" placeholder="e.g. Milk" maxLength={40} required />
        {state.status === "error" && state.fieldErrors?.groupName && (
          <p className="text-xs text-destructive">{state.fieldErrors.groupName}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-name">Option</Label>
        <Input id="m-name" name="name" placeholder="e.g. Oat milk" maxLength={60} required />
        {state.status === "error" && state.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-delta">Price delta</Label>
        <Input id="m-delta" name="priceDelta" placeholder="0" inputMode="decimal" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-sort">Sort</Label>
        <Input id="m-sort" name="sortOrder" type="number" min={0} defaultValue={0} />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
        Add
      </Button>
      {state.status === "error" && !state.fieldErrors && (
        <p className="sm:col-span-5 text-sm text-destructive">{state.message}</p>
      )}
    </form>
  );
}

export function ModifierGroupList({
  modifiers,
  menuItemId,
}: {
  modifiers: Modifier[];
  menuItemId: string;
}) {
  const grouped = groupBy(modifiers, (m) => m.groupName);
  const names = Array.from(grouped.keys()).sort();
  return (
    <div className="space-y-3">
      {names.map((g) => (
        <div key={g} className="rounded-md border bg-card/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <h4 className="text-sm font-medium">{g}</h4>
            <span className="text-xs text-muted-foreground">
              ({grouped.get(g)!.length})
            </span>
          </div>
          <ul className="space-y-2">
            {grouped.get(g)!.map((m) => (
              <ModifierRow key={m.id} modifier={m} menuItemId={menuItemId} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ModifierRow({ modifier, menuItemId }: { modifier: Modifier; menuItemId: string }) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <EditModifierForm modifier={modifier} menuItemId={menuItemId} onClose={() => setEditing(false)} />
  ) : (
    <li className="flex items-center gap-3 rounded-md bg-background p-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{modifier.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatDelta(modifier.priceDelta)} · sort {modifier.sortOrder}
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Edit
      </Button>
    </li>
  );
}

function EditModifierForm({
  modifier,
  menuItemId,
  onClose,
}: {
  modifier: Modifier;
  menuItemId: string;
  onClose: () => void;
}) {
  const actionBound = updateModifier.bind(null, modifier.id, menuItemId);
  const [state, action, pending] = useActionState(actionBound, IDLE);
  const [deleting, startDeleting] = useTransition();

  return (
    <form action={action} className="space-y-2 rounded-md border bg-background p-2">
      <div className="grid gap-2 sm:grid-cols-[140px_1fr_140px_100px]">
        <div className="space-y-1">
          <Label htmlFor={`em-group-${modifier.id}`}>Group</Label>
          <Input id={`em-group-${modifier.id}`} name="groupName" defaultValue={modifier.groupName} required maxLength={40} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`em-name-${modifier.id}`}>Option</Label>
          <Input id={`em-name-${modifier.id}`} name="name" defaultValue={modifier.name} required maxLength={60} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`em-delta-${modifier.id}`}>Price delta</Label>
          <Input id={`em-delta-${modifier.id}`} name="priceDelta" defaultValue={modifier.priceDelta} inputMode="decimal" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`em-sort-${modifier.id}`}>Sort</Label>
          <Input id={`em-sort-${modifier.id}`} name="sortOrder" type="number" min={0} defaultValue={modifier.sortOrder} />
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
          title="Delete modifier"
          description={`Delete "${modifier.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          successMessage="Modifier deleted successfully"
          onConfirm={() =>
            new Promise<void>((resolve, reject) => {
              startDeleting(async () => {
                try {
                  await deleteModifier(modifier.id, menuItemId);
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

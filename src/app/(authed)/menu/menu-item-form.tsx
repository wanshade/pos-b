"use client";

import { useActionState, useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type MenuItemFormState,
} from "./actions";

const IDLE: MenuItemFormState = { status: "idle" };

export type CategoryOption = { id: string; name: string };

type Existing = {
  id: string;
  name: string;
  categoryId: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  cost: string;
  imageUrl: string | null;
  isAvailable: boolean;
  trackStock: boolean;
  sortOrder: number;
};

export function NewMenuItemForm({
  categories,
  onSuccess,
}: {
  categories: CategoryOption[];
  onSuccess?: (id: string, name: string) => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createMenuItem, IDLE);

  useEffect(() => {
    if (state.status === "success" && state.id) {
      if (onSuccess) {
        onSuccess(state.id, state.message);
      } else {
        router.push(`/menu/${state.id}/edit?created=1`);
      }
    }
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      <ItemFields
        categories={categories}
        errors={state.status === "error" ? state.fieldErrors : undefined}
      />
      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Create item
        </Button>
        {onSuccess ? null : (
          <Button type="button" variant="ghost" onClick={() => router.push("/menu")}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function EditMenuItemForm({
  item,
  categories,
}: {
  item: Existing;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const updateBound = updateMenuItem.bind(null, item.id);
  const [state, action, pending] = useActionState(updateBound, IDLE);
  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <ItemFields
          categories={categories}
          defaults={{
            name: item.name,
            categoryId: item.categoryId,
            sku: item.sku,
            barcode: item.barcode,
            price: item.price,
            cost: item.cost,
            imageUrl: item.imageUrl,
            isAvailable: item.isAvailable,
            trackStock: item.trackStock,
            sortOrder: item.sortOrder,
          }}
          errors={state.status === "error" ? state.fieldErrors : undefined}
        />
        {state.status === "success" && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
        )}
        {state.status === "error" && !state.fieldErrors && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
            Save changes
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/menu")}>
            Back to menu
          </Button>
        </div>
      </form>

      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
        <h3 className="text-sm font-medium text-destructive">Danger zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting is permanent. If this item has been ordered before, use the availability toggle above to hide it instead.
        </p>
        {deleteError && (
          <p className="mt-2 text-sm text-destructive">{deleteError}</p>
        )}
        <div className="mt-3">
          <ConfirmDialog
            title="Delete menu item"
            description={`Delete "${item.name}"? This action cannot be undone.`}
            confirmLabel="Delete item"
            successMessage="Menu item deleted successfully"
            onConfirm={() =>
              new Promise<void>((resolve, reject) => {
                setDeleteError(null);
                startDeleting(async () => {
                  try {
                    await deleteMenuItem(item.id);
                    resolve();
                  } catch (e) {
                    setDeleteError(e instanceof Error ? e.message : "Failed to delete item");
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
                Delete item
              </Button>
            )}
          </ConfirmDialog>
        </div>
      </div>
    </div>
  );
}

function ItemFields({
  categories,
  errors,
  defaults,
}: {
  categories: CategoryOption[];
  errors?: Record<string, string>;
  defaults?: Partial<Existing>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" error={errors?.name} required>
        <Input name="name" defaultValue={defaults?.name} maxLength={120} required />
      </Field>
      <Field label="Category" error={errors?.categoryId} required>
        <Select
          name="categoryId"
          defaultValue={defaults?.categoryId ?? ""}
          items={categories.map((c) => ({ value: c.id, label: c.name }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="SKU" error={errors?.sku} hint="Optional, must be unique">
        <Input name="sku" defaultValue={defaults?.sku ?? ""} maxLength={80} />
      </Field>
      <Field label="Barcode" error={errors?.barcode} hint="Optional, must be unique">
        <Input name="barcode" defaultValue={defaults?.barcode ?? ""} maxLength={80} />
      </Field>
      <Field label="Price (IDR)" error={errors?.price} required>
        <Input
          name="price"
          defaultValue={defaults?.price ?? ""}
          type="text"
          inputMode="decimal"
          placeholder="15000"
          required
        />
      </Field>
      <Field label="Cost (IDR)" error={errors?.cost} hint="Optional, defaults to 0">
        <Input
          name="cost"
          defaultValue={defaults?.cost ?? ""}
          type="text"
          inputMode="decimal"
          placeholder="5000"
        />
      </Field>
      <Field label="Image URL" error={errors?.imageUrl} hint="Optional, must start with http(s)://">
        <Input
          name="imageUrl"
          defaultValue={defaults?.imageUrl ?? ""}
          type="url"
          placeholder="https://…"
          maxLength={500}
        />
      </Field>
      <Field label="Sort order" error={errors?.sortOrder} hint="Lower = shown first">
        <Input
          name="sortOrder"
          defaultValue={defaults?.sortOrder ?? 0}
          type="number"
          min={0}
        />
      </Field>
      <div className="flex items-end gap-6 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="isAvailable"
            defaultChecked={defaults?.isAvailable ?? true}
          />
          <span>Available (uncheck to hide from POS)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="trackStock"
            defaultChecked={defaults?.trackStock ?? false}
          />
          <span>Track stock (Phase 3 will add inventory)</span>
        </label>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

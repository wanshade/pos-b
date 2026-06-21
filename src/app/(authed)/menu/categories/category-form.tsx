"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { categorySchema, type CategoryInput } from "@/lib/schemas/menu";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryFormState,
} from "./actions";

const IDLE: CategoryFormState = { status: "idle" };

const LUCIDE_ICONS = [
  "Coffee", "Leaf", "Croissant", "Sandwich", "IceCream",
  "Pizza", "Utensils", "CupSoda", "Cake", "Cookie",
  "Apple", "Wine", "Beer", "Soup", "Drumstick",
];

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
};

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(createCategory, IDLE);
  return (
    <form action={action} className="space-y-3">
      <CategoryFields defaults={undefined} error={state.status === "error" ? state.fieldErrors : undefined} />
      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
      )}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
        Add category
      </Button>
    </form>
  );
}

export function EditCategoryForm({ category, onClose }: { category: Category; onClose: () => void }) {
  const updateBound = updateCategory.bind(null, category.id);
  const [state, action, pending] = useActionState(updateBound, IDLE);
  const [deleting, startDeleting] = useTransition();

  return (
    <form action={action} className="space-y-3 border-t pt-3">
      <CategoryFields defaults={category} error={state.status === "error" ? state.fieldErrors : undefined} />
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <XIcon className="size-4" /> Cancel
        </Button>
        <span className="ml-auto" />
        <ConfirmDialog
          title="Delete category"
          description={`Delete category "${category.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          successMessage="Category deleted successfully"
          onConfirm={() =>
            new Promise<void>((resolve, reject) => {
              startDeleting(async () => {
                try {
                  await deleteCategory(category.id);
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

function CategoryFields({
  defaults,
  error,
}: {
  defaults?: Category;
  error?: Record<string, string>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor={defaults ? `edit-name-${defaults.id}` : "name"}>Name</Label>
        <Input
          id={defaults ? `edit-name-${defaults.id}` : "name"}
          name="name"
          defaultValue={defaults?.name}
          required
          maxLength={60}
        />
        {error?.name && <p className="text-xs text-destructive">{error.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={defaults ? `edit-sortOrder-${defaults.id}` : "sortOrder"}>Sort order</Label>
        <Input
          id={defaults ? `edit-sortOrder-${defaults.id}` : "sortOrder"}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={defaults?.sortOrder ?? 0}
        />
        {error?.sortOrder && <p className="text-xs text-destructive">{error.sortOrder}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={defaults ? `edit-color-${defaults.id}` : "color"}>Color</Label>
        <Input
          id={defaults ? `edit-color-${defaults.id}` : "color"}
          name="color"
          placeholder="#FF8800"
          defaultValue={defaults?.color ?? ""}
          maxLength={7}
        />
        {error?.color && <p className="text-xs text-destructive">{error.color}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={defaults ? `edit-icon-${defaults.id}` : "icon"}>Icon</Label>
        <select
          id={defaults ? `edit-icon-${defaults.id}` : "icon"}
          name="icon"
          defaultValue={defaults?.icon ?? ""}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">(none)</option>
          {LUCIDE_ICONS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        {error?.icon && <p className="text-xs text-destructive">{error.icon}</p>}
      </div>
      <div className="flex items-end pb-1 sm:col-span-2 lg:col-span-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults?.isActive ?? true}
            className="size-4 rounded border-input"
          />
          <span>Active (uncheck to hide from POS without deleting)</span>
        </label>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createUser, deactivateUser, type UserFormState } from "./actions";

const IDLE: UserFormState = { status: "idle" };

export function NewUserForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createUser, IDLE);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-name">Name</Label>
          <Input id="new-name" name="name" required maxLength={80} />
          {state.status === "error" && state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-email">Email</Label>
          <Input id="new-email" name="email" type="email" required maxLength={120} />
          {state.status === "error" && state.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-role">Role</Label>
          <select
            id="new-role"
            name="role"
            defaultValue="KASIR"
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="KASIR">KASIR</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="KITCHEN">KITCHEN</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Password (min 8)</Label>
          <Input id="new-password" name="password" type="password" minLength={8} required />
          {state.status === "error" && state.fieldErrors?.password && (
            <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
          )}
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
          Create user
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => router.refresh()}>
          Refresh list
        </Button>
      </div>
    </form>
  );
}

export function DeactivateUserButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <ConfirmDialog
      title={isActive ? "Deactivate user" : "Reactivate user"}
      description={isActive ? "This user will no longer be able to sign in." : "This user will be able to sign in again."}
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      successMessage={isActive ? "User deactivated" : "User reactivated"}
      onConfirm={() =>
        new Promise<void>((resolve, reject) => {
          start(async () => {
            try {
              await deactivateUser(userId, !isActive);
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
          variant={isActive ? "destructive" : "outline"}
          size="sm"
          disabled={pending}
          onClick={open}
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
          {isActive ? "Deactivate" : "Reactivate"}
        </Button>
      )}
    </ConfirmDialog>
  );
}

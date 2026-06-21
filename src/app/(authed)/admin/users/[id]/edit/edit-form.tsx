"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateUser, deactivateUser, type UserFormState } from "../../actions";

const IDLE: UserFormState = { status: "idle" };

export function EditUserForm({
  user,
}: {
  user: { id: string; name: string; email: string; role: "ADMIN" | "MANAGER" | "KASIR" | "KITCHEN"; isActive: boolean };
}) {
  const router = useRouter();
  const updateBound = updateUser.bind(null, user.id);
  const [state, action, pending] = useActionState(updateBound, IDLE);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" name="name" defaultValue={user.name} required maxLength={80} />
          {state.status === "error" && state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Email (read-only)</Label>
          <Input value={user.email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-role">Role</Label>
          <select
            id="edit-role"
            name="role"
            defaultValue={user.role}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="KASIR">KASIR</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="KITCHEN">KITCHEN</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Active</Label>
          <label className="flex items-center gap-2 pt-1.5 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user.isActive}
              className="size-4 rounded border-input"
            />
            <span>User can sign in</span>
          </label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="edit-password">New password (leave blank to keep current)</Label>
          <Input id="edit-password" name="password" type="password" minLength={8} placeholder="••••••••" />
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
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/users")}>
          Back to users
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
        <Button type="button" variant={isActive ? "destructive" : "outline"} size="sm" disabled={pending} onClick={open}>
          <TrashIcon className="size-4" />
          {isActive ? "Deactivate" : "Reactivate"}
        </Button>
      )}
    </ConfirmDialog>
  );
}

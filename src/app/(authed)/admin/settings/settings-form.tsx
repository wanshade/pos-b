"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings, type SettingsState } from "./actions";

const IDLE: SettingsState = { status: "idle" };

export function SettingsForm({
  outlet,
}: {
  outlet: { id: string; name: string; address: string | null; phone: string | null; taxRate: string; currency: string; receiptFooter: string | null };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateSettings, IDLE);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={outlet.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="set-name">Outlet name</Label>
          <Input id="set-name" name="name" defaultValue={outlet.name} required maxLength={80} />
          {state.status === "error" && state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set-address">Address</Label>
          <Input id="set-address" name="address" defaultValue={outlet.address ?? ""} maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set-phone">Phone</Label>
          <Input id="set-phone" name="phone" defaultValue={outlet.phone ?? ""} maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set-taxRate">Tax rate (%, e.g. 10 for 10%)</Label>
          <Input id="set-taxRate" name="taxRate" defaultValue={outlet.taxRate} inputMode="decimal" required />
          {state.status === "error" && state.fieldErrors?.taxRate && (
            <p className="text-xs text-destructive">{state.fieldErrors.taxRate}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set-currency">Currency code</Label>
          <Input id="set-currency" name="currency" defaultValue={outlet.currency} maxLength={8} required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="set-footer">Receipt footer (printed at the bottom of every receipt)</Label>
          <Input id="set-footer" name="receiptFooter" defaultValue={outlet.receiptFooter ?? ""} maxLength={200} />
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
          Save settings
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

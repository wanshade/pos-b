"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openShiftAction, type OpenShiftState } from "../actions";

export function OpenShiftForm({ outlets }: { outlets: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const result = await openShiftAction({ status: "idle" }, formData);
      if (result.status === "success") {
        toast.success("Shift opened successfully");
        router.push("/pos");
      } else if (result.status === "error") {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.message);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="outletId">Outlet</Label>
        <select
          id="outletId"
          name="outletId"
          defaultValue={outlets[0]?.id ?? ""}
          required
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm"
        >
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {fieldErrors.outletId && (
          <p className="text-xs text-destructive">{fieldErrors.outletId}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="openingCash">Opening cash (IDR)</Label>
        <Input
          id="openingCash"
          name="openingCash"
          type="text"
          inputMode="decimal"
          placeholder="200000"
          required
        />
        {fieldErrors.openingCash && (
          <p className="text-xs text-destructive">{fieldErrors.openingCash}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" maxLength={500} />
      </div>

      {error && !Object.keys(fieldErrors).length && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
        Open shift
      </Button>
    </form>
  );
}

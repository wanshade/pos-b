"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOpname, type OpnameState } from "./actions";

const IDLE: OpnameState = { status: "idle" };

type Row = { id: string; name: string; currentQty: string; unit: string };

export function OpnameForm({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveOpname, IDLE);
  const [counts, setCounts] = useState<Record<string, string>>({});

  const updateCount = (id: string, v: string) => {
    setCounts((prev) => ({ ...prev, [id]: v }));
  };

  const dirtyCount = Object.values(counts).filter((v) => v.trim() !== "").length;
  const hasInvalid = Object.values(counts).some(
    (v) => v.trim() !== "" && !/^\d+(\.\d{1,2})?$/.test(v.trim()),
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="counts" value={JSON.stringify(counts)} />
      <ul className="divide-y rounded-md border">
        {rows.map((r) => {
          const counted = counts[r.id] ?? "";
          const trimmed = counted.trim();
          // Valid only for a non-negative number; otherwise flag it.
          const isValid = trimmed === "" || /^\d+(\.\d{1,2})?$/.test(trimmed);
          const diff =
            trimmed === "" || !isValid
              ? null
              : Math.round((Number(trimmed) - Number(r.currentQty)) * 100) / 100;
          return (
            <li key={r.id} className="grid gap-2 py-3 sm:grid-cols-[2fr_120px_140px_120px] sm:items-center">
              <div className="font-medium">{r.name}</div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">System</div>
                <div className="font-mono">{r.currentQty} {r.unit}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`cnt-${r.id}`}>
                  Counted
                </label>
                <Input
                  id={`cnt-${r.id}`}
                  type="text"
                  inputMode="decimal"
                  value={counted}
                  onChange={(e) => updateCount(r.id, e.target.value)}
                  placeholder="(leave blank to skip)"
                  aria-invalid={!isValid}
                  className={isValid ? undefined : "border-destructive"}
                />
                {!isValid && (
                  <p className="text-xs text-destructive">Enter a non-negative number</p>
                )}
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Diff</div>
                <div className={"font-mono " + (diff === null ? "text-muted-foreground" : diff === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || dirtyCount === 0 || hasInvalid}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Save opname
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setCounts({});
            router.refresh();
          }}
          disabled={pending}
        >
          Reset
        </Button>
        {dirtyCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {dirtyCount} item{dirtyCount === 1 ? "" : "s"} queued
          </span>
        )}
      </div>
    </form>
  );
}

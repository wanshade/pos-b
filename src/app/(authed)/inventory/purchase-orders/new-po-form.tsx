"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchaseOrder, type POCreateState } from "./actions";

const IDLE: POCreateState = { status: "idle" };

export type StockLine = { id: string; name: string; category: string; currentQty: string | null; unit: string; cost: string };

type DraftLine = { menuItemId: string; qty: string; unitCost: string };

export function NewPOForm({
  stocks,
  onSuccess,
}: {
  stocks: StockLine[];
  onSuccess?: (poId: string) => void;
}) {
  const [state, action, pending] = useActionState(createPurchaseOrder, IDLE);
  const [supplier, setSupplier] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
  });
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [intent, setIntent] = useState<"order" | "draft">("order");
  const [, startTransition] = useTransition();

  // Notify the parent (e.g. a modal) once, when a create succeeds.
  const notifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.status === "success" && state.id && notifiedRef.current !== state.id) {
      notifiedRef.current = state.id;
      onSuccess?.(state.id);
    }
  }, [state, onSuccess]);

  if (stocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No menu items found. Add a menu item first.
      </p>
    );
  }

  const setSup = (patch: Partial<typeof supplier>) => setSupplier((prev) => ({ ...prev, ...patch }));

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { menuItemId: stocks[0]?.id ?? "", qty: "1", unitCost: stocks[0]?.cost ?? "0" },
    ]);
  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const total = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitCost || 0), 0);
  const canSubmit = !pending && lines.length > 0 && supplier.name.trim() !== "";

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={() => {
        startTransition(() => {});
      }}
    >
      <input type="hidden" name="supplierName" value={supplier.name} />
      <input type="hidden" name="supplierContact" value={supplier.contact} />
      <input type="hidden" name="supplierPhone" value={supplier.phone} />
      <input type="hidden" name="supplierEmail" value={supplier.email} />
      <input type="hidden" name="supplierAddress" value={supplier.address} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />

      {/* Supplier details (entered inline per-PO) */}
      <div className="space-y-3 rounded-md border p-3">
        <div className="text-sm font-medium">Supplier details</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sup-name">Supplier name *</Label>
            <Input
              id="sup-name"
              value={supplier.name}
              onChange={(e) => setSup({ name: e.target.value })}
              required
              maxLength={120}
              placeholder="e.g. Acme Coffee Supply"
            />
            {state.status === "error" && state.fieldErrors?.supplierName && (
              <p className="text-xs text-destructive">{state.fieldErrors.supplierName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-contact">Contact person</Label>
            <Input id="sup-contact" value={supplier.contact} onChange={(e) => setSup({ contact: e.target.value })} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-phone">Phone</Label>
            <Input id="sup-phone" value={supplier.phone} onChange={(e) => setSup({ phone: e.target.value })} maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Email</Label>
            <Input id="sup-email" type="email" value={supplier.email} onChange={(e) => setSup({ email: e.target.value })} maxLength={120} />
            {state.status === "error" && state.fieldErrors?.supplierEmail && (
              <p className="text-xs text-destructive">{state.fieldErrors.supplierEmail}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-address">Address</Label>
            <Input id="sup-address" value={supplier.address} onChange={(e) => setSup({ address: e.target.value })} maxLength={500} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="po-notes">Notes (optional)</Label>
            <Input id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <PlusIcon className="size-4" /> Add line
          </Button>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines yet. Add at least one.</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((l, idx) => (
              <li key={idx} className="grid items-end gap-2 sm:grid-cols-[2fr_100px_140px_auto]">
                <div className="space-y-1">
                  {idx === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                  <select
                    value={l.menuItemId}
                    onChange={(e) => {
                      const picked = stocks.find((s) => s.id === e.target.value);
                      updateLine(idx, {
                        menuItemId: e.target.value,
                        ...(l.unitCost === "0" || l.unitCost === "" ? { unitCost: picked?.cost ?? l.unitCost } : {}),
                      });
                    }}
                    className="flex h-8 w-full rounded-lg border border-input bg-background text-foreground px-2.5 text-sm shadow-sm"
                  >
                    {stocks.map((s) => (
                      <option key={s.id} value={s.id} className="bg-background text-foreground">
                        {s.name} ({s.category}
                        {s.currentQty !== null ? ` · stock: ${s.currentQty} ${s.unit}` : " · not tracked"})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                  <Input type="text" inputMode="decimal" value={l.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <label className="text-xs text-muted-foreground">Unit cost</label>}
                  <Input type="text" inputMode="decimal" value={l.unitCost} onChange={(e) => updateLine(idx, { unitCost: e.target.value })} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)} aria-label="Remove line">
                  <TrashIcon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 text-right text-sm font-medium">
          Total: Rp {total.toLocaleString("id-ID")}
        </div>
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && state.id && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.message} — <a className="underline" href={`/inventory/purchase-orders/${state.id}`}>view detail</a>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!canSubmit} onClick={() => setIntent("order")}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Create &amp; mark ordered
        </Button>
        <Button type="submit" variant="outline" disabled={!canSubmit} onClick={() => setIntent("draft")}>
          Save as draft
        </Button>
      </div>
    </form>
  );
}

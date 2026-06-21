"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { formatIDR, dec, d0 } from "@/lib/money";
import { useCart } from "@/lib/pos/cart-store";
import type { PosItem } from "./types";

export function VariantModifierDialog({
  item,
  onClose,
}: {
  item: PosItem;
  onClose: () => void;
}) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const addLine = useCart((s) => s.addLine);

  const variant = variantId ? item.variants.find((v) => v.id === variantId) ?? null : null;
  const chosenMods = item.modifiers.filter((m) => selectedMods.has(m.id));

  const unitPrice = dec(item.price).plus(variant ? dec(variant.priceDelta) : d0()).toString();

  const linePreview = (() => {
    const unit = dec(unitPrice);
    const modSum = chosenMods.reduce((s, m) => s.plus(dec(m.priceDelta)), d0());
    return unit.plus(modSum);
  })();

  const canAdd = item.variants.length === 0 || variant !== null;

  const handleAdd = () => {
    if (!canAdd) return;
    addLine({
      menuItemId: item.id,
      nameSnapshot: item.name,
      variant: variant
        ? { id: variant.id, name: variant.name, priceDelta: variant.priceDelta }
        : null,
      modifiers: chosenMods.map((m) => ({
        id: m.id,
        groupName: m.groupName,
        name: m.name,
        priceDelta: m.priceDelta,
      })),
      unitPrice,
    });
    onClose();
  };

  const groups = new Map<string, typeof item.modifiers>();
  for (const m of item.modifiers) {
    const arr = groups.get(m.groupName) ?? [];
    arr.push(m);
    groups.set(m.groupName, arr);
  }

  const optionBtn = (selected: boolean) =>
    cn(
      "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
      selected
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border text-foreground hover:bg-muted",
    );

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{formatIDR(item.price)} — customize your order</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {item.variants.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Size / Variant
              </div>
              <div className="flex flex-wrap gap-2">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={optionBtn(variantId === v.id)}
                  >
                    {v.name}
                    {Number(v.priceDelta) !== 0 && (
                      <span className={cn("ml-1.5 text-xs", variantId === v.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {Number(v.priceDelta) > 0 ? "+" : ""}
                        {formatIDR(v.priceDelta)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {Array.from(groups.entries()).map(([groupName, mods]) => (
            <div key={groupName} className="space-y-2.5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {groupName}
              </div>
              <div className="flex flex-wrap gap-2">
                {mods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMods((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      });
                    }}
                    className={optionBtn(selectedMods.has(m.id))}
                  >
                    {m.name}
                    {Number(m.priceDelta) !== 0 && (
                      <span className={cn("ml-1.5 text-xs", selectedMods.has(m.id) ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {Number(m.priceDelta) > 0 ? "+" : ""}
                        {formatIDR(m.priceDelta)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Line Total
            </div>
            <div className="text-lg font-bold tabular-nums">{formatIDR(linePreview)}</div>
          </div>
          <Button variant="buy" onClick={handleAdd} disabled={!canAdd} size="sm" className="gap-1.5">
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            Add to cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

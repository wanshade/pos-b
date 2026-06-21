"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ClockIcon,
  Store01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { CategoryNav } from "./category-nav";
import { ItemGrid } from "./item-grid";
import { CartPanel } from "./cart-panel";
import { VariantModifierDialog } from "./variant-modifier-dialog";
import { useCart } from "@/lib/pos/cart-store";
import type { PosItem } from "./types";

type Category = { id: string; name: string; color: string | null; icon: string | null };

export function PosTerminal({
  categories,
  items,
  activeShift,
}: {
  categories: Category[];
  items: PosItem[];
  activeShift: { id: string; openedAt: string } | null;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("__all__");
  const [pickingItem, setPickingItem] = useState<PosItem | null>(null);
  const addLine = useCart((s) => s.addLine);

  const handleItemClick = (item: PosItem) => {
    const hasOptions = item.variants.length > 0 || item.modifiers.length > 0;
    if (hasOptions) {
      setPickingItem(item);
    } else {
      addLine({
        menuItemId: item.id,
        nameSnapshot: item.name,
        variant: null,
        modifiers: [],
        unitPrice: item.price,
      });
    }
  };

  if (!activeShift) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={ClockIcon} className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">No active shift</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Open a shift to start taking orders at the terminal.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/shifts/open" />} size="lg" className="gap-1.5">
            Open a shift
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  const shiftTime = new Date(activeShift.openedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col md:-m-8 md:flex-row">
      {/* Left: category nav + items */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CategoryNav
          categories={categories}
          activeId={activeCategoryId}
          onChange={setActiveCategoryId}
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <ItemGrid
            items={items}
            activeCategoryId={activeCategoryId}
            onItemClick={handleItemClick}
          />
        </div>
      </div>

      {/* Right: cart panel */}
      <div className="flex w-full flex-col border-t bg-card md:w-[380px] md:border-l md:border-t-0">
        <CartPanel activeShiftId={activeShift.id} shiftTime={shiftTime} />
      </div>

      {pickingItem && (
        <VariantModifierDialog
          item={pickingItem}
          onClose={() => setPickingItem(null)}
        />
      )}
    </div>
  );
}

"use client";

import { formatIDR } from "@/lib/money";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { PosItem } from "./types";

export function ItemGrid({
  items,
  activeCategoryId,
  onItemClick,
}: {
  items: PosItem[];
  activeCategoryId: string;
  onItemClick: (item: PosItem) => void;
}) {
  const filtered =
    activeCategoryId === "__all__"
      ? items
      : items.filter((i) => i.categoryId === activeCategoryId);

  if (filtered.length === 0) {
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
          <HugeiconsIcon icon={Settings01Icon} className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No items here</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Try selecting a different category</p>
        </div>
      </div>
    );
  }

  const hasOptions = (i: PosItem) => i.variants.length > 0 || i.modifiers.length > 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {filtered.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => onItemClick(i)}
          className={cn(
            "group relative flex flex-col items-stretch overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-foreground/20 hover:shadow-sm active:scale-[0.98] touch-manipulation",
          )}
        >
          {i.imageUrl ? (
            <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-muted">
              <img src={i.imageUrl} alt={i.name} className="size-full object-cover transition-transform group-hover:scale-105" />
            </div>
          ) : (
            <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-muted">
              <span className="text-2xl font-bold tracking-tight text-muted-foreground/30">
                {i.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-1">
            <div className="text-sm font-medium leading-snug">{i.name}</div>
            <div className="mt-auto flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">{formatIDR(i.price)}</span>
              {hasOptions(i) && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <HugeiconsIcon icon={Settings01Icon} className="size-2.5" />
                  {i.variants.length + i.modifiers.length}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

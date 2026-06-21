"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  PencilEdit01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";
import { DeleteMenuItemButton } from "./delete-item-button";

type Category = { id: string; name: string; color: string | null; icon: string | null };
type Item = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: string;
  cost: string;
  sku: string | null;
  isAvailable: boolean;
  trackStock: boolean;
};

function formatIDR(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return "Rp " + n.toLocaleString("id-ID");
}

export function MenuList({
  categories,
  items,
  canEdit,
  canDelete,
}: {
  categories: Category[];
  items: Item[];
  canEdit: boolean;
  canDelete?: boolean;
}) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string>("__all__");
  const [availableOnly, setAvailableOnly] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (catId !== "__all__" && i.categoryId !== catId) return false;
      if (availableOnly && !i.isAvailable) return false;
      if (!needle) return true;
      return (
        i.name.toLowerCase().includes(needle) ||
        (i.sku ?? "").toLowerCase().includes(needle) ||
        i.categoryName.toLowerCase().includes(needle)
      );
    });
  }, [q, catId, availableOnly, items]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const c of categories) map.set(c.id, []);
    for (const it of filtered) {
      const arr = map.get(it.categoryId) ?? [];
      arr.push(it);
      map.set(it.categoryId, arr);
    }
    return categories
      .map((c) => ({ category: c, items: map.get(c.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [categories, filtered]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b">
          <div className="relative flex-1 min-w-[200px]">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or category…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9 pr-8 bg-muted/50"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            )}
          </div>
          <Select
            value={catId}
            onValueChange={(v) => setCatId(v as string)}
          >
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={availableOnly}
              onCheckedChange={(v) => setAvailableOnly(!!v)}
            />
            <span>Available only</span>
          </label>
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {items.length}
          </span>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No items match your filter.
          </div>
        </div>
      )}

      {grouped.map(({ category, items: list }) => (
        <div key={category.id} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            {category.color && (
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            )}
            <h3 className="font-medium text-base">{category.name}</h3>
            <span className="text-xs font-normal text-muted-foreground">
              ({list.length})
            </span>
          </div>
          <div className="divide-y">
            {list.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={"truncate font-medium text-sm " + (i.isAvailable ? "" : "text-muted-foreground line-through")}>
                      {i.name}
                    </span>
                    {!i.isAvailable && (
                      <Badge variant="secondary" className="text-[10px]">unavailable</Badge>
                    )}
                    {i.trackStock && (
                      <Badge variant="outline" className="text-[10px]">stock</Badge>
                    )}
                  </div>
                  {i.sku && (
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {i.sku}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{formatIDR(i.price)}</div>
                  {Number(i.cost) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      cost {formatIDR(i.cost)}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    render={<Link href={`/menu/${i.id}/edit`} aria-label={`Edit ${i.name}`} />}
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
                  </Button>
                )}
                {canDelete && (
                  <DeleteMenuItemButton itemId={i.id} itemName={i.name} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

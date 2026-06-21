"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  PencilEdit01Icon,
  Tick02Icon,
  CircleIcon,
  FileEmpty02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { DeleteMenuItemButton } from "./delete-item-button";

type Category = { id: string; name: string; color: string | null };
type Item = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
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

function formatShort(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}K`;
  return `Rp ${n}`;
}

export function MenuGrid({
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

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("__all__", items.length);
    for (const c of categories) map.set(c.id, 0);
    for (const it of items) {
      map.set(it.categoryId, (map.get(it.categoryId) ?? 0) + 1);
    }
    return map;
  }, [items, categories]);

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

  const hasFilters = q || catId !== "__all__" || availableOnly;

  return (
    <div className="space-y-5">
      {/* ── Search ──────────────────────────────────────────── */}
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[18px] text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search menu items by name, SKU, or category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-10 text-sm shadow-xs outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        )}
      </div>

      {/* ── Category chips + available toggle ───────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          active={catId === "__all__"}
          onClick={() => setCatId("__all__")}
        >
          All
          <ChipCount>{counts.get("__all__") ?? 0}</ChipCount>
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={catId === c.id}
            onClick={() => setCatId(c.id)}
            color={c.color ?? undefined}
          >
            {c.name}
            <ChipCount>{counts.get(c.id) ?? 0}</ChipCount>
          </Chip>
        ))}
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Chip
          active={availableOnly}
          onClick={() => setAvailableOnly((v) => !v)}
          variant="toggle"
        >
          <HugeiconsIcon
            icon={Tick02Icon}
            className={cn("size-3.5 transition-opacity", availableOnly ? "opacity-100" : "opacity-40")}
          />
          Available only
        </Chip>
        {hasFilters && (
          <button
            onClick={() => { setQ(""); setCatId("__all__"); setAvailableOnly(false); }}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Result count ────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {filtered.length === 0 ? "No results" : `Showing ${filtered.length} of ${items.length} items`}
      </p>

      {/* ── Grid / Empty ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={FileEmpty02Icon} className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters.
            </p>
          </div>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setQ(""); setCatId("__all__"); setAvailableOnly(false); }}
            >
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  canEdit,
  canDelete,
}: {
  item: Item;
  canEdit: boolean;
  canDelete?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm",
        !item.isAvailable && "opacity-60",
      )}
    >
      {/* Category label + availability dot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.categoryColor && (
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: item.categoryColor }}
            />
          )}
          <span className="truncate">{item.categoryName}</span>
        </div>
        <span
          className={cn(
            "size-2 rounded-full shrink-0",
            item.isAvailable ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
          title={item.isAvailable ? "Available" : "Unavailable"}
        />
      </div>

      {/* Name */}
      <h3
        className={cn(
          "mt-3 font-medium text-sm leading-snug",
          !item.isAvailable && "line-through text-muted-foreground",
        )}
      >
        {item.name}
      </h3>

      {/* SKU */}
      {item.sku && (
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {item.sku}
        </p>
      )}

      {/* Price */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight">
          {formatShort(item.price)}
        </span>
        {Number(item.cost) > 0 && (
          <span className="text-xs text-muted-foreground">
            cost {formatShort(item.cost)}
          </span>
        )}
      </div>

      {/* Badges */}
      {(item.trackStock || !item.isAvailable) && (
        <div className="mt-2 flex items-center gap-1.5">
          {!item.isAvailable && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <HugeiconsIcon icon={CircleIcon} className="size-2.5" />
              hidden
            </Badge>
          )}
          {item.trackStock && (
            <Badge variant="outline" className="text-[10px]">
              stock tracked
            </Badge>
          )}
        </div>
      )}

      {/* Actions — always visible on mobile, hover on desktop */}
      {(canEdit || canDelete) && (
        <div className="mt-3 flex items-center gap-1 border-t border-border pt-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              nativeButton={false}
              render={<Link href={`/menu/${item.id}/edit`} aria-label={`Edit ${item.name}`} />}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
              Edit
            </Button>
          )}
          {canDelete && (
            <div className="ml-auto">
              <DeleteMenuItemButton itemId={item.id} itemName={item.name} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  color,
  variant = "default",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
  variant?: "default" | "toggle";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {variant === "default" && color && !active && (
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  );
}

function ChipCount({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        "bg-foreground/10",
      )}
    >
      {children}
    </span>
  );
}

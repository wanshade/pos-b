"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TYPES = ["", "PURCHASE", "SALE", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "OPNAME"];

export function MovementFilters({
  items,
  current,
}: {
  items: { id: string; name: string }[];
  current: { from: string; to: string; menuItemId: string; type: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [menuItemId, setMenuItemId] = useState(current.menuItemId);
  const [type, setType] = useState(current.type);

  const apply = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (menuItemId) params.set("menuItemId", menuItemId);
    if (type) params.set("type", type);
    start(() => {
      router.push(`/inventory/movements${params.toString() ? "?" + params.toString() : ""}`);
    });
  };

  const clear = () => {
    setFrom(""); setTo(""); setMenuItemId(""); setType("");
    start(() => router.push("/inventory/movements"));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] sm:items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Item</label>
        <select
          value={menuItemId}
          onChange={(e) => setMenuItemId(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm"
        >
          <option value="">All items</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t || "All types"}</option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={apply} disabled={pending}>
        <SearchIcon className="size-4" /> Apply
      </Button>
      <Button type="button" variant="ghost" onClick={clear} disabled={pending}>
        <XIcon className="size-4" /> Clear
      </Button>
    </div>
  );
}

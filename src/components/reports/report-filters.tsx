"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Shared client-side date-range + extra filter form for report pages. */
export function ReportFilters({
  current,
  extra,
}: {
  current: { from: string; to: string };
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);

  const apply = () => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    start(() => router.push(`?${p.toString()}`));
  };
  const clear = () => start(() => router.push("?"));

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-44" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-44" />
      </div>
      {extra}
      <Button type="button" size="sm" onClick={apply} disabled={pending}>
        <SearchIcon className="size-4" /> Apply
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={pending}>
        <XIcon className="size-4" /> Clear
      </Button>
    </div>
  );
}

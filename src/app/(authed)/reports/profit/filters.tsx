"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Bucket = "day" | "week" | "month";

export function ProfitFilters({
  current,
}: {
  current: { from: string; to: string; bucket: Bucket };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [bucket, setBucket] = useState<Bucket>(current.bucket);

  const apply = () => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (bucket !== "day") p.set("bucket", bucket);
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
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Bucket</label>
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value as Bucket)}
          className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>
      <Button type="button" size="sm" onClick={apply} disabled={pending}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />} Apply
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={pending}>
        <XIcon className="size-4" /> Clear
      </Button>
    </div>
  );
}

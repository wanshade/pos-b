"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AllShiftsFilters({
  users,
  current,
}: {
  users: { id: string; name: string; role: string }[];
  current: { userId: string; from: string; to: string; status: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState(current.userId);
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [status, setStatus] = useState(current.status);

  const apply = () => {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (status) p.set("status", status);
    start(() => router.push(`/shifts/all${p.toString() ? "?" + p.toString() : ""}`));
  };
  const clear = () => {
    setUserId(""); setFrom(""); setTo(""); setStatus("");
    start(() => router.push("/shifts/all"));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] sm:items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">User</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
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

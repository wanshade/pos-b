"use client";

import { cn } from "@/lib/utils";

type Category = { id: string; name: string; color: string | null; icon: string | null };

export function CategoryNav({
  categories,
  activeId,
  onChange,
}: {
  categories: Category[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-card p-3 no-scrollbar">
      <button
        type="button"
        onClick={() => onChange("__all__")}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
          activeId === "__all__"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            activeId === c.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {c.color && (
            <span
              className={cn(
                "inline-block size-2 rounded-full",
                activeId === c.id && "ring-2 ring-primary-foreground/30",
              )}
              style={{ backgroundColor: c.color }}
            />
          )}
          {c.name}
        </button>
      ))}
    </div>
  );
}

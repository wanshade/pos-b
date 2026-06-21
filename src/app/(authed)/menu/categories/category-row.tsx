"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditCategoryForm } from "./category-form";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
};

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-3">
        <span
          className="inline-block size-6 shrink-0 rounded border"
          style={{ backgroundColor: category.color ?? "transparent" }}
          aria-label={category.color ? `Color ${category.color}` : "No color"}
        />
        <span className="font-medium">{category.name}</span>
        {category.icon && (
          <span className="text-xs text-muted-foreground">icon: {category.icon}</span>
        )}
        <span className="text-xs text-muted-foreground">sort: {category.sortOrder}</span>
        <span className="ml-auto flex items-center gap-2">
          {!category.isActive && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
              inactive
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
          >
            <PencilIcon className="size-4" />
            {editing ? "Close" : "Edit"}
          </Button>
        </span>
      </div>
      {editing && <EditCategoryForm category={category} onClose={() => setEditing(false)} />}
    </div>
  );
}

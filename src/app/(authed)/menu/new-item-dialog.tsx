"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { NewMenuItemForm, type CategoryOption } from "./menu-item-form";

export function NewItemDialog({
  categories,
  canCreate,
}: {
  categories: CategoryOption[];
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = useCallback(
    (id: string, message: string) => {
      toast.success(message);
      setOpen(false);
      router.refresh();
    },
    [router],
  );

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-9 gap-1.5">
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            New item
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New menu item</DialogTitle>
          <DialogDescription>
            Add an item to the menu. Variants & modifiers can be added after creation.
          </DialogDescription>
        </DialogHeader>
        {categories.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No categories yet.{" "}
            <a href="/menu/categories" className="text-primary underline">
              Create a category first
            </a>
          </div>
        ) : (
          <NewMenuItemForm categories={categories} onSuccess={handleSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}

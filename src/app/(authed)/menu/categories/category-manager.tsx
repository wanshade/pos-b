"use client";

import { useActionState, useTransition, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coffee, Leaf, Croissant, Sandwich, IceCream, Pizza,
  Utensils, CupSoda, Cake, Cookie, Apple, Wine, Beer, Soup, Drumstick,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  CheckIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryFormState,
} from "./actions";

const IDLE: CategoryFormState = { status: "idle" };

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Coffee", Icon: Coffee },
  { name: "Leaf", Icon: Leaf },
  { name: "Croissant", Icon: Croissant },
  { name: "Sandwich", Icon: Sandwich },
  { name: "IceCream", Icon: IceCream },
  { name: "Pizza", Icon: Pizza },
  { name: "Utensils", Icon: Utensils },
  { name: "CupSoda", Icon: CupSoda },
  { name: "Cake", Icon: Cake },
  { name: "Cookie", Icon: Cookie },
  { name: "Apple", Icon: Apple },
  { name: "Wine", Icon: Wine },
  { name: "Beer", Icon: Beer },
  { name: "Soup", Icon: Soup },
  { name: "Drumstick", Icon: Drumstick },
];

const PRESET_COLORS = [
  "#f97316", "#ef4444", "#ec4899", "#a855f7",
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#84cc16", "#eab308", "#f59e0b", "#6b7280",
];

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  itemCount: number;
};

function getIconComponent(name: string | null): LucideIcon | null {
  if (!name) return null;
  return ICON_OPTIONS.find((o) => o.name === name)?.Icon ?? null;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {categories.filter((c) => c.isActive).length} active · {categories.filter((c) => !c.isActive).length} inactive
        </p>
        <CreateCategoryDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const Icon = getIconComponent(category.icon);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm",
        !category.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex size-11 items-center justify-center rounded-xl shrink-0"
          style={{
            backgroundColor: category.color ? `${category.color}20` : "var(--muted)",
            color: category.color ?? "var(--muted-foreground)",
          }}
        >
          {Icon ? <Icon className="size-5" /> : (
            <div className="size-5 rounded" style={{ backgroundColor: category.color ?? "var(--muted-foreground)" }} />
          )}
        </div>
        <EditCategoryDialog category={category} />
      </div>

      <h3 className="mt-3 font-medium text-sm">{category.name}</h3>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{category.itemCount} item{category.itemCount === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>sort: {category.sortOrder}</span>
      </div>

      <div className="mt-3">
        {category.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Inactive
          </span>
        )}
      </div>
    </div>
  );
}

function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState(createCategory, IDLE);

  const handleSuccess = useCallback(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTimeout(handleSuccess, 0); }}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-9 gap-1.5">
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            New category
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Create a category to group menu items in the POS terminal.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <CategoryFields error={state.status === "error" ? state.fieldErrors : undefined} />
          {state.status === "error" && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending} size="sm" className="gap-1.5">
              <HugeiconsIcon icon={CheckIcon} className="size-4" />
              Create
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const updateBound = updateCategory.bind(null, category.id);
  const [state, action, pending] = useActionState(updateBound, IDLE);
  const [deleting, startDeleting] = useTransition();

  const handleSuccess = useCallback(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTimeout(handleSuccess, 0); }}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Update &quot;{category.name}&quot; or delete it permanently.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <CategoryFields defaults={category} error={state.status === "error" ? state.fieldErrors : undefined} />
          {state.status === "error" && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          {state.status === "success" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending} size="sm" className="gap-1.5">
              <HugeiconsIcon icon={CheckIcon} className="size-4" />
              Save
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <span className="ml-auto" />
            <ConfirmDialog
              title="Delete category"
              description={`Delete "${category.name}"? This will also affect its ${category.itemCount} menu item${category.itemCount === 1 ? "" : "s"}.`}
              confirmLabel="Delete"
              successMessage="Category deleted successfully"
              onConfirm={() =>
                new Promise<void>((resolve, reject) => {
                  startDeleting(async () => {
                    try {
                      await deleteCategory(category.id);
                      resolve();
                      setOpen(false);
                      router.refresh();
                    } catch (e) {
                      reject(e);
                    }
                  });
                })
              }
            >
              {({ open: openDelete }) => (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  className="gap-1.5"
                  onClick={openDelete}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  Delete
                </Button>
              )}
            </ConfirmDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryFields({
  defaults,
  error,
}: {
  defaults?: Category;
  error?: Record<string, string>;
}) {
  const [selectedColor, setSelectedColor] = useState(defaults?.color ?? "");
  const [selectedIcon, setSelectedIcon] = useState(defaults?.icon ?? "");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSpace label="Name" error={error?.name} required>
          <Input
            name="name"
            defaultValue={defaults?.name}
            required
            maxLength={60}
            placeholder="e.g. Coffee"
          />
        </FieldSpace>
        <FieldSpace label="Sort order" error={error?.sortOrder} hint="Lower = shown first">
          <Input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={defaults?.sortOrder ?? 0}
          />
        </FieldSpace>
      </div>

      <FieldSpace label="Color" error={error?.color} hint="Used in POS nav and menu cards">
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className={cn(
                "size-7 rounded-lg border-2 transition-all",
                selectedColor === c
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            >
              {selectedColor === c && (
                <HugeiconsIcon icon={CheckIcon} className="size-3.5 text-white mx-auto" />
              )}
            </button>
          ))}
          <label className="relative size-7 cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-foreground/40 transition-colors flex items-center justify-center">
            <input
              type="color"
              value={selectedColor || "#888888"}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {selectedColor && !PRESET_COLORS.includes(selectedColor) ? (
              <div className="size-full rounded-md" style={{ backgroundColor: selectedColor }} />
            ) : (
              <span className="text-[10px] text-muted-foreground">custom</span>
            )}
          </label>
          {selectedColor && (
            <button
              type="button"
              onClick={() => setSelectedColor("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          <input type="hidden" name="color" value={selectedColor} />
        </div>
      </FieldSpace>

      <FieldSpace label="Icon" error={error?.icon} hint="Displayed in POS nav">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedIcon("")}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border-2 transition-all",
              selectedIcon === ""
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted",
            )}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4 text-muted-foreground" />
          </button>
          {ICON_OPTIONS.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedIcon(name)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border-2 transition-all",
                selectedIcon === name
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted",
              )}
              title={name}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={selectedIcon} />
      </FieldSpace>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none pt-1">
        <Checkbox
          name="isActive"
          defaultChecked={defaults?.isActive ?? true}
        />
        <span>Active (uncheck to hide from POS without deleting)</span>
      </label>
    </div>
  );
}

function FieldSpace({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";

export type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  successMessage?: string;
  onConfirm: () => Promise<void> | void;
  children: (props: { open: () => void }) => ReactNode;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  successMessage,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "digest" in e &&
        typeof (e as Record<string, unknown>).digest === "string" &&
        (e as Record<string, string>).digest.startsWith("NEXT_REDIRECT")
      ) {
        if (successMessage) toast.success(successMessage);
        return;
      }
      const msg = e instanceof Error ? e.message : "Action failed";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }, [onConfirm, successMessage]);

  return (
    <>
      {children({ open: () => setOpen(true) })}
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <div className="flex items-start gap-3">
              {variant === "destructive" && (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangleIcon className="size-5 text-destructive" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              size="sm"
              disabled={pending}
              onClick={handleConfirm}
            >
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

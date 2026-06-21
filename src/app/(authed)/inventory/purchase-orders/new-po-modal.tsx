"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewPOForm, type StockLine } from "./new-po-form";

export function NewPOModal({ stocks }: { stocks: StockLine[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="size-4" /> New PO
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>
            Enter supplier details and line items. Receiving happens on the detail page after the PO is created.
          </DialogDescription>
        </DialogHeader>
        <NewPOForm
          stocks={stocks}
          onSuccess={() => {
            // Close shortly after success so the user sees the confirmation,
            // then refresh the list to show the new PO.
            setTimeout(() => {
              setOpen(false);
              router.refresh();
            }, 700);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

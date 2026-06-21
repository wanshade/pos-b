"use client";

import { useEffect } from "react";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (auto && typeof window !== "undefined") {
      // Give the page a tick to render before opening the print dialog.
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [auto]);

  return (
    <Button size="sm" variant="outline" onClick={() => window.print()}>
      <PrinterIcon className="size-4" /> Print
    </Button>
  );
}

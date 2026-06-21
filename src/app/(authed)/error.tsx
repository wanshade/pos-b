"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">digest: {error.digest}</p>
      )}
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}

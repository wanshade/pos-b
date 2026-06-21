import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

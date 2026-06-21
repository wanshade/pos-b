"use client";

import { useTransition } from "react";
import { LogOutIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(authed)/actions";

export function LogoutButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => logoutAction())}
      className="w-full justify-start gap-2 rounded-xl font-bold"
    >
      {pending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <LogOutIcon className="size-4" />
      )}
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </Button>
  );
}

"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { loginAction, type LoginState } from "../actions";

const INITIAL: LoginState = { status: "idle" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL);

  const {
    register,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
  });

  const emailError = state.status === "error" ? state.fieldErrors?.email : errors.email?.message;
  const passwordError = state.status === "error" ? state.fieldErrors?.password : errors.password?.message;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-bold">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        {emailError && (
          <p className="text-sm text-destructive font-medium">{emailError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-bold">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {passwordError && (
          <p className="text-sm text-destructive font-medium">{passwordError}</p>
        )}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full" size="lg">
        {isPending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

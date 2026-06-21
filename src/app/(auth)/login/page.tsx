import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — POS App" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/dashboard" } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect(next);
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-2 text-center">
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFeatureSettings: '"ss01", "ss02"' }}
        >
          POS App
        </h1>
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </div>
      <LoginForm next={next} />
      <p className="text-center text-xs text-muted-foreground">
        Default: <code className="font-mono">admin@pos.local</code> / <code className="font-mono">admin1234</code>
      </p>
    </div>
  );
}

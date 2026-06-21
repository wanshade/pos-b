/**
 * Layout for public auth pages (login, register).
 * Centered, minimal — no sidebar/header.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      {children}
    </div>
  );
}

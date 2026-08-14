import { Outlet } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth, type PermAction } from "@/lib/auth";

export function NoAccess({ screen }: { screen?: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-card p-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold">No access</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        You don't have permission to open{screen ? ` the ${screen} screen` : " this screen"}. Contact your administrator
        if you believe this is a mistake.
      </p>
    </div>
  );
}

export function RequirePermission({
  screen,
  action = "view",
  label,
  children,
}: {
  screen: string;
  action?: PermAction;
  label?: string;
  children?: React.ReactNode;
}) {
  const { can, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!can(screen, action)) return <NoAccess screen={label} />;
  return <>{children ?? <Outlet />}</>;
}

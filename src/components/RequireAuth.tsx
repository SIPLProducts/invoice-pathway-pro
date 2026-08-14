import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Route guard. A momentary missing session (for example a rate-limited token
 * refresh) must not eject an already signed-in user — we only redirect once the
 * signed-out state has held for a short grace period.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const hadSession = useRef(false);
  const [confirmedOut, setConfirmedOut] = useState(false);

  if (session) hadSession.current = true;

  useEffect(() => {
    if (session || loading) {
      setConfirmedOut(false);
      return;
    }
    if (!hadSession.current) {
      setConfirmedOut(true);
      return;
    }
    const t = setTimeout(() => setConfirmedOut(true), 2500);
    return () => clearTimeout(t);
  }, [session, loading]);

  if (loading || (!session && !confirmedOut)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

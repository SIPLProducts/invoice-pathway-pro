import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/lib/demoAuth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

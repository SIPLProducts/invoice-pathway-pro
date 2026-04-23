import { useEffect } from "react";
import { useSapApis } from "@/lib/sapApisStore";
import {
  refreshSapSessionStatus,
  loginToSapDynamic,
  getSapSession,
} from "@/lib/sapSession";

/**
 * On app start, if no active SAP session is cached and the middleware has
 * `.env` credentials, silently log in so SAP calls work without any user
 * interaction. Failures are swallowed — the user can still log in manually
 * from SAP Settings.
 */
export function useSapAutoLogin() {
  const apis = useSapApis();

  useEffect(() => {
    const middlewareUrl =
      apis.find((a) => a.middleware?.url)?.middleware?.url?.trim().replace(/\/$/, "") ||
      ((import.meta.env.VITE_SAP_PROXY_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "");
    if (!middlewareUrl) return;

    let cancelled = false;
    (async () => {
      const status = await refreshSapSessionStatus(middlewareUrl);
      if (cancelled) return;
      if (status?.active) return; // already logged in server-side

      // Don't override an active manual paste with an auto-login.
      const local = getSapSession();
      if (local?.source === "manual" && local.jsessionid && local.jsessionid !== "auto") return;

      if (!status?.hasEnvCredentials) return;
      try {
        await loginToSapDynamic(middlewareUrl);
      } catch {
        // Silent — surface in SAP Settings instead.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-run when middleware URL changes (after user adds an API config).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apis.length, apis.find((a) => a.middleware?.url)?.middleware?.url]);
}

"use strict";

function errorEnvelope(code, message, sapBody) {
  return { error: { code, message, sapBody: sapBody ?? null } };
}

function fromAxios(err) {
  const wrapped = new Error(
    err.response?.data?.error?.message?.value ||
      err.response?.data?.error?.message ||
      err.message ||
      "SAP request failed",
  );
  wrapped.code = "sap_error";
  wrapped.sapStatus = err.response?.status || 502;
  wrapped.sapBody = err.response?.data || null;
  return wrapped;
}

/**
 * Detect when SAP returned an HTML page (login redirect / OAuth interstitial)
 * instead of the expected OData JSON. Returns a structured Error if so, else null.
 */
function detectAuthHtml(res) {
  const ct = String(res.headers?.["content-type"] || "").toLowerCase();
  const body = res.data;
  const bodyStr = typeof body === "string" ? body : "";
  const looksHtml =
    ct.includes("text/html") ||
    (bodyStr && /^\s*<(!doctype|html|head)/i.test(bodyStr));
  if (!looksHtml) return null;

  const isAuthRedirect =
    /oauth\/authorize|login\/callback|saml|authentication\.|sap-saml|j_security_check/i.test(
      bodyStr,
    );

  const err = new Error(
    isAuthRedirect
      ? "SAP redirected to login (OAuth/SAML). The middleware is not authenticated against this SAP tenant. Use a service-user with Basic auth that doesn't require the IDP login flow, or switch SAP_AUTH_MODE to 'bearer' and provide SAP_BEARER_TOKEN."
      : "SAP returned HTML instead of JSON. Check SAP_BASE_URL / SAP_SERVICE_PATH and that the user has access to this OData service.",
  );
  err.code = isAuthRedirect ? "sap_auth_redirect" : "sap_non_json_response";
  err.sapStatus = 502;
  err.sapBody = bodyStr.slice(0, 500);
  return err;
}

module.exports = { errorEnvelope, fromAxios, detectAuthHtml };

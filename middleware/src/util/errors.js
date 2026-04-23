"use strict";

function errorEnvelope(code, message, sapBody, hint, fixSteps) {
  return {
    error: {
      code,
      message,
      sapBody: sapBody ?? null,
      hint: hint ?? null,
      fixSteps: Array.isArray(fixSteps) ? fixSteps : null,
    },
  };
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
    /oauth\/authorize|login\/callback|saml|authentication\.|sap-saml|j_security_check|fragmentafterlogin|locationafterlogin/i.test(
      bodyStr,
    );

  const err = new Error(
    isAuthRedirect
      ? "SAP redirected to login (OAuth/SAML/IDP). The middleware is not authenticated against this SAP tenant."
      : "SAP returned HTML instead of JSON. Check SAP_BASE_URL / SAP_SERVICE_PATH and that the user has access to this OData service.",
  );
  err.code = isAuthRedirect ? "sap_auth_redirect" : "sap_non_json_response";
  err.sapStatus = 502;
  err.sapBody = bodyStr.slice(0, 500);
  err.hint = isAuthRedirect
    ? "Your SAP_USER appears to be a dialog/IDP user. ABAP Environment (Steampunk) tenants reject Basic auth from regular BTP users. Fix: (1) create a Communication User via Communication Arrangement in SAP and put its credentials in middleware/.env as SAP_USER/SAP_PASSWORD with SAP_AUTH_MODE=basic; OR (2) switch the Communication Arrangement to OAuth 2.0 and set SAP_AUTH_MODE=oauth_cc with SAP_OAUTH_TOKEN_URL/SAP_OAUTH_CLIENT_ID/SAP_OAUTH_CLIENT_SECRET. Then restart `node server.js`."
    : "Verify SAP_BASE_URL and SAP_SERVICE_PATH in middleware/.env match a valid OData v4 service the user can access.";
  return err;
}

module.exports = { errorEnvelope, fromAxios, detectAuthHtml };

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

  const mentionsCommUser =
    /communication\s+arrangement|communication\s+user|communication\s+system/i.test(
      bodyStr,
    );

  let message;
  if (isAuthRedirect && mentionsCommUser) {
    message =
      "SAP rejected the login: this tenant requires a Communication User. Your current SAP_USER appears to be a dialog/IDP user.";
  } else if (isAuthRedirect) {
    message =
      "SAP redirected to login (OAuth/SAML/IDP). Your SAP_USER appears to be a dialog/IDP user — ABAP Environment tenants reject Basic auth from these.";
  } else {
    message =
      "SAP returned HTML instead of JSON. Check SAP_BASE_URL / SAP_SERVICE_PATH and that the user has access to this OData service.";
  }

  const err = new Error(message);
  err.code = isAuthRedirect ? "sap_auth_redirect" : "sap_non_json_response";
  err.sapStatus = 502;
  err.sapBody = bodyStr.slice(0, 500);

  if (isAuthRedirect) {
    err.hint =
      "Create a Communication User in SAP (Option A) or switch to OAuth 2.0 client credentials (Option B), then update middleware/.env and restart.";
    err.fixSteps = [
      {
        title: "Option A — Communication User + Basic auth (recommended)",
        steps: [
          "In SAP Fiori, open 'Maintain Communication Users' → New. Create e.g. GATE_COMM_USER with a strong password.",
          "Open 'Communication Systems' → New. Set host to your SAP host and assign the Communication User above for inbound.",
          "Open 'Communication Arrangements' → New. Pick the scenario exposing ZUI_GATE_SERVICE and assign the Communication System.",
          "In middleware/.env set SAP_AUTH_MODE=basic, SAP_USER=GATE_COMM_USER, SAP_PASSWORD=<password>.",
          "Restart `node server.js`.",
        ],
      },
      {
        title: "Option B — OAuth 2.0 client credentials",
        steps: [
          "In the Communication Arrangement, switch the Inbound auth method to OAuth 2.0.",
          "Copy the generated Token Endpoint, Client ID, and Client Secret.",
          "In middleware/.env set SAP_AUTH_MODE=oauth_cc, SAP_OAUTH_TOKEN_URL=<token endpoint>, SAP_OAUTH_CLIENT_ID=<id>, SAP_OAUTH_CLIENT_SECRET=<secret>.",
          "Restart `node server.js`.",
        ],
      },
    ];
  } else {
    err.hint =
      "Verify SAP_BASE_URL and SAP_SERVICE_PATH in middleware/.env match a valid OData v4 service the user can access.";
  }
  return err;
}

module.exports = { errorEnvelope, fromAxios, detectAuthHtml };

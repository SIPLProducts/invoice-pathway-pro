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

module.exports = { errorEnvelope, fromAxios };

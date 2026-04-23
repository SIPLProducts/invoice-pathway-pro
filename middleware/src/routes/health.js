"use strict";

const express = require("express");
const { sapGet, getAuthInfo, buildCookieFromHeaders } = require("../sapClient");

const router = express.Router();

router.get("/sap", async (req, res) => {
  const cookies = buildCookieFromHeaders(req);
  try {
    const data = await sapGet(`/GateHeader?$top=1`, cookies);
    const rows = Array.isArray(data?.value) ? data.value.length : 0;
    // Re-read auth info AFTER the call so any auto-fallback is reflected.
    const info = getAuthInfo();
    res.json({
      ok: true,
      ...info,
      sapStatus: 200,
      rows,
      usedBrowserSession: Boolean(cookies),
    });
  } catch (e) {
    const info = getAuthInfo();
    res.status(e.sapStatus || 502).json({
      ok: false,
      ...info,
      code: e.code || "sap_error",
      message: e.message,
      hint: e.hint || null,
      fixSteps: e.fixSteps || null,
      usedBrowserSession: Boolean(cookies),
    });
  }
});

module.exports = router;

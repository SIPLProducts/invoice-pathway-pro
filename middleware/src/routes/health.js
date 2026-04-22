"use strict";

const express = require("express");
const { sapGet, getAuthInfo } = require("../sapClient");

const router = express.Router();

router.get("/sap", async (_req, res) => {
  const info = getAuthInfo();
  try {
    const data = await sapGet(`/GateHeader?$top=1`);
    const rows = Array.isArray(data?.value) ? data.value.length : 0;
    res.json({ ok: true, ...info, sapStatus: 200, rows });
  } catch (e) {
    res.status(e.sapStatus || 502).json({
      ok: false,
      ...info,
      code: e.code || "sap_error",
      message: e.message,
      hint: e.hint || null,
    });
  }
});

module.exports = router;

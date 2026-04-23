"use strict";

const express = require("express");
const sapSessionStore = require("../sapSessionStore");
const { logLoginResult } = require("../util/sessionLog");

const router = express.Router();

// POST /api/sap-session/login   { user?, password? }
router.post("/login", async (req, res) => {
  const { user, password } = req.body || {};
  try {
    const status = await sapSessionStore.loginToSap({ user, password });
    logLoginResult(status, null);
    res.json({ ok: true, ...status });
  } catch (err) {
    logLoginResult(null, err);
    res.status(err.sapStatus || 500).json({
      ok: false,
      code: err.code || "sap_login_failed",
      message: err.message,
      hint: err.hint || null,
    });
  }
});

// GET /api/sap-session/status
router.get("/status", (_req, res) => {
  res.json({ ok: true, ...sapSessionStore.getStatus() });
});

// POST /api/sap-session/logout
router.post("/logout", (_req, res) => {
  sapSessionStore.clearSession();
  console.log(`[SAP] LOGOUT  session cleared`);
  res.json({ ok: true });
});

module.exports = router;

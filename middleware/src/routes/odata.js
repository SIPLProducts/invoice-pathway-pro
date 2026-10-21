"use strict";

/**
 * Generic OData passthrough. The web app sends the exact SAP path configured
 * in SAP API Settings (with {tokens} already filled) in `x-sap-path`, e.g.
 *   /sap/opu/odata4/.../0001/ZC_GateHeader/...getPoLines(PoNumber='4500000001')
 * Any GET/POST/PATCH/DELETE on any service works without middleware changes.
 */
const express = require("express");
const { sapGet, sapWrite, buildCookieFromHeaders } = require("../sapClient");

const router = express.Router();

// Only SAP service paths; no host, no "..", no whitespace/control chars.
const SAFE = /^\/sap\/[^\s\\]*$/;

router.all("/", async (req, res, next) => {
  try {
    const path = String(req.headers["x-sap-path"] || "").trim();
    if (!SAFE.test(path) || path.includes("..")) {
      return res.status(400).json({
        error: {
          code: "bad_sap_path",
          message: "x-sap-path must be a SAP service path starting with /sap/ (set it as the API endpoint in SAP API Settings).",
        },
      });
    }
    const cookies = buildCookieFromHeaders(req);
    const method = req.method.toUpperCase();
    if (method === "GET") return res.json(await sapGet(path, cookies));
    const extra = {};
    if (req.headers["if-match"]) extra["If-Match"] = req.headers["if-match"];
    const data = await sapWrite(method, path, method === "DELETE" ? undefined : req.body ?? {}, extra, cookies);
    res.json(data ?? { ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

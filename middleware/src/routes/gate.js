"use strict";

/**
 * Header/item CRUD. Entity names, key properties and the navigation property
 * all come from the per-request SAP target (SAP API Settings → x-sap-* headers,
 * middleware/.env as fallback). Nothing service-specific is hardcoded.
 */
const express = require("express");
const { sapGet, sapWrite, sapBatch, buildCookieFromHeaders } = require("../sapClient");
const { buildHeaderItemsBatch, parseBatchResponse } = require("../util/batch");
const t = require("../sapTarget");

const router = express.Router();

router.get("/headers", async (req, res, next) => {
  try {
    const data = await sapGet(`/${t.headerEntity()}${t.expandQuery("?")}`, buildCookieFromHeaders(req));
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get("/headers/:gateId", async (req, res, next) => {
  try {
    const data = await sapGet(
      `/${t.headerEntity()}${t.headerKey(req.params.gateId)}${t.expandQuery("?")}`,
      buildCookieFromHeaders(req),
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.post("/headers", async (req, res, next) => {
  try {
    const data = await sapWrite("POST", `/${t.headerEntity()}`, req.body, {}, buildCookieFromHeaders(req));
    res.status(201).json(data);
  } catch (e) {
    if (e?.code === "sap_error" && e?.sapBody?.error) {
      console.error(
        "[gate] POST /headers SAP error:",
        e.sapBody.error.code,
        e.sapBody.error.message,
        "details=",
        JSON.stringify(e.sapBody.error.details || [], null, 2),
      );
    }
    next(e);
  }
});

router.patch("/headers/:gateId", async (req, res, next) => {
  try {
    const data = await sapWrite(
      "PATCH",
      `/${t.headerEntity()}${t.headerKey(req.params.gateId)}`,
      req.body,
      {},
      buildCookieFromHeaders(req),
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.patch("/items/:gateId/:itemNo", async (req, res, next) => {
  try {
    const data = await sapWrite(
      "PATCH",
      `/${t.itemEntity()}${t.itemKey(req.params.gateId, req.params.itemNo)}`,
      req.body,
      {},
      buildCookieFromHeaders(req),
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.post("/batch", async (req, res, next) => {
  try {
    const { gateId, header = {}, items = [] } = req.body || {};
    if (!gateId) {
      return res.status(400).json({ error: { code: "bad_request", message: "gateId is required" } });
    }
    const { body, boundary } = buildHeaderItemsBatch({
      gateId,
      header,
      items,
      headerPath: (id) => `${t.headerEntity()}${t.headerKey(id)}`,
      itemPath: (id, no) => `${t.itemEntity()}${t.itemKey(id, no)}`,
    });
    const raw = await sapBatch(body, boundary, buildCookieFromHeaders(req));
    res.json({ ok: true, parts: parseBatchResponse(raw) });
  } catch (e) {
    next(e);
  }
});

router.delete("/headers/:gateId", async (req, res, next) => {
  try {
    await sapWrite(
      "DELETE",
      `/${t.headerEntity()}${t.headerKey(req.params.gateId)}`,
      undefined,
      {},
      buildCookieFromHeaders(req),
    );
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;

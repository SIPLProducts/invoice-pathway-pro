"use strict";

const express = require("express");
const { sapGet, sapWrite, sapBatch, buildCookieFromHeaders } = require("../sapClient");
const { buildHeaderItemsBatch, parseBatchResponse } = require("../util/batch");

const router = express.Router();

// GET list with items expanded
router.get("/headers", async (req, res, next) => {
  try {
    const cookies = buildCookieFromHeaders(req);
    const data = await sapGet(`/GateHeader?$expand=_Item`, cookies);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// GET one header with items
router.get("/headers/:gateId", async (req, res, next) => {
  try {
    const cookies = buildCookieFromHeaders(req);
    const data = await sapGet(
      `/GateHeader(gate_id='${encodeURIComponent(req.params.gateId)}')?$expand=_Item`,
      cookies,
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST create header (+ optional _Item array)
router.post("/headers", async (req, res, next) => {
  try {
    const cookies = buildCookieFromHeaders(req);
    const data = await sapWrite("POST", `/GateHeader`, req.body, {}, cookies);
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

// PATCH header
router.patch("/headers/:gateId", async (req, res, next) => {
  try {
    const cookies = buildCookieFromHeaders(req);
    const data = await sapWrite(
      "PATCH",
      `/GateHeader(gate_id='${encodeURIComponent(req.params.gateId)}')`,
      req.body,
      {},
      cookies,
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// PATCH a single item
router.patch("/items/:gateId/:itemNo", async (req, res, next) => {
  try {
    const cookies = buildCookieFromHeaders(req);
    const data = await sapWrite(
      "PATCH",
      `/GateItem(gate_id='${encodeURIComponent(req.params.gateId)}',item_no='${encodeURIComponent(
        req.params.itemNo,
      )}')`,
      req.body,
      {},
      cookies,
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// $batch: update header + items atomically
router.post("/batch", async (req, res, next) => {
  try {
    const { gateId, header = {}, items = [] } = req.body || {};
    if (!gateId) {
      return res.status(400).json({ error: { code: "bad_request", message: "gateId is required" } });
    }
    const cookies = buildCookieFromHeaders(req);
    const { body, boundary } = buildHeaderItemsBatch({ gateId, header, items });
    const raw = await sapBatch(body, boundary, cookies);
    const parts = parseBatchResponse(raw);
    res.json({ ok: true, parts });
  } catch (e) {
    next(e);
  }
});

// DELETE
router.delete("/headers/:gateId", async (req, res, next) => {
  try {
    const cookies = buildCookieFromHeaders(req);
    await sapWrite(
      "DELETE",
      `/GateHeader(gate_id='${encodeURIComponent(req.params.gateId)}')`,
      undefined,
      {},
      cookies,
    );
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;

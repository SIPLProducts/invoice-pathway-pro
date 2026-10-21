"use strict";

/**
 * Per-request SAP target (service path + entity set names).
 *
 * The web app sends these from the API configured in SAP API Settings
 * (x-sap-service-path, x-sap-header-entity, x-sap-item-entity), so any
 * OData service works without code changes. .env values are fallbacks.
 */
const { AsyncLocalStorage } = require("async_hooks");

const store = new AsyncLocalStorage();

const DEFAULTS = {
  servicePath: (process.env.SAP_SERVICE_PATH || "").replace(/\/$/, ""),
  headerEntity: process.env.SAP_HEADER_ENTITY || "GateHeader",
  itemEntity: process.env.SAP_ITEM_ENTITY || "",
};

const SAFE_PATH = /^\/[A-Za-z0-9_\-./]*$/;
const SAFE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function deriveItem(header) {
  if (/Header/.test(header)) return header.replace(/Header/, "Item");
  return `${header}Item`;
}

function fromRequest(req) {
  const h = req.headers || {};
  let servicePath = String(h["x-sap-service-path"] || "").trim().replace(/\/$/, "");
  let headerEntity = String(h["x-sap-header-entity"] || "").trim();
  let itemEntity = String(h["x-sap-item-entity"] || "").trim();
  if (!SAFE_PATH.test(servicePath)) servicePath = "";
  if (!SAFE_NAME.test(headerEntity)) headerEntity = "";
  if (!SAFE_NAME.test(itemEntity)) itemEntity = "";

  const header = headerEntity || DEFAULTS.headerEntity;
  return {
    servicePath: servicePath || DEFAULTS.servicePath,
    headerEntity: header,
    itemEntity: itemEntity || DEFAULTS.itemEntity || deriveItem(header),
  };
}

function middleware(req, _res, next) {
  store.run(fromRequest(req), next);
}

function current() {
  const t = store.getStore();
  if (t) return t;
  const header = DEFAULTS.headerEntity;
  return {
    servicePath: DEFAULTS.servicePath,
    headerEntity: header,
    itemEntity: DEFAULTS.itemEntity || deriveItem(header),
  };
}

module.exports = { middleware, current };

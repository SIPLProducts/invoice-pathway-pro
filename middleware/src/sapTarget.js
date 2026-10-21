"use strict";

/**
 * Per-request SAP target: service path, entity set names, key property
 * names and the header->item navigation property.
 *
 * Everything comes from the API configured in SAP API Settings (sent by the
 * web app as x-sap-* headers). middleware/.env values are only fallbacks.
 * Nothing about a specific SAP service is hardcoded here.
 */
const { AsyncLocalStorage } = require("async_hooks");

const store = new AsyncLocalStorage();

const list = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const DEFAULTS = {
  servicePath: (process.env.SAP_SERVICE_PATH || "").replace(/\/$/, ""),
  headerEntity: process.env.SAP_HEADER_ENTITY || "",
  itemEntity: process.env.SAP_ITEM_ENTITY || "",
  headerKeys: list(process.env.SAP_HEADER_KEYS),
  itemKeys: list(process.env.SAP_ITEM_KEYS),
  itemNav: process.env.SAP_ITEM_NAV || "",
};

const SAFE_PATH = /^\/[A-Za-z0-9_\-./]*$/;
const SAFE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function deriveItem(header) {
  if (!header) return "";
  if (/Header/.test(header)) return header.replace(/Header/, "Item");
  return `${header}Item`;
}

function safeList(v) {
  const l = list(v);
  return l.every((n) => SAFE_NAME.test(n)) ? l : [];
}

function build({ servicePath, headerEntity, itemEntity, headerKeys, itemKeys, itemNav }) {
  const header = headerEntity || DEFAULTS.headerEntity;
  const hk = headerKeys && headerKeys.length ? headerKeys : DEFAULTS.headerKeys;
  let ik = itemKeys && itemKeys.length ? itemKeys : DEFAULTS.itemKeys;
  return {
    servicePath: servicePath || DEFAULTS.servicePath,
    headerEntity: header,
    itemEntity: itemEntity || DEFAULTS.itemEntity || deriveItem(header),
    headerKeys: hk,
    itemKeys: ik,
    itemNav: itemNav || DEFAULTS.itemNav,
  };
}

function fromRequest(req) {
  const h = req.headers || {};
  let servicePath = String(h["x-sap-service-path"] || "").trim().replace(/\/$/, "");
  let headerEntity = String(h["x-sap-header-entity"] || "").trim();
  let itemEntity = String(h["x-sap-item-entity"] || "").trim();
  let itemNav = String(h["x-sap-item-nav"] || "").trim();
  if (!SAFE_PATH.test(servicePath)) servicePath = "";
  if (!SAFE_NAME.test(headerEntity)) headerEntity = "";
  if (!SAFE_NAME.test(itemEntity)) itemEntity = "";
  if (!SAFE_NAME.test(itemNav)) itemNav = "";
  return build({
    servicePath,
    headerEntity,
    itemEntity,
    headerKeys: safeList(h["x-sap-header-keys"]),
    itemKeys: safeList(h["x-sap-item-keys"]),
    itemNav,
  });
}

function middleware(req, _res, next) {
  store.run(fromRequest(req), next);
}

function current() {
  return store.getStore() || build({});
}

function configError(what, envName) {
  const err = new Error(
    `SAP ${what} is not configured. Set it in SAP API Settings (API endpoint) or ${envName} in middleware/.env.`,
  );
  err.code = "sap_target_not_configured";
  err.sapStatus = 400;
  return err;
}

function headerEntity() {
  const t = current();
  if (!t.headerEntity) throw configError("header entity", "SAP_HEADER_ENTITY");
  return t.headerEntity;
}

function itemEntity() {
  const t = current();
  if (!t.itemEntity) throw configError("item entity", "SAP_ITEM_ENTITY");
  return t.itemEntity;
}

/** `$expand=<nav>` suffix, or "" when no navigation property is configured. */
function expandQuery(prefix = "?") {
  const nav = current().itemNav;
  return nav ? `${prefix}$expand=${nav}` : "";
}

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

/** OData key predicate for a header, e.g. ('X') or (GateId='X'). */
function headerKey(id) {
  const keys = current().headerKeys;
  if (keys.length) return `(${keys[0]}=${q(id)})`;
  return `(${q(id)})`;
}

/** OData key predicate for an item, e.g. (GateId='X',ItemNo='10'). */
function itemKey(id, itemNo) {
  const keys = current().itemKeys;
  if (keys.length < 2) throw configError("item key properties", "SAP_ITEM_KEYS");
  return `(${keys[0]}=${q(id)},${keys[1]}=${q(itemNo)})`;
}

module.exports = {
  middleware,
  current,
  headerEntity,
  itemEntity,
  expandQuery,
  headerKey,
  itemKey,
};

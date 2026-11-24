"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const gateRoutes = require("./routes/gate");
const odataRoutes = require("./routes/odata");
const healthRoutes = require("./routes/health");
const sapTarget = require("./sapTarget");
const { errorEnvelope } = require("./util/errors");

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

// Chrome Private Network Access: allow web pages (Lovable preview, Ubuntu site)
// to call a middleware on localhost / LAN. Must be set on the preflight.
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / server-to-server
      if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} not allowed`));
    },
    credentials: false,
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "x-proxy-secret",
      "ngrok-skip-browser-warning",
      "x-sap-jsessionid",
      "x-sap-vcap-id",
      "x-sap-service-path",
      "x-sap-header-entity",
      "x-sap-item-entity",
      "x-sap-header-keys",
      "x-sap-item-keys",
      "x-sap-item-nav",
      "x-sap-path",
      "x-sap-csrf",
      "x-sap-user",
      "If-Match",
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

// Always echo the ngrok-skip header so even error responses sail through ngrok cleanly
app.use((_req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(sapTarget.middleware);
app.use(
  morgan("tiny", {
    skip: (req) => req.path === "/api/health",
  }),
);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "sap-gate-proxy" }));

// Shared-secret guard: when PROXY_SECRET is set, every /api call except health
// must send a matching x-proxy-secret header (constant-time compare).
const PROXY_SECRET = (process.env.PROXY_SECRET || "").trim();
if (PROXY_SECRET) {
  const crypto = require("crypto");
  const expected = Buffer.from(PROXY_SECRET);
  app.use("/api", (req, res, next) => {
    if (req.method === "OPTIONS" || req.path === "/health" || req.path.startsWith("/health/")) return next();
    const got = Buffer.from(String(req.headers["x-proxy-secret"] || "").trim());
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
      return res.status(401).json(errorEnvelope("unauthorized", "Invalid or missing x-proxy-secret header"));
    }
    next();
  });
} else if (/^(1|true|yes)$/i.test(process.env.REQUIRE_PROXY_SECRET || "")) {
  // eslint-disable-next-line no-console
  console.error("[security] REQUIRE_PROXY_SECRET is on but PROXY_SECRET is empty — refusing to start");
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[security] PROXY_SECRET not set — OK for local testing (no shared secret required). " +
      "To enable it: set PROXY_SECRET=... in middleware/.env and enter the same value in " +
      "SAP API Settings → Connection & Credentials → Proxy Secret.",
  );
}

app.use("/api/health", healthRoutes);
app.use("/api/gate", gateRoutes);
app.use("/api/odata", odataRoutes);

// 404
app.use((req, res) => {
  res.status(404).json(errorEnvelope("not_found", `No route for ${req.method} ${req.path}`));
});

// Error handler
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error("[unhandled]", err);
  const status = err.sapStatus || 500;
  res
    .status(status)
    .json(
      errorEnvelope(
        err.code || "internal_error",
        err.message || "Unknown error",
        err.sapBody,
        err.hint,
        err.fixSteps,
      ),
    );
});

// HOST = local listen address only (e.g. 127.0.0.1). The public address
// (ngrok / LAN / Nginx) belongs in APP_BASE_URL, same as the other SAP middleware.
let HOST = (process.env.HOST || "127.0.0.1").trim();
let APP_BASE_URL = (process.env.APP_BASE_URL || "").trim();
if (/:\/\/|\//.test(HOST)) {
  // eslint-disable-next-line no-console
  console.warn(
    `[config] HOST="${HOST}" looks like a URL. HOST must be a local address like 127.0.0.1. ` +
      `Put the public URL in APP_BASE_URL instead. Listening on 127.0.0.1.`,
  );
  if (!APP_BASE_URL) APP_BASE_URL = HOST;
  HOST = "127.0.0.1";
}
const server = app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`SAP proxy listening on http://${HOST}:${PORT}`);
  if (APP_BASE_URL) {
    // eslint-disable-next-line no-console
    console.log(
      `Public URL (paste into SAP API Settings -> Node.js Middleware URL): ${APP_BASE_URL.replace(/\/+$/, "")}`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    `SAP target: ${(process.env.SAP_BASE_URL || "(not set)").trim()} | proxy secret: ${
      (process.env.PROXY_SECRET || "").trim() ? "required" : "not required"
    }`,
  );
});
server.on("error", (err) => {
  const msg =
    err.code === "EADDRINUSE"
      ? `Port ${PORT} is already in use. Stop the other process or change PORT in .env.`
      : err.code === "ENOTFOUND" || err.code === "EADDRNOTAVAIL"
        ? `Cannot listen on HOST="${HOST}". Use HOST=127.0.0.1 and put public URLs in APP_BASE_URL.`
        : `Server failed to start: ${err.message}`;
  // eslint-disable-next-line no-console
  console.error(`[startup] ${msg}`);
  process.exit(1);
});

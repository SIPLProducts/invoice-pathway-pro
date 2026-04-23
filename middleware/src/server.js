"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const gateRoutes = require("./routes/gate");
const healthRoutes = require("./routes/health");
const { errorEnvelope } = require("./util/errors");

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

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
app.use(
  morgan("tiny", {
    skip: (req) => req.path === "/api/health",
  }),
);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "sap-gate-proxy" }));

app.use("/api/health", healthRoutes);
app.use("/api/gate", gateRoutes);

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
      ),
    );
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SAP proxy listening on http://localhost:${PORT}`);
});

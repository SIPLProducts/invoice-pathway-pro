"use strict";

/**
 * Build a multipart/mixed $batch body that PATCHes the header and N items
 * inside one atomic changeset.
 *
 * Input:
 *   { gateId, header: {...patch}, items: [{ item_no, ...patch }, ...] }
 *
 * Returns: { body: string, boundary: string }
 */
function buildHeaderItemsBatch({ gateId, header, items = [] }) {
  const batchBoundary = "batch_" + Math.random().toString(36).slice(2);
  const changesetBoundary = "changeset_" + Math.random().toString(36).slice(2);

  const parts = [];
  let cid = 1;

  if (header && Object.keys(header).length) {
    parts.push(buildChangePart(cid++, "PATCH", `GateHeader(gate_id='${gateId}')`, header));
  }
  for (const item of items) {
    const { item_no: itemNo, ...patch } = item;
    parts.push(
      buildChangePart(cid++, "PATCH", `GateItem(gate_id='${gateId}',item_no='${itemNo}')`, patch),
    );
  }

  const changeset =
    parts.map((p) => `--${changesetBoundary}\r\n${p}`).join("") +
    `--${changesetBoundary}--\r\n`;

  const body =
    `--${batchBoundary}\r\n` +
    `Content-Type: multipart/mixed; boundary=${changesetBoundary}\r\n\r\n` +
    changeset +
    `--${batchBoundary}--\r\n`;

  return { body, boundary: batchBoundary };
}

function buildChangePart(cid, method, url, json) {
  const payload = JSON.stringify(json);
  return (
    `Content-Type: application/http\r\n` +
    `Content-Transfer-Encoding: binary\r\n` +
    `Content-ID: ${cid}\r\n\r\n` +
    `${method} ${url} HTTP/1.1\r\n` +
    `Content-Type: application/json\r\n` +
    `If-Match: *\r\n\r\n` +
    `${payload}\r\n`
  );
}

/**
 * Best-effort parse of a multipart $batch response into an array of JSON bodies
 * in changeset order. Non-JSON parts are returned as raw text.
 */
function parseBatchResponse(raw) {
  if (typeof raw !== "string") raw = String(raw);
  const jsonChunks = [];
  // Find every embedded JSON object body. Each inner part ends with \r\n followed by JSON.
  const regex = /\r\n\r\n(\{[\s\S]*?\})\r\n/g;
  let m;
  while ((m = regex.exec(raw)) !== null) {
    try {
      jsonChunks.push(JSON.parse(m[1]));
    } catch {
      jsonChunks.push({ raw: m[1] });
    }
  }
  return jsonChunks;
}

module.exports = { buildHeaderItemsBatch, parseBatchResponse };

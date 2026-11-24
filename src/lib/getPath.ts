/**
 * Dot-path getter with exact keys preferred, then case/underscore-tolerant
 * matching for configured SAP fields. Supports indices: "_Item.0.material".
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    const record = cur as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, p)) {
      cur = record[p];
      continue;
    }
    const normalized = p.replace(/_/g, "").toLowerCase();
    const matches = Object.keys(record).filter(
      (key) => key.replace(/_/g, "").toLowerCase() === normalized,
    );
    // Ambiguous aliases must not silently read the wrong SAP property.
    if (matches.length !== 1) return undefined;
    cur = record[matches[0]];
  }
  return cur;
}

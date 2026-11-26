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

/** Actual property name in `row` for a configured key (exact, then unique normalized match); falls back to the key. */
export function resolveKey(row: Record<string, unknown> | null | undefined, key: string): string {
  if (!row || Object.prototype.hasOwnProperty.call(row, key)) return key;
  const n = key.replace(/_/g, "").toLowerCase();
  const m = Object.keys(row).filter((k) => k.replace(/_/g, "").toLowerCase() === n);
  return m.length === 1 ? m[0] : key;
}

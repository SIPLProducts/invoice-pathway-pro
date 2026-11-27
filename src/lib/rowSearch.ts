import { getPath } from "@/lib/getPath";

function flatText(v: unknown, out: string[]) {
  if (v === null || v === undefined) return;
  if (Array.isArray(v)) v.forEach((x) => flatText(x, out));
  else if (typeof v === "object") Object.values(v as object).forEach((x) => flatText(x, out));
  else out.push(String(v));
}

/** Keep rows where any header or line item value contains the query (case-insensitive). */
export function filterRowsByQuery<T extends Record<string, unknown>>(rows: T[], query: string, childKey?: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    const parts: string[] = [];
    flatText(r, parts);
    if (childKey) flatText(getPath(r, childKey), parts);
    return parts.join("\u0001").toLowerCase().includes(q);
  });
}

/**
 * Tiny dot-path getter. Supports numeric indices: "_Item.0.material".
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    const key = /^\d+$/.test(p) ? Number(p) : p;
    cur = cur[key as keyof typeof cur];
  }
  return cur;
}

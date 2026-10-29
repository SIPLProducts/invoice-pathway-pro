import { describe, it, expect } from "vitest";
import { normalizeProxyBase } from "@/hooks/useSapProxy";

const O = "https://dmr.example.com";

describe("normalizeProxyBase", () => {
  it("'/api' (Nginx same-origin) becomes the site origin, so '/api/odata' is not doubled", () => {
    expect(normalizeProxyBase("/api", O) + "/api/odata").toBe(`${O}/api/odata`);
  });
  it("full URL ending in /api is stripped to the server root", () => {
    expect(normalizeProxyBase("http://10.0.0.5:8080/api/", O)).toBe("http://10.0.0.5:8080");
  });
  it("full URL without /api is kept", () => {
    expect(normalizeProxyBase("http://10.0.0.5:8080", O)).toBe("http://10.0.0.5:8080");
  });
  it("empty means not configured", () => {
    expect(normalizeProxyBase("", O)).toBe("");
    expect(normalizeProxyBase(undefined, O)).toBe("");
  });
});

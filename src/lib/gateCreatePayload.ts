/**
 * Builds the Create DMR body exactly as SAP's GateHeader deep-insert expects
 * (same shape that works in Postman "Create DMR New").
 */
type Row = Record<string, unknown>;

const norm = (k: string) => k.toLowerCase().replace(/[\s_\-./]+/g, "");

function pick(row: Row, names: string[]): unknown {
  const wanted = names.map(norm);
  for (const w of wanted) {
    for (const [k, v] of Object.entries(row)) {
      if (norm(k) === w && v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return undefined;
}

const str = (v: unknown) => (v === undefined ? undefined : String(v).trim());
const num = (v: unknown) => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
const time = (v: unknown) => {
  const s = str(v);
  if (!s) return undefined;
  return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
};
const date = (v: unknown) => {
  const s = str(v);
  if (!s) return undefined;
  const m = s.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10);
};

function clean(o: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}

export function buildGateCreatePayload(header: Row, items: Row[], childKey = "_Item"): Row {
  const plant = str(pick(header, ["Plant"]));
  const body: Row = clean({
    Plant: plant,
    GateDate: date(pick(header, ["GateDate", "gate_date"])),
    GateTime: time(pick(header, ["GateTime", "gate_time"])),
    Vendor: str(pick(header, ["Vendor"])),
    VendorName: str(pick(header, ["VendorName", "vendor_name"])),
    VehicleNo: str(pick(header, ["VehicleNo", "vehicle_no"])),
    DriverName: str(pick(header, ["DriverName", "driver_name"])),
    EntryType: str(pick(header, ["EntryType", "entry_type"])) ?? "IN",
  });
  body[childKey] = items
    .filter((r) => pick(r, ["Material", "materials_code", "material_code", "PoNumber", "po_number"]) !== undefined)
    .map((r) =>
      clean({
        Material: str(pick(r, ["Material", "materials_code", "material_code"])),
        MaterialDesc: str(pick(r, ["MaterialDesc", "materials_description", "material_description"])),
        OpenQty: num(pick(r, ["OpenQty", "open_quantity", "OpenQuantity"])),
        Plant: str(pick(r, ["Plant", "profit_center_plant"])) ?? plant,
        PoItem: str(pick(r, ["PoItem", "po_item"])),
        PoNumber: str(pick(r, ["PoNumber", "po_number"])) ?? str(pick(header, ["po_number", "PoNumber"])),
        Quantity: num(pick(r, ["Quantity", "goods_receipt_quantity", "GrQuantity"])),
        StorageLocation: str(pick(r, ["StorageLocation", "storage_location"])) ?? "",
        Unit: str(pick(r, ["Unit", "uom"])),
      }),
    );
  return body;
}

/** True when the API creates into a GateHeader entity (deep insert with _Item). */
export function isGateCreate(endpoint?: string, childKey?: string): boolean {
  return /GateHeader/i.test(endpoint ?? "") && (childKey ?? "_Item") === "_Item";
}

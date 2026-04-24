

## Plan: Fix "Error while parsing an XML stream" on Save (numeric fields sent as strings)

### Real root cause (not what SAP's headline says)

SAP's top-level error is misleading. The **second** detail in the response is the real one:

> `Property 'gross_weight' at offset '355' has invalid value '100'`

Looking at the actual PATCH body the middleware sent:

```json
"gross_weight":"100", "tare_weight":"200", "net_weight":"100"
```

Those weights are **JSON strings**. SAP's `Edm.Decimal` requires unquoted numbers (`100` or `100.000`), so it bails out with the generic `CX_SXML_PARSE_ERROR` wrapper.

Why strings made it onto the wire:
- Your "Update Header Data" API was set up with `gross_weight`/`tare_weight`/`net_weight` typed as `string` in `requestHeaderFields` (likely because you pasted a partial sample where the values weren't recognized as numbers, or because the API was created before auto-detect existed).
- `EditHeaderDialog` renders all fields with type `string` as `<input type="text">`, so the user-typed "100" stays a string.
- `sanitizeRow` in `useSapUpdate.ts` only coerces `string → number` when `field.type === "number"`. So `"100"` flows through unchanged.

### The fix — three layers, additive

#### 1. `src/hooks/useSapUpdate.ts` — coerce against the original row's type as a safety net
In `sanitizeRow`, accept a third argument: the **original row** (the live SAP record we got from GET). For each key being submitted:
- If the live row's value at that key is a `number`, coerce the outgoing value to a number (parse it; skip on NaN).
- If the live row's value is a `boolean`, coerce to boolean.
- Else fall back to the existing `field.type` logic.

This means even if `requestHeaderFields` types are wrong, the wire payload will be type-correct because we're trusting SAP's own GET response as the source of truth for shapes.

Wire it through: `submit(row, body)` already passes `row`; just pass it into `sanitizeRow(body, headerFields, row)`.

#### 2. `src/components/EditHeaderDialog.tsx` — render number inputs when the row says so
When deriving fields, if a field's declared `type` is `string` but the live row's value is a `number`, treat that field as `number` for both the input element (`<input type="number">`) and the `coerce()` call. Same for `boolean`. No change to stored field config — purely a render-time hint.

This means typing "100" produces `100` in the JSON, and even with no `requestHeaderFields` configured at all, the dialog still sends correctly-typed values.

#### 3. `src/hooks/useSapUpdate.ts` — surface the real SAP detail message
Today the toast/UI shows `details[0].message` (which is "The Data Services Request could not be understood due to malformed syntax"). Improve the picker:
- Prefer the first detail whose `code` contains `PROPERTY_ERROR`, `BAD_REQUEST` with a property name, or whose message contains `Property '` (the actually useful one).
- Else fall back to the first detail message.
- Else fall back to `error.message`.

Result: the toast will now say "Property 'gross_weight' at offset '355' has invalid value '100'" instead of the cryptic XML stream message.

### What stays the same
- Middleware: zero changes. It already forces `Content-Type: application/json` and `transformRequest: [(d)=>d]`.
- SAP backend: zero changes.
- `requestHeaderFields` you've configured: untouched (we just stop trusting them as the only type source).
- `null` filtering for `created_at` / `last_changed_at`: already in `sanitizeRow`, no change needed.
- `SAP__Messages` filtering: already in `sanitizeRow`.

### Files to change
- `src/hooks/useSapUpdate.ts` — pass `row` into `sanitizeRow`; add row-based type coercion; smarter SAP detail-message extraction (~25 added lines).
- `src/components/EditHeaderDialog.tsx` — derive effective input type from the live row when the field schema says `string` (~10 modified lines).

### Expected result
Hit Save on the same `A123I00013` row with `gross_weight`/`tare_weight`/`net_weight` edited:
- The PATCH body now contains `"gross_weight": 100, "tare_weight": 200, "net_weight": 100` (unquoted numbers).
- SAP returns 200 with the updated entity.
- If anything else is malformed in the future, the toast shows the actual offending property and value (e.g. "Property 'X' has invalid value 'Y'") instead of the misleading XML-stream wrapper.


# DMR Header — Merge DC/Invoice Number, Plant Row on Top

## 1. Merge DC and Invoice Number

Replace the two separate fields (`DC Number`, `Invoice Number`) with one field labelled **DC/Invoice Number**, sitting in the same position (after Vendor Name, before Invoice Date). The value is sent to the backend as `invoice_no` so existing SAP mapping keeps working, and `dc_number` is dropped from the header field set.

## 2. Plant at the top

Plant moves out of the normal three-column grid into its own row directly above Gate Entry No, matching the reference image:

```text
ZUI_GATE_SERVICE — HEADER            [ amount boxes ]
Plant *
[ Select Plant            v ]

Gate Entry No *   Gate Entry Date   Gate Entry Time
...
```

- Rendered as a dropdown with a "Select Plant" placeholder, roughly one-third width, marked required.
- Plant options come from the API's configured plant list in SAP Settings; if none are configured it falls back to a plain text input so nothing blocks entry.

Everything else — styling, buttons, navigation, OCR card, line items, amount boxes and submit logic — stays unchanged.

## Technical notes

- `src/lib/sapApisStore.ts`: remove `dc_number`, relabel `invoice_no` to "DC/Invoice Number", mark `plant` required, and bump the gate-header fields version so saved cloud configs self-heal.
- `src/pages/DMRNew.tsx`: pull `plant` out of `gridFields` and render it in a dedicated row above the grid; plant options read from the API's scheduler plant list.

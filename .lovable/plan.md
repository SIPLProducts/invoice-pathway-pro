# Gate Service Header — New Field Set

Replace the header fields shown in the ZUI_GATE_SERVICE_HEADER section of the New DMR screen with the 26 requested fields, in the exact order given.

## Field order and mapping

| # | Label | Backend key | Type |
|---|-------|-------------|------|
| 1 | Gate Entry No | gate_id | text |
| 2 | Gate Entry Date | gate_date | date |
| 3 | Gate Entry Time | gate_time | time |
| 4 | Vendor Code | vendor | text |
| 5 | Vendor Name | vendor_name | text |
| 6 | DC OBLIG | dc_oblig | text |
| 7 | Invoice Number | invoice_no | text |
| 8 | Invoice Date | invoice_date | date |
| 9 | Mode of Transport | mode_of_transport | text |
| 10 | Transporter Name | transporter_name | text |
| 11 | LR Date | lr_date | date |
| 12 | LR Number | lr_no | text |
| 13 | Vehicle Number | vehicle_no | text |
| 14 | Vehicle Report Date | vehicle_report_date | date |
| 15 | Vehicle Report Time | vehicle_report_time | time |
| 16 | Vehicle Release Date | vehicle_release_date | date |
| 17 | Vehicle Release Time | vehicle_release_time | time |
| 18 | E-Way Bill Number | eway_bill_no | text |
| 19 | E-Way Bill Date | eway_bill_date | date |
| 20 | Weighment Ticket Number | weighment_ticket_no | text |
| 21 | Gross Weight | gross_weight | number |
| 22 | Tare Weight | tare_weight | number |
| 23 | Net Weight | net_weight | number |
| 24 | Received Date | received_date | date |
| 25 | Received By | received_by | text |
| 26 | Unloading Location | unloading_location | text |

Existing header fields not in this list (Plant, Purpose, Document Type, Driver details, Remarks, etc.) are removed from the form. Gate Entry No stays required; the rest are optional so nothing blocks submission.

## Changes

1. `src/lib/sapApisStore.ts`
   - Rewrite the default gate header request field list to exactly the 26 fields above, in order.
   - Add a one-time cloud self-heal (same pattern as the existing item-template heal) that rewrites the saved gate-header config's request header fields to this list, so already-saved settings on the published site pick up the new fields instead of showing the old ones.

2. No changes to layout, styling, buttons, navigation, item/line-item section, or submit logic. The New DMR page already renders whatever header fields the config provides, so the form picks these up automatically.

## Notes

- The line-items section, OCR capture card, and SAP submit flow stay exactly as they are.
- The new keys are sent to the middleware as-is; if SAP's OData property names differ for any of the new fields, they can be edited later in SAP Settings without a code change.

# Show radio buttons on All DMR

## Why they are missing
The radio column exists in the table, but the All DMR page never turns it on, so it stays hidden. The "1 selected" badge appears because clicking a row still selects it behind the scenes.

## Fix
- On All DMR, turn on the radio column. Each row gets a radio button as the first column, and only one row can be picked at a time.
- Clicking the radio only selects the row. It does not download anything.
- Clicking anywhere else on the row selects it and downloads its PDF, the same as now.
- The top-right Download PDF button downloads the selected row.

## Technical details
- `src/pages/SapGateEntries.tsx`: add the `selectable` prop to `<SapLiveTable>`.
- Check in the browser that the radio column renders and that only one radio can be selected.

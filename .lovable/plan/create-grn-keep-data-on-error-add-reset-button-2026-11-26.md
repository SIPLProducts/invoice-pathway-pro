# Create GRN: keep data on error, add Reset button

## Behaviour
- **Success** (Post or Cancel): show the success popup, then clear the screen back to the starting state (as today).
- **Error** (SAP refuses): show the error popup and **keep everything as it is** — Gate ID, Action, Posting Date, items, serials — so the user can correct a value and press Post again.
- **New Reset button** next to Post/Cancel GRN in the page header: asks "Reset the screen?" and clears it to the starting state (no Gate ID, "Select Action", today's date, red serial highlights removed).

## Technical
- `src/pages/GRNCreate.tsx` `onPost`: move `resetScreen()` so it runs only after `r.ok` in both cancel and post branches.
- Add outlined `Reset` button (RotateCcw icon) calling `confirmAction` then `resetScreen`; disabled while busy.

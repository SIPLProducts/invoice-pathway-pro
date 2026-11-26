# Gate ID: searchable input

## What changes on Create GRN
- The Gate ID dropdown becomes a **search box**: type part of a Gate ID and a list below shows only the matching Gate IDs (newest first, from All DMR).
- Pick from the list (click, or arrow keys + Enter) to fill the screen, same as today.
- You can also type a full Gate ID and press Enter; if it exists in All DMR it is selected, otherwise a "Gate ID not found" message shows.
- "Clear" still empties the box and resets the screen. While Gate IDs load, the box shows "Loading Gate IDs…".

## Technical details
- Replace the `<select>` in `src/pages/GRNCreate.tsx` with the existing Popover + Command (cmdk) components: input inside the trigger area, filtered `CommandItem`s, `CommandEmpty` for no match.
- Reuse `pickGate(id)`; no change to posting/cancel logic.

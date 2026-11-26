# Create GRN — 9 / 3 layout and refreshed look

## Layout (wide screens)
```text
+----------------------------------------------------+---------------+
| LEFT (9 cols)                                      | RIGHT (3)     |
| [Action][Reference][PO No.+search][Item][Plant][GR]| Selection     |
|  compact fields, 6 in one row (3 per row on        | Gate ID drop  |
|  medium screens)                                   | (gradient     |
| Document Header tabs: General | Vendor | Partner   |  card, chip,  |
|  fields in 3 compact columns                       |  Clear)       |
+----------------------------------------------------+---------------+
| Items table + item detail (unchanged content, tighter spacing)     |
```
- Right panel holds only the Gate ID dropdown, its summary chip and Clear button.
- Action, Reference, PO Number, Item, Plant and GR goods receipt move into the left panel as one row of narrow fields (Reference/PO/Item still hide when a Gate ID is picked).
- Smaller inputs (h-8, text-sm), smaller labels and gaps so the header, tabs and the first item lines fit on one screen at normal laptop size.

## Look and feel
- Page title bar with a soft teal-to-blue gradient background and white title.
- Cards: subtle gradient border/top strip, rounded corners, light shadow.
- Selection card: gradient fill using the app's primary/accent colours, white text.
- Buttons: Post uses a gradient primary style; Check/Add Line/Delete outline with coloured hover.
- Tabs: pill style with gradient on the active tab.
- Colours defined as new gradient tokens in the global stylesheet (light and dark), not hardcoded.

## Technical
- `src/index.css` + `tailwind.config.ts`: add `--gradient-primary`, `--gradient-soft` tokens and `bg-gradient-primary` / `bg-gradient-soft` utilities.
- `src/pages/GRNCreate.tsx`: `lg:grid-cols-12` with `lg:col-span-9` / `lg:col-span-3`; move fields; compact sizing; gradient classes. No logic changes.
- Check with a screenshot at 1366x768 that it fits without page scroll.

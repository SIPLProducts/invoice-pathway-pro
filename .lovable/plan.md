# Create GRN — split top section 8 / 4

## Layout (desktop, 12-column grid)
```text
+------------------------------------------+----------------------+
| LEFT (8 cols): Header tabs               | RIGHT (4 cols):      |
|  General | Vendor | Partner              |  "Selection" card    |
|  Document/Posting date, Delivery note,   |  Gate ID dropdown    |
|  Bill of lading, Slip, Supplier,         |  Action dropdown     |
|  Header text ...                         |  Reference (hidden   |
|                                          |   when Gate chosen)  |
|                                          |  PO Number + search  |
|                                          |  Item, Plant,        |
|                                          |  GR goods receipt    |
+------------------------------------------+----------------------+
| Items table (full width, unchanged)                             |
```
- Right panel: Gate ID first and highlighted (accent border, icon), then the other dropdowns/inputs stacked one per row; sticky on scroll.
- When a Gate ID is chosen, show a small summary chip (Gate ID, vendor) and a "Clear" button; Reference/PO/Item stay hidden as today.
- Left panel: General tab fields in 2 columns instead of 3 so they fit the narrower width; Vendor/Partner tabs fill width.
- Both panels as matching cards with section titles ("Document Header", "Selection"), consistent label sizes and spacing.
- Small screens: right panel stacks on top of the left.

## Technical
Only `src/pages/GRNCreate.tsx`: wrap in `grid lg:grid-cols-12`, `lg:col-span-8` / `lg:col-span-4` (`order-first lg:order-last` on right). No logic changes.

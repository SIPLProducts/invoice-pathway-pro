# Create GRN — fix layout on smaller screens

## Problems seen in the screenshots
- On narrower screens the page becomes wider than the window: the Post button and the PO search button get cut off on the right.
- The Selection (Gate ID) card jumps from the right side to a full-width block on top, so the structure changes.
- The 6 top fields wrap into 3+3 rows and take extra height.

## Changes
- Stop the sideways overflow: let every card shrink to the window width (wide tables scroll inside their own card only), and let the page title buttons wrap under the title when space is tight.
- Keep the same structure on laptop and tablet: Selection stays as a narrow column on the right (main area 9/3 on large screens, 8/4 on tablet). Only on phones does it stack, as a compact strip above the fields.
- Top fields: 6 in a row on wide screens, 3 per row on tablet, 2 on phone; PO Number keeps its search button inside the same width.
- Document Header fields: 3 columns on wide, 2 on tablet, 1 on phone; label width shrinks on small screens.
- Item Detail tabs scroll sideways instead of wrapping into many rows on small screens.

## Technical
- `src/pages/GRNCreate.tsx`: add `min-w-0` to grid children and cards, `md:grid-cols-12` with `md:col-span-8/4` and `lg:col-span-9/3`, adjust field grid breakpoints, `overflow-x-auto` on TabsLists.
- `src/components/PageHeader.tsx`: allow actions to wrap (`flex-wrap`) if needed.
- Verify with screenshots at 1440, 1024, 768 and 390 px widths that nothing is cut off.

# Medium success popup + tighter app-wide sizing

## 1. "DMR Created!" popup (Create DMR)
- Keep it a medium width, and never taller than about 85% of the screen. If the content is longer, it scrolls inside the popup.
- Smaller tick circle (about 56px instead of 80px), smaller title, smaller Gate ID text, and less space between sections.
- The sent-fields list shows in two columns with smaller text, so it's shorter. It scrolls inside a box capped at about 40% of the screen height.
- The OK and Create another buttons always stay visible at the bottom.

## 2. Consistent, screen-fit sizing across the app
- Shrink the base text size slightly (16px to 14px) so everything is in proportion at 100% browser zoom, close to how it looks today at about 87% zoom.
- Less padding around page content (top/side gaps cut roughly in half on large screens).
- Slightly smaller page titles and less space under them.
- Sidebar, buttons, inputs, tables and popups all scale down together, so nothing looks out of place.

## Technical details
- `src/pages/DMRNew.tsx` success Dialog: `max-w-lg max-h-[85vh] flex flex-col gap-3 p-5`, icon h-14 w-14, title text-xl, Gate ID text-xl, fields list `grid sm:grid-cols-2 text-xs max-h-[40vh] overflow-y-auto`, footer buttons `shrink-0`.
- `src/index.css`: `html { font-size: 14px }` (rem-based Tailwind scales everything).
- `src/components/AppShell.tsx` main: `px-3 py-4 lg:px-5 lg:py-5`.
- `src/components/PageHeader.tsx`: `mb-4`, title `text-xl md:text-2xl`.
- Check in the browser at 943x532 and 1280-wide viewports.

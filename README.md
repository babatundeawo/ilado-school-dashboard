# ISCGS Register — Presentation Build (v2)

A multi-page, light-themed, mobile-friendly dashboard preloaded with Ilado-Sagbo Community Grammar School's real records — student registry, e-results, marking sheets, staff roll, and retirement/handover history. Ready for the presentation to the education officials: just double-click `index.html`.

## What changed in this version

- **Nigerian green & white theme.** The palette is now built around Nigeria's national green (deep green brand mark, active nav states, primary buttons, chart bars, class-size bars) on crisp white and soft green-tinted surfaces, with gold kept as a restrained secondary accent for ceremonial/premium touches, and the red exercise-book margin-rule kept as the one deliberate non-green accent.
- **Deeper responsiveness.** An added tablet breakpoint tightens spacing before the mobile layout kicks in; page titles and stat numbers now scale fluidly with the viewport instead of jumping between fixed sizes; touch targets (nav items, buttons) are larger on mobile; tables get a subtle fade hint on their scrollable edge; and small-phone layouts stack search fields and buttons to full width instead of cramming them.

- **Separate pages, not one app.** Each section is now its own HTML file (`index.html`, `students.html`, `results.html`, `marking.html`, `staff.html`, `retirement.html`, `import.html`) with its own small page-specific script in `js/pages/`. Shared code (`db.js`, `parsers.js`, `common.js`, `data.js`) is loaded once per page from `js/`.
- **Modular CSS.** `css/tokens.css` holds the design tokens (colors, fonts), `css/base.css` holds shared layout/components, and `css/pages/*.css` holds the handful of rules unique to each page.
- **Light theme.** Warm ivory surfaces, deep ink-navy text, restrained gold and teal accents, with the red margin-rule from Nigerian exercise books as the recurring structural motif.
- **Mobile-friendly.** Below ~880px the sidebar becomes a proper off-canvas menu (tap the ☰ icon), tables scroll horizontally, and cards/stat grids reflow to one or two columns.
- **New: Retirement & Handover page.** School history, the full succession of principals since 2005, the two 2026 retirement ceremonies (Mr Adeoti Oladejo Kolawole and Mr Ogundiran Ogunsola), and the handover to the incoming principal — pulled from the documents in your `RETIREMENT` folder. Bank account numbers on this page are blurred by default, same as staff contact details elsewhere.
- **Duplicate and bad data cleaned up.** The student registry workbook listed every student twice (once on a "GENERAL" summary sheet, once on their own class sheet) — that's fixed, so the count dropped from 1,614 to the correct **806**. A handful of result-sheet rows also had leftover template-formula artifacts (literal `0`s and broken `#REF!`/`#ERROR!` cells from the original workbooks) which are now filtered out instead of showing up as junk entries. Class labels are now read consistently from each file rather than the messier, occasionally-typo'd in-sheet class column.
- **Latest marking sheet merged in.** The newer marking workbook you sent (with 3rd-term data) has been merged with the original — 3rd term is new, and its 1st-term figures replaced the earlier version's for the classes it covers.

## ⚠️ This build contains real data — keep it local

`js/data.js` contains your students' and staff's actual names, grades, attendance, and (for staff) phone numbers, emails, addresses and dates of birth, in plain text. The Retirement page also contains a retiring principal's date of birth and family background (from the printed ceremony programme) and the school's bank account numbers (blurred by default).

**Because of that:**
- **Do not** upload this folder to GitHub (public or private), Google Drive shared links, WeTransfer, or anywhere outside the school.
- **Do not** publish this with GitHub Pages or any other hosting.
- Keep it on your laptop, for this presentation and similar internal use.

## How to use it

1. Copy the whole folder onto the laptop you'll present from.
2. Double-click `index.html`. Everything is already loaded — no import step.
3. Use the sidebar (or the ☰ menu on mobile/tablet) to move between Overview, Student Registry, E-Results, Marking Sheets, Staff Directory, Retirement & Handover, and Import Data.
4. Staff contact details and the handover bank account numbers are blurred by default — click "👁 Reveal" only if you need to show them.

If double-clicking `index.html` gives your browser trouble with local files, run this from inside the folder and open `http://localhost:8000`:

```
python3 -m http.server 8000
```

## Updating data later

Go to **Import Data**. Drop in an updated workbook (e.g. next term's e-results or an updated marking sheet) — it replaces just that file's records. You can also drop several files at once on the "drop everything here" zone and the app will figure out which is which.

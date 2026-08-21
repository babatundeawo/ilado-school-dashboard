# ISCGS Register v2

A ground-up rebuild of the Ilado-Sagbo Community Grammar School dashboard: a
modern, multi-page, fully offline site covering the student registry, staff
directory, term and continuous-assessment coverage, the school's full
profile, the 2026 retirement and handover, an events/speeches archive, and
the complete property and library inventory.

## IMPORTANT: keep this local

This is a **private, local-only tool**. `js/data.js` contains real information:
student names and classes, staff phone numbers, emails, home addresses, dates
of birth, and the school's bank account numbers. Do **not**:

- upload this folder to GitHub (public or private),
- publish it with GitHub Pages or any other web host,
- email or share the folder outside people who should see this data.

Keep it on your own computer. Open `index.html` by double-clicking it, or
serve the folder locally (`python3 -m http.server` from inside this folder,
then visit `http://localhost:8000`) if your browser restricts local file
access for the Import page.

## Passcode lock

Every page now opens behind a passcode screen (`js/lock.js` +
`js/lock-config.js`). A starter passcode was set for you when this was
built — check the chat where you received this file. To set your own:

1. Open `assets/set-passcode.html` in your browser.
2. Enter and confirm a new passcode, click **Generate config**.
3. Copy the two lines it gives you into `js/lock-config.js`, replacing the
   existing `LOCK_SALT` and `LOCK_HASH`.
4. Save. The new passcode is active immediately, no rebuild needed.

Only the salted SHA-256 **hash** of your passcode is stored in the file —
never the passcode itself. This is a UI gate for a single-user local tool,
not encryption: real protection still comes from keeping this folder off
any public host and the GitHub repo private, as above. Unlocking lasts for
your browser session (closing the browser locks it again); five wrong
attempts trigger a 60-second cooldown.

## What changed from the previous build

- **Fully separated pages, styles and scripts.** Ten pages
  (`index`, `about`, `students`, `results`, `marking`, `staff`, `retirement`,
  `events`, `resources`, `import`), each with its own `css/pages/<name>.css`
  and `js/pages/<name>.js`, on top of a shared `tokens.css` design system and
  `base.css` shell.
- **New design system.** Light and dark themes, a collapsible/mobile sidebar,
  a command palette (Ctrl/Cmd+K) that searches pages, students and staff,
  animated stat counters, sortable/filterable tables, and print styles.
- **Two new pages.** *Events & Speeches* (an archive of official school
  addresses) and *Inventory & Library* (the full property inventory and
  226-title library catalogue from the 2026 handover notes).
- **School Profile and Retirement & Handover pages are now complete.** They
  include the school's full history, curriculum, PTA and SGB membership,
  statutory records, infrastructure, both 2026 retirement ceremonies in
  full (including the outgoing Principal's full career history and the
  ceremony order of programme for both retirees), and the handover accounts
  and staffing.
- **No em or en dashes anywhere on the site**, including inside the
  imported source documents; they were replaced with clearer phrasing
  (for example "1991 to 2000" instead of "1991\u20132000").
- **Student assessment scores have been removed throughout.** The *Term
  Records* and *Continuous Assessment* pages now show only attendance,
  subject coverage, and whether a C.A. record exists on file (Complete /
  Partial / Not started). No mark, total, or average appears anywhere on
  this site. Everything else from the source files has been kept in full,
  including staff contact details, which are shown unmasked in this local
  build.
- **The Import page still works exactly as before**, so you can refresh the
  student, results, marking or staff data at any time by dropping in new
  workbooks; the School Profile, Retirement, Events and Inventory pages are
  static content and are not affected by imports.

## Structure

```
index.html        Overview / dashboard
about.html         School profile: history, curriculum, PTA, SGB, needs
students.html       Student registry (search, filter, export)
results.html        Term records: attendance and subject coverage, no scores
marking.html        Continuous assessment coverage, no scores
staff.html           Staff directory: teaching, non-teaching, corps, PTA-appointed
retirement.html      2026 retirement ceremonies and handover, in full
events.html          Archive of official school speeches
resources.html        Full property inventory and library catalogue
import.html          Import or refresh workbooks

css/tokens.css        Design tokens (colours, type, spacing, light/dark)
css/base.css           Shared shell, nav, cards, tables, drawer, command palette
css/pages/*.css        Page-specific overrides

js/data.js              Preloaded data (real information, see warning above)
js/db.js                 Local-storage wrapper
js/common.js             Shared utilities (toast, drawer, exports, theme)
js/nav.js                Sidebar wiring, theme toggle, command palette
js/parsers.js             Workbook parsing (unchanged from the previous build)
js/pages/*.js              One renderer per page
```

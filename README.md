# ISCGS Register — Presentation Build

This copy is preloaded with your school's actual records (student registry, e-results, marking sheets, staff roll), parsed straight from the workbooks you gave me. It opens with everything already in place — nothing to import, nothing to click through — ready for the presentation to the education officials.

## ⚠️ This build contains real data — keep it local

`js/data.js` in this folder contains your students' and staff's actual names, grades, attendance, and (for staff) phone numbers, emails, addresses and dates of birth, written out in plain text.

**Because of that:**

- **Do not** upload this folder to GitHub (public *or* private — see note below), Google Drive shared links, WeTransfer, email attachments to anyone outside the school, or any other hosting/sharing service.
- **Do not** publish this build with GitHub Pages. If you still want a public portfolio-style site later, use the earlier "no preloaded data" version instead, where each visitor imports their own copy locally.
- Keep this folder on your laptop only. If you back up your laptop to cloud storage, that's normal and fine — the concern is specifically about *publishing* or *publicly sharing* this folder.
- When you're done presenting, if you don't need this specific copy anymore, feel free to delete it.

*(On private repos: even a "Private" GitHub repository requires a paid plan to use with GitHub Pages, and the moment Pages publishes it, the live site is public regardless of the repo's visibility — private repos don't create a private website. That's why the safest option for real data is simply: don't publish it anywhere, keep it as local files.)*

## How to use it for the presentation

1. Copy this whole folder onto the laptop you'll present from.
2. Double-click `index.html` — it opens in your default browser with everything already loaded: Overview, Student Registry, E-Results, Marking Sheets, and Staff Directory.
3. Staff phone numbers, emails, addresses and dates of birth are blurred by default in the Staff Directory — click "👁 Reveal sensitive fields" only if you actually need to show them to the officials.
4. No internet connection is required for the data itself (it's all local), though the page does load its fonts and chart library from the internet the first time — if you'll be presenting somewhere with no wifi, open it once beforehand while online so your browser caches those.

If double-clicking `index.html` gives your browser trouble loading local files, run this from inside the folder instead and then open `http://localhost:8000`:

```
python3 -m http.server 8000
```

## If you need to update the data later

Go to the **Import Data** page — it still works exactly as before. Drop in an updated workbook (e.g. next term's e-results) and it replaces just that file's records, leaving everything else as-is. Updates are saved in that browser's local storage on that machine only.

## What's in each section

| Section | Source | What you'll see |
|---|---|---|
| Overview | all files | Total students, staff, class sizes, gender split, recent imports |
| Student Registry | student registry workbook | Full roll, searchable/filterable by class and gender, CSV export |
| E-Results | per-class result workbooks | Subject-average chart and per-student report breakdown, by class and term |
| Marking Sheets | CA marking workbook | Attendance, notebook, textbook, exam and total-score table |
| Staff Directory | staff nominal roll | Teaching / Non-teaching / Corps lists, sensitive fields blurred by default |

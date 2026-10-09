import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc, dash, $, debounce } from "../lib/util.js";
import { skeleton, emptyState, errorState, finishRender, openDrawer, kvRows, bar } from "../lib/ui.js";
import { dataTable } from "../lib/datatable.js";
import { exportGoogleContactsCsv } from "../lib/contacts.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

const COLUMNS = {
  teaching: [["full_name_of_staff", "Name"], ["gender", "Gender"], ["present_post_prinpal_supervisor_vice_principal_tutor", "Post"], ["main_subject_taught_consider_degree_cert", "Main subject"], ["grade", "Grade"], ["step", "Step"], ["date_of_retirement_dd_mm_yyyy", "Retirement date"], ["gsm_no", "GSM"], ["email_address", "Email"]],
  nonTeaching: [["full_name", "Name"], ["gender", "Gender"], ["job_title", "Job title"], ["grade", "Grade"], ["step", "Step"], ["date_of_retirement", "Retirement date"], ["gsm_whatsapp_no_only", "GSM"]],
  corps: [["full_name", "Name"], ["gender", "Gender"], ["classes_taught", "Classes taught"], ["teaching_subject_s", "Subject(s)"], ["gsm_whatsapp_no_only", "GSM"]],
  ptaAppointed: [["Name", "Name"], ["Post Held", "Post"], ["Subject Taught", "Subject(s)"], ["Qualification", "Qualification"]]
};
const LABELS = { teaching: "Teaching", ptaAppointed: "P.T.A.-appointed", nonTeaching: "Non-teaching", corps: "Corps members" };

/** Retirement dates arrive in mixed formats; normalise before sorting. */
function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += y < 50 ? 2000 : 1900; return new Date(y, +m[2] - 1, +m[1]); }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

try {
  const staff = await loadDataset("staff");
  const lists = { teaching: staff?.teaching || [], ptaAppointed: staff?.ptaAppointed || [], nonTeaching: staff?.nonTeaching || [], corps: staff?.corps || [] };
  const total = Object.values(lists).reduce((n, l) => n + l.length, 0);
  if (!total) {
    root.innerHTML = emptyState("No staff roll yet", "The staff directory hasn't been loaded.", isAdmin);
  } else {
    const grades = {};
    lists.teaching.forEach((t) => { const g = t.grade || "Unspecified"; grades[g] = (grades[g] || 0) + 1; });
    const gradeKeys = Object.keys(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const gmax = Math.max(1, ...Object.values(grades));
    const next = lists.teaching.map((t) => ({ name: t.full_name_of_staff, raw: t.date_of_retirement_dd_mm_yyyy, date: parseDate(t.date_of_retirement_dd_mm_yyyy) }))
      .filter((t) => t.date).sort((a, b) => a.date - b.date).slice(0, 4);

    root.innerHTML = `
      <section class="card card-pad row row-between" aria-label="Export">
        <div class="stack tight"><h2>Export to Google Contacts</h2>
          <p class="fine">Downloads one CSV with each staff member's phone, email, address, birthday, post and department, in Google's contact import format.</p></div>
        <button class="btn btn-primary" id="gcBtn" type="button">Export CSV for Google Contacts</button>
      </section>
      <div class="grid-2">
        <section class="card" aria-labelledby="gradeTitle"><div class="card-head"><div><h2 id="gradeTitle">Staff by grade level</h2><p>Teaching staff, grouped by grade</p></div></div>
          <div class="card-body"><div class="bars">${gradeKeys.map((g) => bar(g, grades[g], gmax, { brass: true })).join("")}</div></div></section>
        <section class="card card-pad stack" aria-labelledby="glanceTitle"><h2 id="glanceTitle">Staffing at a glance</h2>
          <div class="glance">${Object.keys(LABELS).map((k) => `<div><strong>${lists[k].length}</strong><span>${LABELS[k]}</span></div>`).join("")}</div>
          <p class="section-title">Next to retire</p>
          ${next.length ? kvRows(next.map((t) => [t.name, esc(t.raw)])) : `<p class="fine">No retirement dates on file.</p>`}
        </section>
      </div>
      <section class="card" aria-label="Staff records">
        <div class="toolbar">
          <div class="field"><label for="fType">Category</label><select class="select" id="fType">${Object.keys(LABELS).map((k) => `<option value="${k}">${LABELS[k]} (${lists[k].length})</option>`).join("")}</select></div>
          <div class="field field-grow"><label for="fSearch">Search</label><input class="input" id="fSearch" type="search" placeholder="Search by name" autocomplete="off"></div>
        </div>
        <div id="tableMount"></div>
      </section>`;

    $("#gcBtn").addEventListener("click", () => exportGoogleContactsCsv(lists));

    const showRecord = (rec, type) => {
      const cols = COLUMNS[type];
      const shown = new Set(cols.map((c) => c[0]));
      const extra = Object.entries(rec).filter(([k, v]) => k !== "_source" && !shown.has(k) && v !== null && v !== "");
      openDrawer(rec[cols[0][0]] || "Staff record", `${kvRows(cols.map(([k, l]) => [l, dash(rec[k])]))}
        ${extra.length ? `<p class="section-title">All other fields on record</p>${kvRows(extra.map(([k, v]) => [k.replace(/_/g, " "), dash(v)]))}` : ""}`);
    };

    let table;
    const build = () => {
      const type = $("#fType").value;
      const cols = COLUMNS[type];
      table = dataTable($("#tableMount"), {
        caption: `${LABELS[type]} staff`,
        onRowClick: (r) => showRecord(r, type),
        columns: [...cols.map(([k, l]) => ({ label: l, html: (r) => dash(r[k]), value: (r) => r[k] })), { label: "", html: () => `<span class="pill pill-brass">View</span>` }]
      });
      apply();
    };
    const apply = () => {
      const type = $("#fType").value, key = COLUMNS[type][0][0], q = $("#fSearch").value.trim().toLowerCase();
      table.setRows(lists[type].filter((r) => !q || String(r[key] || "").toLowerCase().includes(q)));
    };
    $("#fType").addEventListener("change", build);
    $("#fSearch").addEventListener("input", debounce(apply, 100));
    const q = new URLSearchParams(location.search).get("q");
    if (q) $("#fSearch").value = q;
    build();
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

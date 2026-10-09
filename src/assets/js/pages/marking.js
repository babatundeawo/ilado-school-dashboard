import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc, uniq, dash, $, debounce } from "../lib/util.js";
import { skeleton, emptyState, errorState, finishRender } from "../lib/ui.js";
import { dataTable, options } from "../lib/datatable.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();
const PILL = { Complete: "pill-green", Partial: "pill-gold", "Not started": "" };

try {
  const marking = await loadDataset("marking");
  if (!marking?.length) {
    root.innerHTML = emptyState("No marking sheets yet", "Continuous assessment coverage hasn't been loaded.", isAdmin);
  } else {
    const classes = uniq(marking.map((m) => m.class)).sort();
    const terms = uniq(marking.map((m) => m.term)).sort();
    const n = (s) => marking.filter((m) => m.status === s).length;
    root.innerHTML = `
      <div class="alert" role="note">This page shows <strong>record coverage only</strong>: whether each student has a continuous assessment entry on file for the term. Marks are not stored in this system and never appear here.</div>
      <div class="stats">
        <div class="card stat"><span class="stat-label">Complete records</span><span class="stat-value" data-count="${n("Complete")}">0</span><span class="stat-note">all six criteria on file</span></div>
        <div class="card stat"><span class="stat-label">Partial records</span><span class="stat-value" data-count="${n("Partial")}">0</span><span class="stat-note">some criteria missing</span></div>
        <div class="card stat"><span class="stat-label">Not started</span><span class="stat-value" data-count="${n("Not started")}">0</span><span class="stat-note">no criteria on file yet</span></div>
      </div>
      <section class="card card-pad stack">
        <h2>Assessment rubric on file</h2>
        <p class="fine">The categories used by the school's marking sheet, for reference. No values are shown.</p>
        <div class="pills">${["Attendance", "Notebook", "Open Day", "Textbook", "School-based test", "Teacher-based test", "C.A. total (first half + second half)", "Examination"].map((c) => `<span class="pill">${c}</span>`).join("")}</div>
      </section>
      <section class="card" aria-label="Continuous assessment records">
        <div class="toolbar">
          <div class="field"><label for="fClass">Class</label><select class="select" id="fClass">${options(classes, "All classes")}</select></div>
          <div class="field"><label for="fTerm">Term</label><select class="select" id="fTerm">${options(terms, "All terms")}</select></div>
          <div class="field"><label for="fStatus">Status</label><select class="select" id="fStatus">${options(["Complete", "Partial", "Not started"], "All")}</select></div>
          <div class="field field-grow"><label for="fSearch">Search</label><input class="input" id="fSearch" type="search" placeholder="Search by name" autocomplete="off"></div>
        </div>
        <div id="tableMount"></div>
      </section>`;

    const table = dataTable($("#tableMount"), {
      rows: marking,
      caption: "Continuous assessment records", pageSize: 100,
      columns: [
        { label: "Name", html: (m) => esc(m.name), value: (m) => m.name },
        { label: "Class", html: (m) => `<span class="pill">${esc(m.class)}</span>`, value: (m) => m.class },
        { label: "Term", html: (m) => dash(m.term), value: (m) => m.term },
        { label: "Gender", html: (m) => dash(m.gender), value: (m) => m.gender },
        { label: "Record status", html: (m) => `<span class="pill ${PILL[m.status] || ""}">${esc(m.status)}</span>`, value: (m) => m.status }
      ]
    });
    const apply = () => {
      const c = $("#fClass").value, t = $("#fTerm").value, s = $("#fStatus").value, q = $("#fSearch").value.trim().toLowerCase();
      table.setRows(marking.filter((m) => (!c || m.class === c) && (!t || m.term === t) && (!s || m.status === s) && (!q || (m.name || "").toLowerCase().includes(q))));
    };
    ["fClass", "fTerm", "fStatus"].forEach((id) => $("#" + id).addEventListener("change", apply));
    $("#fSearch").addEventListener("input", debounce(apply, 100));
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

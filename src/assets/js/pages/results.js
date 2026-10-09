import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc, uniq, dash, $, debounce } from "../lib/util.js";
import { skeleton, emptyState, errorState, finishRender, bar } from "../lib/ui.js";
import { dataTable, options } from "../lib/datatable.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

const pct = (r) => (r.timesOpened ? Math.round(((r.timesPresent || 0) / r.timesOpened) * 100) : null);

try {
  const results = await loadDataset("results");
  if (!results?.length) {
    root.innerHTML = emptyState("No term records yet", "Attendance and subject coverage haven't been loaded.", isAdmin);
  } else {
    const classes = uniq(results.map((r) => r.class)).sort();
    const terms = uniq(results.map((r) => r.term)).sort();
    const byClass = {};
    results.forEach((r) => { const p = pct(r); if (p !== null) (byClass[r.class] ||= []).push(p); });
    const avg = Object.entries(byClass).map(([c, v]) => [c, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

    root.innerHTML = `
      <div class="alert" role="note">This page shows <strong>attendance and subject coverage only</strong>. Continuous assessment and examination marks are not stored in this system and never appear here.</div>
      <section class="card" aria-labelledby="attTitle">
        <div class="card-head"><div><h2 id="attTitle">Average attendance by class</h2><p>Share of school days each class was present, where recorded</p></div></div>
        <div class="card-body"><div class="bars">${avg.map(([c, v]) => bar(c, v, 100)).join("") || `<p class="fine">No attendance figures were recorded in the loaded files.</p>`}</div></div>
      </section>
      <section class="card" aria-label="Term records">
        <div class="toolbar">
          <div class="field"><label for="fClass">Class</label><select class="select" id="fClass">${options(classes, "All classes")}</select></div>
          <div class="field"><label for="fTerm">Term</label><select class="select" id="fTerm">${options(terms, "All terms")}</select></div>
          <div class="field field-grow"><label for="fSearch">Search</label><input class="input" id="fSearch" type="search" placeholder="Search by name" autocomplete="off"></div>
        </div>
        <div id="tableMount"></div>
      </section>`;

    const table = dataTable($("#tableMount"), {
      rows: results,
      caption: "Term records",
      pageSize: 100,
      columns: [
        { label: "Name", html: (r) => esc(r.name), value: (r) => r.name },
        { label: "Class", html: (r) => `<span class="pill">${esc(r.class)}</span>`, value: (r) => r.class },
        { label: "Term", html: (r) => esc(r.term), value: (r) => r.term },
        { label: "Admission No.", html: (r) => dash(r.admissionNo), value: (r) => r.admissionNo },
        { label: "Attendance", html: (r) => { const p = pct(r); return p === null ? "\u2014" : `<span class="pill ${p >= 75 ? "pill-green" : p >= 50 ? "pill-gold" : "pill-red"}">${p}%</span>`; }, value: (r) => pct(r) ?? -1 },
        { label: "Subjects covered", html: (r) => (r.subjects || []).length ? `<div class="pills">${r.subjects.map((s) => `<span class="pill pill-blue">${esc(s)}</span>`).join("")}</div>` : "\u2014" }
      ]
    });
    const apply = () => {
      const c = $("#fClass").value, t = $("#fTerm").value, q = $("#fSearch").value.trim().toLowerCase();
      table.setRows(results.filter((r) => (!c || r.class === c) && (!t || r.term === t) && (!q || (r.name || "").toLowerCase().includes(q))));
    };
    $("#fClass").addEventListener("change", apply);
    $("#fTerm").addEventListener("change", apply);
    $("#fSearch").addEventListener("input", debounce(apply, 100));
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

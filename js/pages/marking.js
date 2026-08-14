/* =========================================================
   marking.js — renders the Continuous Assessment page. Shows
   only whether a student has a C.A. record on file (Complete,
   Partial, Not started); no marks or numbers ever appear.
   ========================================================= */
(() => {
  const { esc, uniq } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  if(!data.marking.length){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">\u{1F4CB}</div>
        <h3>No marking sheets imported</h3>
        <p>Import the marking sheet workbook to see continuous assessment coverage here.</p>
        <a class="btn btn-gold" href="import.html">Import marking sheet</a>
      </div>`;
    return;
  }

  const classes = uniq(data.marking.map(m=>m.class)).sort();
  const terms = uniq(data.marking.map(m=>m.term)).sort();
  const complete = data.marking.filter(m=>m.status==="Complete").length;
  const partial = data.marking.filter(m=>m.status==="Partial").length;
  const notStarted = data.marking.filter(m=>m.status==="Not started").length;

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px">
      <p class="lede">This page shows record <strong>coverage only</strong>, whether each student has a continuous assessment entry on file for the term. Attendance, notebook, open day, textbook, school-based, teacher-based, C.A. and examination marks are deliberately excluded and do not appear anywhere on this site.</p>
    </div>
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="label">Complete records</div><div class="value" data-count="${complete}">0</div><div class="delta">all six criteria on file</div></div>
      <div class="stat-card"><div class="label">Partial records</div><div class="value" data-count="${partial}">0</div><div class="delta muted">some criteria missing</div></div>
      <div class="stat-card"><div class="label">Not started</div><div class="value" data-count="${notStarted}">0</div><div class="delta muted">no criteria on file yet</div></div>
    </div>
    <div class="card">
      <div class="card-head">
        <div><h2>Assessment rubric on file</h2><p>The categories used by the school's marking sheet, for reference. No values are shown.</p></div>
      </div>
      <div class="card-pad" style="padding-top:8px">
        ${["Attendance","Notebook","Open Day","Textbook","School-based test","Teacher-based test","C.A. total (first half + second half)","Examination"].map(c=>`<span class="pill pill-muted" style="margin:3px">${c}</span>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <div class="controls-row">
        <div class="field"><label>Class</label><select id="mkClassFilter"><option value="">All classes</option>${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></div>
        <div class="field"><label>Term</label><select id="mkTermFilter"><option value="">All terms</option>${terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></div>
        <div class="field"><label>Status</label><select id="mkStatusFilter"><option value="">All</option><option>Complete</option><option>Partial</option><option>Not started</option></select></div>
        <div class="field" style="flex:1;min-width:200px"><label>Search</label><input type="search" id="mkSearch" placeholder="Search by name\u2026"></div>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="mkTable">
          <thead><tr><th>Name</th><th>Class</th><th>Term</th><th>Gender</th><th>Record status</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  const pillClass = { "Complete":"pill-green", "Partial":"pill-gold", "Not started":"pill-muted" };

  function renderRows(){
    const classF = document.getElementById("mkClassFilter").value;
    const termF = document.getElementById("mkTermFilter").value;
    const statusF = document.getElementById("mkStatusFilter").value;
    const q = document.getElementById("mkSearch").value.toLowerCase();
    const rows = data.marking.filter(m =>
      (!classF || m.class===classF) && (!termF || m.term===termF) &&
      (!statusF || m.status===statusF) && (!q || (m.name||"").toLowerCase().includes(q))
    );
    document.querySelector("#mkTable tbody").innerHTML = rows.map(m => `
      <tr>
        <td>${esc(m.name)}</td>
        <td><span class="pill pill-muted">${esc(m.class)}</span></td>
        <td>${esc(m.term)}</td>
        <td>${esc(m.gender||"\u2014")}</td>
        <td><span class="pill ${pillClass[m.status]||''}">${esc(m.status)}</span></td>
      </tr>`).join("") || `<tr><td colspan="5" style="color:var(--ink-600)">No records match these filters.</td></tr>`;
  }

  ["mkClassFilter","mkTermFilter","mkStatusFilter"].forEach(id => document.getElementById(id).addEventListener("change", renderRows));
  document.getElementById("mkSearch").addEventListener("input", renderRows);
  renderRows();
  Common.wireCounters();
})();

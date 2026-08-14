/* =========================================================
   students.js — renders the Student Registry page.
   ========================================================= */
(() => {
  const { esc, uniq, exportCsv } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  if(!data.students.length){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">\u{1F9D1}\u200D\u{1F393}</div>
        <h3>No student registry imported</h3>
        <p>Import your class-by-class or general student registry workbook to see the full roll here.</p>
        <a class="btn btn-gold" href="import.html">Import student registry</a>
      </div>`;
    return;
  }

  const classes = uniq(data.students.map(s=>s.class)).sort();

  root.innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="label">Total students</div><div class="value" data-count="${data.students.length}">0</div></div>
      <div class="stat-card"><div class="label">Classes</div><div class="value" data-count="${classes.length}">0</div></div>
      <div class="stat-card"><div class="label">Male / Female</div><div class="value" style="font-size:22px">${data.students.filter(s=>(s.gender||"").startsWith("M")).length} / ${data.students.filter(s=>(s.gender||"").startsWith("F")).length}</div></div>
    </div>
    <div class="card">
      <div class="controls-row">
        <div class="field">
          <label>Class</label>
          <select id="stuClassFilter"><option value="">All classes</option>
            ${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Gender</label>
          <select id="stuGenderFilter"><option value="">All</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
        </div>
        <div class="field" style="flex:1;min-width:200px">
          <label>Search</label>
          <input type="search" id="stuSearch" placeholder="Search by name\u2026">
        </div>
        <button class="btn btn-ghost btn-sm" id="stuExportBtn" style="align-self:flex-end">Export CSV</button>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="stuTable">
          <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Gender</th><th>Comment</th><th>Source</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  function renderRows(){
    const classF = document.getElementById("stuClassFilter").value;
    const genderF = document.getElementById("stuGenderFilter").value;
    const q = document.getElementById("stuSearch").value.toLowerCase();
    const rows = data.students.filter(s =>
      (!classF || s.class===classF) &&
      (!genderF || (s.gender||"").toUpperCase()===genderF) &&
      (!q || s.name.toLowerCase().includes(q))
    );
    document.querySelector("#stuTable tbody").innerHTML = rows.map((s,i) => `
      <tr>
        <td>${i+1}</td><td>${esc(s.name)}</td>
        <td><span class="pill pill-muted">${esc(s.class)}</span></td>
        <td>${esc(s.gender||"\u2014")}</td><td>${esc(s.comment||"\u2014")}</td>
        <td style="color:var(--ink-400);font-size:11.5px">${esc(s.source)}</td>
      </tr>`).join("") || `<tr><td colspan="6" style="color:var(--ink-600)">No students match these filters.</td></tr>`;
    return rows;
  }

  ["stuClassFilter","stuGenderFilter"].forEach(id => document.getElementById(id).addEventListener("change", renderRows));
  document.getElementById("stuSearch").addEventListener("input", renderRows);
  document.getElementById("stuExportBtn").addEventListener("click", () => exportCsv(renderRows(), "student_registry.csv"));
  renderRows();
  Common.wireCounters();
})();

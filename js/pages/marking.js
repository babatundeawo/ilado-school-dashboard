/* =========================================================
   marking.js — renders the Marking Sheets page.
   ========================================================= */
(() => {
  const { esc, uniq } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  if(!data.marking.length){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">📝</div>
        <h3>No marking sheets imported</h3>
        <p>Import your CA marking sheet workbook to see attendance, notebook, textbook and exam scores per class.</p>
        <a class="btn btn-gold" href="import.html">Import marking sheet</a>
      </div>`;
    return;
  }

  const classes = uniq(data.marking.map(m=>m.class)).sort();
  root.innerHTML = `
    <div class="card">
      <div class="controls-row">
        <div class="field"><label>Class</label>
          <select id="mkClassFilter">${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Term</label><select id="mkTermFilter"></select></div>
        <div class="field" style="flex:1;min-width:200px"><label>Search</label>
          <input type="search" id="mkSearch" placeholder="Search by name…">
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="mkTable">
          <thead><tr>
            <th>Name</th><th>Gender</th><th>Attend.</th><th>Notebook</th><th>Openday</th><th>Textbook</th>
            <th>School base</th><th>Teacher base</th><th>CA Total</th><th>CA/2</th><th>Exam</th><th>Total</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  function refreshTermOptions(){
    const cls = document.getElementById("mkClassFilter").value;
    const terms = uniq(data.marking.filter(m=>m.class===cls).map(m=>m.term));
    document.getElementById("mkTermFilter").innerHTML = terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
  }

  function renderRows(){
    const cls = document.getElementById("mkClassFilter").value;
    const term = document.getElementById("mkTermFilter").value;
    const q = document.getElementById("mkSearch").value.toLowerCase();
    const rows = data.marking.filter(m => m.class===cls && m.term===term && (!q || m.name.toLowerCase().includes(q)))
      .sort((a,b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
    const cell = v => v===null||v===undefined ? "—" : v;
    document.querySelector("#mkTable tbody").innerHTML = rows.map(m => `
      <tr>
        <td>${esc(m.name)}</td><td>${esc(m.gender||"—")}</td>
        <td>${cell(m.attendance)}</td><td>${cell(m.notebook)}</td><td>${cell(m.openday)}</td><td>${cell(m.textbook)}</td>
        <td>${cell(m.schoolBase)}</td><td>${cell(m.teacherBase)}</td><td>${cell(m.caTotal)}</td><td>${cell(m.caHalf)}</td>
        <td>${cell(m.exam)}</td><td><strong>${cell(m.totalScore)}</strong></td>
      </tr>`).join("") || `<tr><td colspan="12" style="color:var(--ink-600)">No records match these filters.</td></tr>`;
  }

  document.getElementById("mkClassFilter").addEventListener("change", () => { refreshTermOptions(); renderRows(); });
  document.getElementById("mkTermFilter").addEventListener("change", renderRows);
  document.getElementById("mkSearch").addEventListener("input", renderRows);
  refreshTermOptions();
  renderRows();
})();

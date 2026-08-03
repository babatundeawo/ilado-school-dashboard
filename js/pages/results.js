/* =========================================================
   results.js — renders the E-Results page.
   ========================================================= */
(() => {
  const { esc, uniq, openDrawer, kvRows } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");
  let chart;

  if(!data.results.length){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">📊</div>
        <h3>No e-results imported</h3>
        <p>Import a class result workbook (the ones with 1ST/2ND/3RD TERM Db sheets) to see subject performance and per-student report data.</p>
        <a class="btn btn-gold" href="import.html">Import e-results</a>
      </div>`;
    return;
  }

  const classes = uniq(data.results.map(r=>r.class)).sort();
  root.innerHTML = `
    <div class="card chart-card" style="margin-bottom:18px">
      <div class="controls-row">
        <div class="field"><label>Class</label>
          <select id="resClassFilter">${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Term</label><select id="resTermFilter"></select></div>
        <div class="field" style="flex:1;min-width:200px"><label>Search student</label>
          <input type="search" id="resSearch" placeholder="Search by name or admission no…">
        </div>
      </div>
      <div class="card-pad"><canvas id="resSubjectChart" height="90"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Student results</h2><p>Click a row to see the full subject breakdown</p></div></div>
      <div class="table-wrap">
        <table class="data-table" id="resTable">
          <thead><tr><th>#</th><th>Name</th><th>Adm. No</th><th>Gender</th><th>Attendance</th><th>Overall Avg</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  function refreshTermOptions(){
    const cls = document.getElementById("resClassFilter").value;
    const terms = uniq(data.results.filter(r=>r.class===cls).map(r=>r.term));
    document.getElementById("resTermFilter").innerHTML = terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
  }

  function studentAverage(rec){
    const totals = rec.subjects.map(s=>s.total).filter(v=>typeof v==="number");
    return totals.length ? totals.reduce((a,b)=>a+b,0)/totals.length : null;
  }

  function showDrawer(rec){
    const avg = studentAverage(rec);
    const subjRows = rec.subjects.map(s => `<div class="kv-row"><span>${esc(s.subject)}</span><span>${s.total ?? "—"} <span style="color:var(--ink-400);font-weight:400">(CA ${s.ca ?? "—"} · Exam ${s.exam ?? "—"})</span></span></div>`).join("");
    openDrawer(rec.name, `
      ${kvRows([
        ["Admission No.", esc(rec.admissionNo||"—")],
        ["Class", esc(rec.class)],
        ["Term", esc(rec.term||"—")],
        ["Attendance", rec.timesOpened ? `${rec.timesPresent}/${rec.timesOpened} days` : "—"],
        ["Overall average", avg!==null ? avg.toFixed(1) : "—"],
      ])}
      <h3 style="margin:18px 0 6px;font-size:14px">Subject scores</h3>
      ${subjRows || `<p style="color:var(--ink-600);font-size:13px">No subject data on this record.</p>`}
    `);
  }

  function renderRows(){
    const cls = document.getElementById("resClassFilter").value;
    const term = document.getElementById("resTermFilter").value;
    const q = document.getElementById("resSearch").value.toLowerCase();
    const rows = data.results.filter(r => r.class===cls && r.term===term &&
      (!q || r.name.toLowerCase().includes(q) || (r.admissionNo||"").toLowerCase().includes(q)));

    const subjectNames = uniq(rows.flatMap(r=>r.subjects.map(s=>s.subject)));
    const subjectAverages = subjectNames.map(name => {
      const vals = rows.map(r => r.subjects.find(s=>s.subject===name)?.total).filter(v=>typeof v==="number");
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    });
    if(chart) chart.destroy();
    chart = new Chart(document.getElementById("resSubjectChart"), {
      type: "bar",
      data: { labels: subjectNames, datasets: [{ label: "Class average (this term)", data: subjectAverages, backgroundColor: "#c0912e", borderRadius: 5 }] },
      options: {
        responsive:true,
        plugins:{ legend:{ display:false }, title:{ display:true, text:`${cls} — ${term}`, color:"#12182a", font:{ family:"Inter", size:12, weight:"600" } } },
        scales:{ y:{ beginAtZero:true, max:100, grid:{ color:"#eee9dc" } }, x:{ grid:{ display:false } } }
      }
    });

    const tbody = document.querySelector("#resTable tbody");
    tbody.innerHTML = rows.map((r,i) => {
      const avg = studentAverage(r);
      const pct = r.timesOpened ? Math.round((r.timesPresent/r.timesOpened)*100) : null;
      return `
      <tr data-idx="${i}" style="cursor:pointer">
        <td>${r.sn ?? i+1}</td><td>${esc(r.name)}</td><td>${esc(r.admissionNo||"—")}</td>
        <td>${esc(r.gender||"—")}</td><td>${pct!==null ? pct+"%" : "—"}</td>
        <td><span class="pill ${avg>=50?'pill-teal':avg!==null?'pill-red':'pill-muted'}">${avg!==null?avg.toFixed(1):"—"}</span></td>
      </tr>`;
    }).join("") || `<tr><td colspan="6" style="color:var(--ink-600)">No results match these filters.</td></tr>`;
    tbody.querySelectorAll("tr[data-idx]").forEach(tr => tr.addEventListener("click", () => showDrawer(rows[Number(tr.dataset.idx)])));
  }

  document.getElementById("resClassFilter").addEventListener("change", () => { refreshTermOptions(); renderRows(); });
  document.getElementById("resTermFilter").addEventListener("change", renderRows);
  document.getElementById("resSearch").addEventListener("input", renderRows);
  refreshTermOptions();
  renderRows();
})();

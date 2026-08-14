/* =========================================================
   results.js — renders the Term Records page. Deliberately
   shows attendance and subject coverage only; no scores, no
   averages, no totals appear anywhere on this page.
   ========================================================= */
(() => {
  const { esc, uniq } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  if(!data.results.length){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">\u{1F4D2}</div>
        <h3>No term records imported</h3>
        <p>Import the class-by-class E-Result workbooks to see attendance and subject coverage here.</p>
        <a class="btn btn-gold" href="import.html">Import term records</a>
      </div>`;
    return;
  }

  const classes = uniq(data.results.map(r=>r.class)).sort();
  const terms = uniq(data.results.map(r=>r.term)).sort();

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px">
      <p class="lede">This page shows <strong>attendance and subject coverage only</strong>. Continuous assessment marks, examination marks and totals are deliberately excluded from this rebuild and do not appear anywhere on this site.</p>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="card-head"><div><h2>Average attendance by class</h2><p>Share of school days each class was present, where recorded</p></div></div>
      <div class="card-pad chart-card"><canvas id="attendanceChart" height="90"></canvas></div>
    </div>
    <div class="card">
      <div class="controls-row">
        <div class="field"><label>Class</label>
          <select id="resClassFilter"><option value="">All classes</option>${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Term</label>
          <select id="resTermFilter"><option value="">All terms</option>${terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select>
        </div>
        <div class="field" style="flex:1;min-width:200px"><label>Search</label><input type="search" id="resSearch" placeholder="Search by name\u2026"></div>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="resTable">
          <thead><tr><th>Name</th><th>Class</th><th>Term</th><th>Admission No.</th><th>Attendance</th><th>Subjects covered</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  function attendancePct(r){
    if(!r.timesOpened) return null;
    return Math.round((r.timesPresent||0) / r.timesOpened * 100);
  }

  function renderRows(){
    const classF = document.getElementById("resClassFilter").value;
    const termF = document.getElementById("resTermFilter").value;
    const q = document.getElementById("resSearch").value.toLowerCase();
    const rows = data.results.filter(r =>
      (!classF || r.class===classF) && (!termF || r.term===termF) &&
      (!q || (r.name||"").toLowerCase().includes(q))
    );
    document.querySelector("#resTable tbody").innerHTML = rows.map(r => {
      const pct = attendancePct(r);
      return `<tr>
        <td>${esc(r.name)}</td>
        <td><span class="pill pill-muted">${esc(r.class)}</span></td>
        <td>${esc(r.term)}</td>
        <td>${esc(r.admissionNo||"\u2014")}</td>
        <td>${pct===null ? "\u2014" : `<span class="pill ${pct>=75?'pill-green':pct>=50?'pill-gold':'pill-red'}">${pct}%</span>`}</td>
        <td style="max-width:340px">${(r.subjects||[]).map(s=>`<span class="pill pill-blue" style="margin:2px">${esc(s)}</span>`).join(" ") || "\u2014"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="6" style="color:var(--ink-600)">No records match these filters.</td></tr>`;
  }

  ["resClassFilter","resTermFilter"].forEach(id => document.getElementById(id).addEventListener("change", renderRows));
  document.getElementById("resSearch").addEventListener("input", renderRows);
  renderRows();

  // Chart: average attendance % by class
  const byClass = {};
  data.results.forEach(r => {
    const pct = attendancePct(r);
    if(pct===null) return;
    if(!byClass[r.class]) byClass[r.class] = [];
    byClass[r.class].push(pct);
  });
  const chartClasses = Object.keys(byClass).sort();
  const chartAverages = chartClasses.map(c => Math.round(byClass[c].reduce((a,b)=>a+b,0) / byClass[c].length));
  if(window.Chart && chartClasses.length){
    const css = getComputedStyle(document.documentElement);
    new Chart(document.getElementById("attendanceChart"), {
      type: "bar",
      data: { labels: chartClasses, datasets: [{ label: "Average attendance %", data: chartAverages, backgroundColor: css.getPropertyValue("--green-500").trim() || "#0f8a4c", borderRadius: 6, maxBarThickness: 36 }] },
      options: { responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, max:100, ticks:{ callback:v=>v+"%" } } } }
    });
  }else if(!chartClasses.length){
    document.getElementById("attendanceChart").replaceWith(Object.assign(document.createElement("p"), { textContent: "No attendance figures were recorded in the imported files.", style:"color:var(--ink-500);font-size:13px" }));
  }
})();

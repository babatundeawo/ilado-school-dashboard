/* =========================================================
   staff.js — renders the Staff Directory page. All fields are
   shown in full for this local, offline build (no masking).
   ========================================================= */
(() => {
  const { esc, openDrawer, kvRows } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  const ptaAppointed = data.staff.ptaAppointed || [];
  const total = data.staff.teaching.length + data.staff.nonTeaching.length + data.staff.corps.length + ptaAppointed.length;
  if(!total){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">\u{1F9D1}\u200D\u{1F3EB}</div>
        <h3>No staff roll imported</h3>
        <p>Import the detailed nominal roll workbook to see teaching, non-teaching and corps member records.</p>
        <a class="btn btn-gold" href="import.html">Import staff roll</a>
      </div>`;
    return;
  }

  const STAFF_COLUMNS = {
    teaching: [
      ["full_name_of_staff","Name"], ["gender","Gender"],
      ["present_post_prinpal_supervisor_vice_principal_tutor","Post"],
      ["main_subject_taught_consider_degree_cert","Main subject"],
      ["grade","Grade"], ["step","Step"], ["date_of_retirement_dd_mm_yyyy","Retirement date"],
      ["gsm_no","GSM"], ["email_address","Email"]
    ],
    nonTeaching: [
      ["full_name","Name"], ["gender","Gender"], ["job_title","Job title"],
      ["grade","Grade"], ["step","Step"], ["date_of_retirement","Retirement date"], ["gsm_whatsapp_no_only","GSM"]
    ],
    corps: [
      ["full_name","Name"], ["gender","Gender"], ["classes_taught","Classes taught"],
      ["teaching_subject_s","Subject(s)"], ["gsm_whatsapp_no_only","GSM"]
    ],
    ptaAppointed: [
      ["Name","Name"], ["Post Held","Post"], ["Subject Taught","Subject(s)"], ["Qualification","Qualification"]
    ]
  };
  const LABELS = { teaching:"Teaching", nonTeaching:"Non-teaching", corps:"Corps members", ptaAppointed:"P.T.A.-appointed" };

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
      <div style="font-size:22px">\u{1F4C7}</div>
      <div style="flex:1;min-width:240px">
        <strong style="display:block;margin-bottom:4px">Export to Google Contacts</strong>
        <p style="color:var(--ink-600);font-size:13px;max-width:65ch">
          Downloads one CSV with every TESCOM staff member's phone, email, address, birthday, post and department, formatted
          for Google's contact importer.
        </p>
      </div>
      <button class="btn btn-gold" id="gcExportBtn" style="align-self:center">\u{1F4C7} Export CSV for Google Contacts</button>
    </div>
    <div class="grid-2" style="margin-bottom:18px">
      <div class="card chart-card">
        <div class="card-head"><div><h2>Staff by grade level</h2><p>TESCOM teaching staff, grouped by grade</p></div></div>
        <div class="card-pad"><canvas id="gradeChart" height="140"></canvas></div>
      </div>
      <div class="card card-pad">
        <div class="kicker-label">Staffing at a glance</div>
        <div class="glance-grid" style="margin-top:12px">
          <div><strong>${data.staff.teaching.length}</strong><span>TESCOM teaching</span></div>
          <div><strong>${ptaAppointed.length}</strong><span>P.T.A.-appointed</span></div>
          <div><strong>${data.staff.nonTeaching.length}</strong><span>Non-teaching</span></div>
          <div><strong>${data.staff.corps.length}</strong><span>Corps members</span></div>
        </div>
        <div class="section-sub">Next to retire</div>
        <div id="nextRetireList"></div>
      </div>
    </div>
    <div class="card">
      <div class="controls-row">
        <div class="field"><label>Category</label>
          <select id="stfTypeFilter">
            <option value="teaching">Teaching (${data.staff.teaching.length})</option>
            <option value="ptaAppointed">P.T.A.-appointed (${ptaAppointed.length})</option>
            <option value="nonTeaching">Non-teaching (${data.staff.nonTeaching.length})</option>
            <option value="corps">Corps members (${data.staff.corps.length})</option>
          </select>
        </div>
        <div class="field" style="flex:1;min-width:200px"><label>Search</label>
          <input type="search" id="stfSearch" placeholder="Search by name\u2026">
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="stfTable"><thead><tr id="stfHead"></tr></thead><tbody></tbody></table>
      </div>
    </div>`;

  document.getElementById("gcExportBtn").addEventListener("click", () => Common.exportGoogleContactsCsv(data.staff));

  function val(v){ return (v===null||v===undefined||v==="") ? "\u2014" : esc(v); }

  function showDrawer(rec, type){
    const cols = STAFF_COLUMNS[type];
    const shownKeys = new Set(cols.map(c=>c[0]));
    const extraEntries = Object.entries(rec).filter(([k]) => k!=="_source" && !shownKeys.has(k));
    openDrawer(rec[cols[0][0]] || "Staff record", `
      ${kvRows(cols.map(([k,label]) => [label, val(rec[k])]))}
      ${extraEntries.length ? `<h3 style="margin:18px 0 6px;font-size:14px">All fields on record</h3>${kvRows(extraEntries.map(([k,v]) => [k.replace(/_/g,' '), val(v)]))}` : ""}
    `);
  }

  const list = (type) => type==="ptaAppointed" ? ptaAppointed : data.staff[type];

  function renderRows(){
    const type = document.getElementById("stfTypeFilter").value;
    const q = document.getElementById("stfSearch").value.toLowerCase();
    const cols = STAFF_COLUMNS[type];
    const nameKey = cols[0][0];
    const rows = list(type).filter(r => !q || String(r[nameKey]||"").toLowerCase().includes(q));

    document.getElementById("stfHead").innerHTML = cols.map(([,label]) => `<th>${esc(label)}</th>`).join("") + `<th></th>`;
    const tbody = document.querySelector("#stfTable tbody");
    tbody.innerHTML = rows.map((r,i) => `
      <tr data-idx="${i}" style="cursor:pointer">
        ${cols.map(([key]) => `<td>${val(r[key])}</td>`).join("")}
        <td><span class="pill pill-gold">View</span></td>
      </tr>`).join("") || `<tr><td colspan="${cols.length+1}" style="color:var(--ink-600)">No staff match this search.</td></tr>`;

    tbody.querySelectorAll("tr[data-idx]").forEach(tr => tr.addEventListener("click", () => showDrawer(rows[Number(tr.dataset.idx)], type)));
  }

  document.getElementById("stfTypeFilter").addEventListener("change", renderRows);
  document.getElementById("stfSearch").addEventListener("input", renderRows);
  renderRows();

  // Next to retire, from TESCOM teaching staff (dates on file are in mixed formats, normalise before sorting)
  function parseFlexibleDate(v){
    if(!v) return null;
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return new Date(+m[1], +m[2]-1, +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(m){
      let yr = +m[3];
      if(yr < 100) yr += (yr < 50 ? 2000 : 1900);
      return new Date(yr, +m[2]-1, +m[1]);
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const withDates = data.staff.teaching
    .map(t => ({ name: t.full_name_of_staff, raw: t.date_of_retirement_dd_mm_yyyy, date: parseFlexibleDate(t.date_of_retirement_dd_mm_yyyy) }))
    .filter(t => t.date)
    .sort((a,b) => a.date - b.date)
    .slice(0,4);
  document.getElementById("nextRetireList").innerHTML = withDates.length ? kvRows(withDates.map(t => [t.name, t.raw])) : `<p class="fine-print">No retirement dates on file.</p>`;

  // Grade distribution chart
  const gradeCounts = {};
  data.staff.teaching.forEach(t => { const g = t.grade || "Unspecified"; gradeCounts[g] = (gradeCounts[g]||0)+1; });
  const gradeLabels = Object.keys(gradeCounts).sort();
  if(window.Chart && gradeLabels.length){
    const css = getComputedStyle(document.documentElement);
    new Chart(document.getElementById("gradeChart"), {
      type: "bar",
      data: { labels: gradeLabels, datasets: [{ data: gradeLabels.map(g=>gradeCounts[g]), backgroundColor: css.getPropertyValue("--gold-500").trim() || "#b8842f", borderRadius: 6, maxBarThickness: 34 }] },
      options: { indexAxis: "y", responsive:true, plugins:{ legend:{ display:false } }, scales:{ x:{ beginAtZero:true, ticks:{ stepSize:1 } } } }
    });
  }
})();

/* =========================================================
   views.js — builds the HTML for each section and wires up
   its filters/search/drawer interactions.
   ========================================================= */
const Views = (() => {
  const charts = {}; // canvas id -> Chart instance, so we can destroy on re-render

  function killChart(id){
    if(charts[id]){ charts[id].destroy(); delete charts[id]; }
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function emptyState({icon="📇", title, body, ctaLabel, ctaView}){
    return `
      <div class="empty-state">
        <div class="icon-stack" style="font-size:34px">${icon}</div>
        <h3>${esc(title)}</h3>
        <p>${esc(body)}</p>
        ${ctaLabel ? `<button class="btn btn-gold" data-goto="${ctaView}">${esc(ctaLabel)}</button>` : ""}
      </div>`;
  }

  function uniq(arr){ return [...new Set(arr.filter(v => v !== null && v !== undefined && v !== ""))]; }

  function bundleDropzone(idSuffix=""){
    return `
      <div class="dropzone" id="bundleDrop${idSuffix}" data-bundle-drop>
        <div style="font-size:26px;margin-bottom:8px">📥</div>
        <strong>Drop all your workbooks here</strong>
        <span>Student registry, marking sheet, e-results, staff roll — drop them all at once, I'll sort out which is which.</span>
        <div style="margin-top:14px"><button class="btn btn-gold btn-sm" type="button" data-bundle-browse>Or choose files…</button></div>
      </div>`;
  }

  /* ================= OVERVIEW ================= */
  function overview(data){
    const totalStudents = data.students.length;
    const male = data.students.filter(s => (s.gender||"").startsWith("M")).length;
    const female = data.students.filter(s => (s.gender||"").startsWith("F")).length;
    const classes = uniq(data.students.map(s=>s.class));
    const staffCount = data.staff.teaching.length + data.staff.nonTeaching.length + data.staff.corps.length;
    const resultRecords = data.results.length;
    const markingRecords = data.marking.length;

    if(!totalStudents && !staffCount && !resultRecords && !markingRecords){
      return `
        <div class="card card-pad" style="max-width:640px;margin:0 auto">
          <div style="text-align:center;margin-bottom:18px">
            <div style="font-size:34px">🗂️</div>
            <h3 style="font-size:19px;margin:8px 0 6px">One-time setup</h3>
            <p style="color:var(--text-600);font-size:13.5px">
              Import everything once and it stays saved in this browser from now on — you won't need to do this again
              unless you clear your data or switch devices.
            </p>
          </div>
          ${bundleDropzone("Overview")}
          <p style="text-align:center;font-size:11.5px;color:var(--text-400);margin-top:14px">
            🔒 Files are read in your browser only — nothing is uploaded anywhere.
          </p>
        </div>`;
    }

    const classCounts = classes.map(c => ({
      class: c,
      count: data.students.filter(s=>s.class===c).length
    })).sort((a,b)=>b.count-a.count);
    const maxClassCount = Math.max(1, ...classCounts.map(c=>c.count));

    const recentImports = data.meta.imports.slice(0,6);

    return `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Students on record</div>
          <div class="value">${totalStudents}</div>
          <div class="delta ${classes.length? '' : 'muted'}">${classes.length} classes represented</div>
        </div>
        <div class="stat-card">
          <div class="label">Staff on record</div>
          <div class="value">${staffCount}</div>
          <div class="delta muted">${data.staff.teaching.length} teaching · ${data.staff.nonTeaching.length} non-teaching · ${data.staff.corps.length} corps</div>
        </div>
        <div class="stat-card">
          <div class="label">Result entries</div>
          <div class="value">${resultRecords}</div>
          <div class="delta muted">across ${uniq(data.results.map(r=>r.term)).length} term(s)</div>
        </div>
        <div class="stat-card">
          <div class="label">Marking sheet rows</div>
          <div class="value">${markingRecords}</div>
          <div class="delta muted">continuous assessment records</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div><h2>Students per class</h2><p>From the imported student registry</p></div>
          </div>
          <div class="card-pad">
            ${classCounts.length ? classCounts.map(c => `
              <div class="bar-row">
                <div class="bar-label" title="${esc(c.class)}">${esc(c.class)}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${(c.count/maxClassCount*100).toFixed(1)}%"></div></div>
                <div class="bar-value">${c.count}</div>
              </div>`).join("") : `<p style="color:var(--text-600);font-size:13px">Import the student registry to see class sizes.</p>`}
            ${totalStudents ? `<div class="bar-row" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line-200)">
              <div class="bar-label">Male</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(male/totalStudents*100).toFixed(1)}%;background:linear-gradient(90deg,var(--teal-600),#245e58)"></div></div>
              <div class="bar-value">${male}</div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Female</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(female/totalStudents*100).toFixed(1)}%;background:linear-gradient(90deg,var(--red-600),#8a3520)"></div></div>
              <div class="bar-value">${female}</div>
            </div>` : ""}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2>Recent imports</h2><p>Latest files loaded into this browser</p></div></div>
          <div class="card-pad" style="padding-top:8px">
            ${recentImports.length ? `
              <div style="display:flex;flex-direction:column;gap:12px">
                ${recentImports.map(imp => `
                  <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;border-bottom:1px solid var(--paper-200);padding-bottom:10px">
                    <div>
                      <div style="font-weight:600;color:var(--ink-950)">${esc(imp.label)}</div>
                      <div style="color:var(--text-600)">${esc(imp.fileName)}</div>
                    </div>
                    <div style="text-align:right;color:var(--text-400);white-space:nowrap">
                      ${imp.rows} rows<br>${new Date(imp.importedAt).toLocaleDateString()}
                    </div>
                  </div>`).join("")}
              </div>` : `<p style="color:var(--text-600);font-size:13px">No imports logged yet.</p>`}
          </div>
        </div>
      </div>
    `;
  }

  /* ================= STUDENTS ================= */
  function students(data){
    if(!data.students.length){
      return emptyState({
        icon:"🧑‍🎓",
        title:"No student registry imported",
        body:"Import your class-by-class or general student registry workbook to see the full roll here.",
        ctaLabel:"Import student registry",
        ctaView:"import"
      });
    }
    const classes = uniq(data.students.map(s=>s.class)).sort();
    return `
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
            <input type="search" id="stuSearch" placeholder="Search by name…">
          </div>
          <button class="btn btn-ghost btn-sm" id="stuExportBtn" style="align-self:flex-end">Export CSV</button>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="stuTable">
            <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Gender</th><th>Comment</th><th>Source</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderStudentRows(data){
    const classF = document.getElementById("stuClassFilter")?.value || "";
    const genderF = document.getElementById("stuGenderFilter")?.value || "";
    const q = (document.getElementById("stuSearch")?.value || "").toLowerCase();
    const rows = data.students.filter(s =>
      (!classF || s.class===classF) &&
      (!genderF || (s.gender||"").toUpperCase()===genderF) &&
      (!q || s.name.toLowerCase().includes(q))
    );
    const tbody = document.querySelector("#stuTable tbody");
    if(!tbody) return;
    tbody.innerHTML = rows.map((s,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${esc(s.name)}</td>
        <td><span class="pill pill-muted">${esc(s.class)}</span></td>
        <td>${esc(s.gender||"—")}</td>
        <td>${esc(s.comment||"—")}</td>
        <td style="color:var(--text-400);font-size:11.5px">${esc(s.source)}</td>
      </tr>`).join("") || `<tr><td colspan="6" style="color:var(--text-600)">No students match these filters.</td></tr>`;
    return rows;
  }

  /* ================= RESULTS (E-Result) ================= */
  function results(data){
    if(!data.results.length){
      return emptyState({
        icon:"📊",
        title:"No e-results imported",
        body:"Import a class result workbook (the ones with 1ST/2ND/3RD TERM Db sheets) to see subject performance and per-student report data.",
        ctaLabel:"Import e-results",
        ctaView:"import"
      });
    }
    const classes = uniq(data.results.map(r=>r.class)).sort();
    return `
      <div class="card" style="margin-bottom:18px">
        <div class="controls-row">
          <div class="field">
            <label>Class</label>
            <select id="resClassFilter">${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Term</label>
            <select id="resTermFilter"></select>
          </div>
          <div class="field" style="flex:1;min-width:200px">
            <label>Search student</label>
            <input type="search" id="resSearch" placeholder="Search by name or admission no…">
          </div>
        </div>
        <div class="card-pad">
          <canvas id="resSubjectChart" height="90"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Student results</h2><p>Click a row to see the full subject breakdown</p></div></div>
        <div class="table-wrap">
          <table class="data-table" id="resTable">
            <thead><tr><th>#</th><th>Name</th><th>Adm. No</th><th>Gender</th><th>Attendance</th><th>Overall Avg</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
  }

  function refreshResultTermOptions(data){
    const classSel = document.getElementById("resClassFilter");
    const termSel = document.getElementById("resTermFilter");
    if(!classSel || !termSel) return;
    const terms = uniq(data.results.filter(r=>r.class===classSel.value).map(r=>r.term));
    termSel.innerHTML = terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
  }

  function studentAverage(rec){
    const totals = rec.subjects.map(s=>s.total).filter(v=>typeof v==="number");
    if(!totals.length) return null;
    return totals.reduce((a,b)=>a+b,0)/totals.length;
  }

  function renderResultRows(data, onRowClick){
    const cls = document.getElementById("resClassFilter")?.value;
    const term = document.getElementById("resTermFilter")?.value;
    const q = (document.getElementById("resSearch")?.value || "").toLowerCase();
    const rows = data.results.filter(r => r.class===cls && r.term===term &&
      (!q || r.name.toLowerCase().includes(q) || (r.admissionNo||"").toLowerCase().includes(q)));

    // subject chart: average score per subject across the class
    const subjectNames = uniq(rows.flatMap(r=>r.subjects.map(s=>s.subject)));
    const subjectAverages = subjectNames.map(name => {
      const vals = rows.map(r => r.subjects.find(s=>s.subject===name)?.total).filter(v=>typeof v==="number");
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    });
    const canvas = document.getElementById("resSubjectChart");
    if(canvas){
      killChart("resSubjectChart");
      charts["resSubjectChart"] = new Chart(canvas, {
        type: "bar",
        data: { labels: subjectNames, datasets: [{ label: "Class average (this term)", data: subjectAverages, backgroundColor: "#c99a3d", borderRadius: 4 }] },
        options: {
          responsive:true,
          plugins:{ legend:{ display:false }, title:{ display:true, text:`${cls} — ${term}`, color:"#1c2230", font:{ family:"Inter", size:12, weight:"600" } } },
          scales:{ y:{ beginAtZero:true, max:100, grid:{ color:"#eeece3" } }, x:{ grid:{ display:false } } }
        }
      });
    }

    const tbody = document.querySelector("#resTable tbody");
    if(tbody){
      tbody.innerHTML = rows.map((r,i) => {
        const avg = studentAverage(r);
        const pct = r.timesOpened ? Math.round((r.timesPresent/r.timesOpened)*100) : null;
        return `
        <tr data-idx="${i}" style="cursor:pointer">
          <td>${r.sn ?? i+1}</td>
          <td>${esc(r.name)}</td>
          <td>${esc(r.admissionNo||"—")}</td>
          <td>${esc(r.gender||"—")}</td>
          <td>${pct!==null ? pct+"%" : "—"}</td>
          <td><span class="pill ${avg>=50?'pill-teal':avg!==null?'pill-red':'pill-muted'}">${avg!==null?avg.toFixed(1):"—"}</span></td>
        </tr>`;
      }).join("") || `<tr><td colspan="6" style="color:var(--text-600)">No results match these filters.</td></tr>`;

      tbody.querySelectorAll("tr[data-idx]").forEach(tr => {
        tr.addEventListener("click", () => onRowClick(rows[Number(tr.dataset.idx)]));
      });
    }
  }

  /* ================= MARKING SHEETS ================= */
  function marking(data){
    if(!data.marking.length){
      return emptyState({
        icon:"📝",
        title:"No marking sheets imported",
        body:"Import your CA marking sheet workbook to see attendance, notebook, textbook and exam scores per class.",
        ctaLabel:"Import marking sheet",
        ctaView:"import"
      });
    }
    const classes = uniq(data.marking.map(m=>m.class)).sort();
    return `
      <div class="card">
        <div class="controls-row">
          <div class="field">
            <label>Class</label>
            <select id="mkClassFilter">${classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Term</label>
            <select id="mkTermFilter"></select>
          </div>
          <div class="field" style="flex:1;min-width:200px">
            <label>Search</label>
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
      </div>
    `;
  }

  function refreshMarkingTermOptions(data){
    const classSel = document.getElementById("mkClassFilter");
    const termSel = document.getElementById("mkTermFilter");
    if(!classSel || !termSel) return;
    const terms = uniq(data.marking.filter(m=>m.class===classSel.value).map(m=>m.term));
    termSel.innerHTML = terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
  }

  function renderMarkingRows(data){
    const cls = document.getElementById("mkClassFilter")?.value;
    const term = document.getElementById("mkTermFilter")?.value;
    const q = (document.getElementById("mkSearch")?.value || "").toLowerCase();
    const rows = data.marking
      .filter(m => m.class===cls && m.term===term && (!q || m.name.toLowerCase().includes(q)))
      .sort((a,b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
    const tbody = document.querySelector("#mkTable tbody");
    if(!tbody) return;
    const cell = v => v===null||v===undefined ? "—" : v;
    tbody.innerHTML = rows.map(m => `
      <tr>
        <td>${esc(m.name)}</td><td>${esc(m.gender||"—")}</td>
        <td>${cell(m.attendance)}</td><td>${cell(m.notebook)}</td><td>${cell(m.openday)}</td><td>${cell(m.textbook)}</td>
        <td>${cell(m.schoolBase)}</td><td>${cell(m.teacherBase)}</td><td>${cell(m.caTotal)}</td><td>${cell(m.caHalf)}</td>
        <td>${cell(m.exam)}</td><td><strong>${cell(m.totalScore)}</strong></td>
      </tr>`).join("") || `<tr><td colspan="12" style="color:var(--text-600)">No records match these filters.</td></tr>`;
  }

  /* ================= STAFF ================= */
  const SENSITIVE_RE = /phone|gsm|whatsapp|email|address|dob|date_of_birth|residential/;
  const STAFF_COLUMNS = {
    teaching: [
      ["full_name_of_staff","Name"], ["gender","Gender"],
      ["present_post_prinpal_supervisor_vice_principal_tutor","Post"],
      ["main_subject_taught_consider_degree_cert","Main subject"],
      ["grade","Grade"], ["step","Step"],
      ["gsm_no","GSM"], ["email_address","Email"]
    ],
    nonTeaching: [
      ["full_name","Name"], ["gender","Gender"], ["job_title","Job title"],
      ["grade","Grade"], ["step","Step"], ["gsm_whatsapp_no_only","GSM"]
    ],
    corps: [
      ["full_name","Name"], ["gender","Gender"], ["classes_taught","Classes taught"],
      ["teaching_subject_s","Subject(s)"], ["gsm_whatsapp_no_only","GSM"]
    ]
  };

  function staff(data){
    const total = data.staff.teaching.length + data.staff.nonTeaching.length + data.staff.corps.length;
    if(!total){
      return emptyState({
        icon:"🧑‍🏫",
        title:"No staff roll imported",
        body:"Import the detailed nominal roll workbook to see teaching, non-teaching and corps member records.",
        ctaLabel:"Import staff roll",
        ctaView:"import"
      });
    }
    return `
      <div class="card">
        <div class="controls-row">
          <div class="field">
            <label>Category</label>
            <select id="stfTypeFilter">
              <option value="teaching">Teaching (${data.staff.teaching.length})</option>
              <option value="nonTeaching">Non-teaching (${data.staff.nonTeaching.length})</option>
              <option value="corps">Corps members (${data.staff.corps.length})</option>
            </select>
          </div>
          <div class="field" style="flex:1;min-width:200px">
            <label>Search</label>
            <input type="search" id="stfSearch" placeholder="Search by name…">
          </div>
          <button class="btn btn-ghost btn-sm" id="stfRevealBtn" style="align-self:flex-end">👁 Reveal sensitive fields</button>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="stfTable">
            <thead><tr id="stfHead"></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
  }

  let staffRevealed = false;

  function maskVal(key, val){
    const v = val===null||val===undefined||val==="" ? "—" : String(val);
    if(SENSITIVE_RE.test(key) && v!=="—" && !staffRevealed){
      return `<span class="masked" data-reveal>${esc(v)}</span>`;
    }
    return esc(v);
  }

  function renderStaffRows(data, onRowClick){
    const type = document.getElementById("stfTypeFilter")?.value || "teaching";
    const q = (document.getElementById("stfSearch")?.value || "").toLowerCase();
    const cols = STAFF_COLUMNS[type];
    const nameKey = cols[0][0];
    const list = data.staff[type].filter(r => !q || String(r[nameKey]||"").toLowerCase().includes(q));

    const head = document.getElementById("stfHead");
    if(head) head.innerHTML = cols.map(([,label]) => `<th>${esc(label)}</th>`).join("") + `<th></th>`;

    const tbody = document.querySelector("#stfTable tbody");
    if(!tbody) return;
    tbody.innerHTML = list.map((r,i) => `
      <tr data-idx="${i}" style="cursor:pointer">
        ${cols.map(([key]) => `<td>${maskVal(key, r[key])}</td>`).join("")}
        <td><span class="pill pill-gold">View</span></td>
      </tr>`).join("") || `<tr><td colspan="${cols.length+1}" style="color:var(--text-600)">No staff match this search.</td></tr>`;

    tbody.querySelectorAll("tr[data-idx]").forEach(tr => {
      tr.addEventListener("click", (e) => {
        if(e.target.closest("[data-reveal]")) return; // let mask-click handle itself
        onRowClick(list[Number(tr.dataset.idx)], type);
      });
    });
    tbody.querySelectorAll("[data-reveal]").forEach(el => {
      el.addEventListener("click", (ev) => { ev.stopPropagation(); el.classList.toggle("masked"); });
    });
  }

  function toggleStaffReveal(){
    staffRevealed = !staffRevealed;
    return staffRevealed;
  }

  /* ================= IMPORT ================= */
  function importView(data){
    const lastFor = (label) => data.meta.imports.find(i=>i.label===label);
    const card = (label, title, desc, hint) => {
      const last = lastFor(label);
      return `
      <div class="import-card">
        <h3>${esc(title)}</h3>
        <p>${esc(desc)}</p>
        <button class="btn btn-primary btn-sm" data-import="${label}">Choose file(s)</button>
        <div class="status" style="margin-top:10px">
          ${last ? `Last import: ${last.rows} rows from “${esc(last.fileName)}” · ${new Date(last.importedAt).toLocaleString()}` : `<span style="color:var(--text-400);font-weight:400">${esc(hint)}</span>`}
        </div>
      </div>`;
    };
    return `
      <div class="card card-pad" style="margin-bottom:20px;display:flex;gap:14px;align-items:flex-start">
        <div style="font-size:22px">🔒</div>
        <div>
          <strong style="display:block;margin-bottom:4px">Everything stays on this device</strong>
          <p style="color:var(--text-600);font-size:13px;max-width:70ch">
            This site has no server or database. When you choose a file, it's read and parsed entirely inside your
            browser using JavaScript, then saved to this browser's local storage. Nothing is uploaded anywhere —
            not to GitHub, not to Anthropic, not to anyone. If you clear your browser data, or use "Clear all
            imported data" in the sidebar, the records disappear.
          </p>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:20px">
        ${bundleDropzone("Import")}
      </div>

      <p style="font-size:12px;color:var(--text-600);margin:0 0 10px">Or import one category at a time:</p>
      <div class="import-grid">
        ${card("students","Student Registry","The workbook with class-by-class student lists (GENERAL / JSS·SSS sheets).","Not imported yet.")}
        ${card("marking","Marking Sheet","The CA marking workbook with attendance, notebook, textbook, exam columns.","Not imported yet.")}
        ${card("results","E-Results","One or more per-class result workbooks (the ones with 1ST/2ND/3RD TERM Db sheets). You can select several at once.","Not imported yet.")}
        ${card("staff","Staff Nominal Roll","The detailed nominal roll workbook with Teaching / Non-Teaching / Corp Members sheets.","Not imported yet.")}
      </div>

      <div class="card" style="margin-top:20px">
        <div class="card-head"><div><h2>Import log</h2><p>Everything you've loaded into this browser session</p></div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Category</th><th>File</th><th>Rows</th><th>When</th></tr></thead>
            <tbody>
              ${data.meta.imports.length ? data.meta.imports.map(i => `
                <tr><td><span class="pill pill-muted">${esc(i.label)}</span></td><td>${esc(i.fileName)}</td><td>${i.rows}</td><td>${new Date(i.importedAt).toLocaleString()}</td></tr>
              `).join("") : `<tr><td colspan="4" style="color:var(--text-600)">No imports yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return {
    esc, uniq, killChart, bundleDropzone,
    overview,
    students, renderStudentRows,
    results, refreshResultTermOptions, renderResultRows, studentAverage,
    marking, refreshMarkingTermOptions, renderMarkingRows,
    staff, renderStaffRows, toggleStaffReveal, STAFF_COLUMNS, SENSITIVE_RE,
    importView
  };
})();

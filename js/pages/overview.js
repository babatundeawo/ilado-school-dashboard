/* =========================================================
   overview.js — renders the Overview / Dashboard page.
   ========================================================= */
(() => {
  const { esc, uniq, bundleDropzoneHtml, wireBundleDropzones } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  const totalStudents = data.students.length;
  const male = data.students.filter(s => (s.gender||"").startsWith("M")).length;
  const female = data.students.filter(s => (s.gender||"").startsWith("F")).length;
  const classes = uniq(data.students.map(s=>s.class));
  const staffCount = data.staff.teaching.length + data.staff.nonTeaching.length + data.staff.corps.length;
  const resultRecords = data.results.length;
  const markingRecords = data.marking.length;

  if(!totalStudents && !staffCount && !resultRecords && !markingRecords){
    root.innerHTML = `
      <div class="card card-pad setup-panel">
        <div class="setup-head">
          <div class="icon">🗂️</div>
          <h3>One-time setup</h3>
          <p>Import everything once and it stays saved in this browser from now on — you won't need to do this again unless you clear your data or switch devices.</p>
        </div>
        ${bundleDropzoneHtml("Overview")}
        <p class="setup-note">🔒 Files are read in your browser only — nothing is uploaded anywhere.</p>
      </div>`;
    wireBundleDropzones(document.getElementById("bundleFileInput"));
    return;
  }

  const classCounts = classes.map(c => ({ class: c, count: data.students.filter(s=>s.class===c).length }))
    .sort((a,b)=>b.count-a.count);
  const maxClassCount = Math.max(1, ...classCounts.map(c=>c.count));
  const recentImports = data.meta.imports.slice(0,6);

  root.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Students on record</div>
        <div class="value">${totalStudents}</div>
        <div class="delta ${classes.length ? '' : 'muted'}">${classes.length} classes represented</div>
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
        <div class="card-head"><div><h2>Students per class</h2><p>From the imported student registry</p></div></div>
        <div class="card-pad">
          ${classCounts.length ? classCounts.map(c => `
            <div class="bar-row">
              <div class="bar-label" title="${esc(c.class)}">${esc(c.class)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(c.count/maxClassCount*100).toFixed(1)}%"></div></div>
              <div class="bar-value">${c.count}</div>
            </div>`).join("") : `<p style="color:var(--ink-600);font-size:13px">Import the student registry to see class sizes.</p>`}
          ${totalStudents ? `
            <div class="bar-row" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line-200)">
              <div class="bar-label">Male</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(male/totalStudents*100).toFixed(1)}%;background:linear-gradient(90deg,var(--teal-600),#164f47)"></div></div>
              <div class="bar-value">${male}</div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Female</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(female/totalStudents*100).toFixed(1)}%;background:linear-gradient(90deg,var(--red-600),#7c3016)"></div></div>
              <div class="bar-value">${female}</div>
            </div>` : ""}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2>Recent imports</h2><p>Latest files loaded into this browser</p></div></div>
        <div class="card-pad" style="padding-top:10px">
          ${recentImports.length ? `
            <div class="recent-imports-list">
              ${recentImports.map(imp => `
                <div class="recent-import-row">
                  <div><div class="name">${esc(imp.label)}</div><div class="file">${esc(imp.fileName)}</div></div>
                  <div class="meta">${imp.rows} rows<br>${new Date(imp.importedAt).toLocaleDateString()}</div>
                </div>`).join("")}
            </div>` : `<p style="color:var(--ink-600);font-size:13px">No imports logged yet.</p>`}
        </div>
      </div>
    </div>
  `;
})();

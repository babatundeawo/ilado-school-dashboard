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
          <div class="icon">\u{1F5C2}\ufe0f</div>
          <h3>One-time setup</h3>
          <p>Import everything once and it stays saved in this browser from now on. You will not need to do this again unless you clear your data or switch devices.</p>
        </div>
        ${bundleDropzoneHtml("Overview")}
        <p class="setup-note">\u{1F512} Files are read in your browser only, nothing is uploaded anywhere.</p>
      </div>`;
    wireBundleDropzones(document.getElementById("bundleFileInput"));
    return;
  }

  const classCounts = classes.map(c => ({ class: c, count: data.students.filter(s=>s.class===c).length }))
    .sort((a,b)=>b.count-a.count);
  const maxClassCount = Math.max(1, ...classCounts.map(c=>c.count));
  const recentImports = data.meta.imports.slice(0,6);

  const school = data.school;
  const retirement = data.retirement;

  root.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Students on record</div>
        <div class="value" data-count="${totalStudents}">0</div>
        <div class="delta ${classes.length ? '' : 'muted'}">${classes.length} classes represented</div>
      </div>
      <div class="stat-card">
        <div class="label">Staff on record</div>
        <div class="value" data-count="${staffCount}">0</div>
        <div class="delta muted">${data.staff.teaching.length} teaching, ${data.staff.nonTeaching.length} non-teaching, ${data.staff.corps.length} corps</div>
      </div>
      <div class="stat-card">
        <div class="label">Term record entries</div>
        <div class="value" data-count="${resultRecords}">0</div>
        <div class="delta muted">across ${uniq(data.results.map(r=>r.term)).length} term(s), scores excluded</div>
      </div>
      <div class="stat-card">
        <div class="label">C.A. coverage rows</div>
        <div class="value" data-count="${markingRecords}">0</div>
        <div class="delta muted">continuous assessment records on file</div>
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
            </div>`).join("") : `<p style="color:var(--ink-500);font-size:13px">Import the student registry to see class sizes.</p>`}
          ${totalStudents ? `
            <div class="bar-row" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line-subtle)">
              <div class="bar-label">Male</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(male/totalStudents*100).toFixed(1)}%;background:linear-gradient(90deg,var(--green-400),var(--green-800))"></div></div>
              <div class="bar-value">${male}</div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Female</div>
              <div class="bar-track"><div class="bar-fill" style="width:${(female/totalStudents*100).toFixed(1)}%;background:linear-gradient(90deg,var(--red-400),var(--red-600))"></div></div>
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
            </div>` : `<p style="color:var(--ink-500);font-size:13px">No imports logged yet, this build shipped with data preloaded.</p>`}
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="card card-pad">
        <div class="kicker-label">School profile</div>
        <h2 style="font-size:17px;margin:8px 0 10px">${esc(school?.name || "")}</h2>
        <p class="lede">${esc(school?.history?.[0]?.text || "")}</p>
        <a class="btn btn-ghost btn-sm" style="margin-top:14px" href="about.html">View full school profile \u2192</a>
      </div>
      <div class="card card-pad">
        <div class="kicker-label">Retirement & handover, 2026</div>
        <h2 style="font-size:17px;margin:8px 0 10px">${esc(retirement?.outgoingPrincipal || "")} to ${esc(retirement?.incomingPrincipal || "")}</h2>
        <p class="lede">Handover completed ${esc(retirement?.handoverDate || "")}, after ${esc(retirement?.tenureServed || "")} of service.</p>
        <a class="btn btn-ghost btn-sm" style="margin-top:14px" href="retirement.html">View retirement & handover \u2192</a>
      </div>
    </div>
  `;
  Common.wireCounters();
})();

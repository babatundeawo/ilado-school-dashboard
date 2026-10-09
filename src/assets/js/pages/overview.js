import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc } from "../lib/util.js";
import { skeleton, emptyState, errorState, finishRender, bar } from "../lib/ui.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

try {
  const [summary, school, retirement] = await Promise.all([loadDataset("summary"), loadDataset("school"), loadDataset("retirement")]);
  if (!summary) {
    root.innerHTML = emptyState("No records have been loaded yet", "The register is empty. Once an administrator loads the school data, the overview will appear here.", isAdmin);
  } else {
    const { students, staff, results, marking, imports } = summary;
    const staffTotal = staff.teaching + staff.nonTeaching + staff.corps + staff.ptaAppointed;
    const max = Math.max(1, ...students.classes.map((c) => c.count));
    root.innerHTML = `
      <section class="hero" aria-labelledby="heroTitle">
        <div class="stack">
          <p class="eyebrow">${esc(school?.shortName || "ISCGS")} register</p>
          <h2 id="heroTitle">${esc(school?.name || "Ilado-Sagbo Community Grammar School")}</h2>
          <p>${esc(school?.motto || "A secure register of students, staff and school records.")}</p>
        </div>
        <div class="hero-actions">
          <a class="btn btn-light" href="students.html">Open student registry</a>
          <a class="btn btn-outline-light" href="staff.html">Staff directory</a>
        </div>
        <div class="hero-stats">
          <div><strong data-count="${students.total}">0</strong><span>Students on record</span></div>
          <div><strong data-count="${staffTotal}">0</strong><span>Staff on record</span></div>
          <div><strong data-count="${students.classes.length}">0</strong><span>Classes</span></div>
          <div><strong data-count="${results.terms}">0</strong><span>Terms of records</span></div>
        </div>
      </section>

      <div class="stats">
        <div class="card stat"><span class="stat-label">Students</span><span class="stat-value" data-count="${students.total}">0</span><span class="stat-note">${students.male} male, ${students.female} female</span></div>
        <div class="card stat"><span class="stat-label">Staff</span><span class="stat-value" data-count="${staffTotal}">0</span><span class="stat-note">${staff.teaching} teaching, ${staff.nonTeaching} non-teaching, ${staff.corps} corps, ${staff.ptaAppointed} P.T.A.</span></div>
        <div class="card stat"><span class="stat-label">Term record entries</span><span class="stat-value" data-count="${results.records}">0</span><span class="stat-note">across ${results.terms} term(s), marks excluded</span></div>
        <div class="card stat"><span class="stat-label">C.A. coverage rows</span><span class="stat-value" data-count="${marking.records}">0</span><span class="stat-note">continuous assessment records on file</span></div>
      </div>

      <div class="grid-2">
        <section class="card" aria-labelledby="clsTitle">
          <div class="card-head"><div><h2 id="clsTitle">Students per class</h2><p>From the student registry</p></div></div>
          <div class="card-body"><div class="bars">
            ${students.classes.map((c) => bar(c.name, c.count, max)).join("") || `<p class="fine">No class data yet.</p>`}
            ${students.total ? `<hr class="rule">` : ""}
            ${students.total ? bar("Male", students.male, students.total) + bar("Female", students.female, students.total, { brass: true }) : ""}
          </div></div>
        </section>
        <section class="card" aria-labelledby="impTitle">
          <div class="card-head"><div><h2 id="impTitle">Recent imports</h2><p>Latest files loaded into the database</p></div></div>
          <div class="card-body">
            ${imports.length ? `<div class="table-wrap is-short"><table class="table"><thead><tr><th>Category</th><th>File</th><th class="num">Rows</th><th>When</th></tr></thead><tbody>
              ${imports.slice(0, 6).map((i) => `<tr><td><span class="pill">${esc(i.label)}</span></td><td>${esc(i.fileName)}</td><td class="num">${esc(i.rows)}</td><td>${esc(new Date(i.importedAt).toLocaleDateString())}</td></tr>`).join("")}
            </tbody></table></div>` : `<p class="fine">No imports logged yet.</p>`}
          </div>
        </section>
      </div>

      <div class="grid-2">
        <section class="card card-pad card-link stack">
          <p class="eyebrow">School profile</p>
          <h2>${esc(school?.name || "")}</h2>
          <p class="lede">${esc(school?.history?.[0]?.text || "")}</p>
          <div><a class="btn btn-sm" href="about.html">View full profile</a></div>
        </section>
        <section class="card card-pad card-link stack">
          <p class="eyebrow">Retirement &amp; handover, 2026</p>
          <h2>${esc(retirement?.outgoingPrincipal || "")}${retirement ? " to " : ""}${esc(retirement?.incomingPrincipal || "")}</h2>
          <p class="lede">${retirement ? `Handover completed ${esc(retirement.handoverDate)}, after ${esc(retirement.tenureServed)} of service.` : ""}</p>
          <div><a class="btn btn-sm" href="retirement.html">View retirement &amp; handover</a></div>
        </section>
      </div>`;
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

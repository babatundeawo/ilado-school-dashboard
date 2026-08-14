/* =========================================================
   about.js — renders the School Profile page from data.school.
   ========================================================= */
(() => {
  const { esc } = Common;
  const data = DB.load();
  const s = data.school;
  const root = document.getElementById("pageContent");

  if(!s){
    root.innerHTML = `<div class="empty-state"><h3>School profile not available</h3><p>This content ships with the preloaded build and should be present. Try reloading, or restore from a fresh copy of this project.</p></div>`;
    return;
  }

  const stat1 = s.currentStats.asOfJan2026, stat2 = s.currentStats.asOfHandover2026;

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px">
      <div class="kicker-label">${esc(s.shortName)}</div>
      <h2 style="font-size:20px;margin:8px 0 10px">${esc(s.name)}</h2>
      <div class="ceremony-strip">
        <span>\u{1F4CD} ${esc(s.address)}</span>
        <span>\u{1F4C5} Established ${esc(s.established)}</span>
        <span>\u2705 Recognised ${esc(s.recognised)}</span>
        <span>\u{1F3EB} BECE Centre No. ${esc(s.beceCentreNumber)}</span>
      </div>
      <p class="lede" style="margin-top:14px">${esc(s.motto)}</p>
    </div>

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card card-pad">
        <div class="kicker-label">Enrolment, ${esc(stat1.label)}</div>
        <div class="glance-grid" style="margin-top:12px">
          <div><strong>${stat1.total}</strong><span>Total students</span></div>
          <div><strong>${stat1.male}</strong><span>Male</span></div>
          <div><strong>${stat1.female}</strong><span>Female</span></div>
          <div><strong>${stat1.teschomTeachers}</strong><span>TESCOM teachers</span></div>
        </div>
      </div>
      <div class="card card-pad">
        <div class="kicker-label">Enrolment, ${esc(stat2.label)}</div>
        <div class="glance-grid" style="margin-top:12px">
          <div><strong>${stat2.total}</strong><span>Total students</span></div>
          <div><strong>${stat2.male}</strong><span>Male</span></div>
          <div><strong>${stat2.female}</strong><span>Female</span></div>
          <div><strong>${s.examinations.beceCohorts}</strong><span>BECE cohorts to date</span></div>
        </div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h2 style="font-size:17px;margin-bottom:14px">School history</h2>
      <div class="timeline">
        ${s.history.map(h => `<div class="timeline-item"><div class="timeline-year">${esc(h.year)}</div><div class="timeline-text">${esc(h.text)}</div></div>`).join("")}
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h2 style="font-size:17px;margin-bottom:6px">Students enrolled by class</h2>
      <p class="fine-print" style="margin-bottom:14px">From the 2026 handover notes</p>
      <div class="table-wrap" style="max-height:none">
        <table class="data-table">
          <thead><tr>${Object.keys(s.enrolmentByClass[0]||{}).map(k=>`<th>${esc(k)}</th>`).join("")}</tr></thead>
          <tbody>${s.enrolmentByClass.map(row => `<tr>${Object.values(row).map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card card-pad">
        <h2 style="font-size:16px">Curriculum, Junior Secondary</h2>
        <p class="fine-print" style="margin-bottom:10px">Departments: ${s.departments.join(", ")}</p>
        <div>${s.curriculum.junior.map(sub=>`<span class="pill pill-blue" style="margin:3px">${esc(sub)}</span>`).join("")}</div>
      </div>
      <div class="card card-pad">
        <h2 style="font-size:16px">Curriculum, Senior Secondary</h2>
        <p class="fine-print" style="margin-bottom:10px">Science, Arts and Commercial departments</p>
        <div>${s.curriculum.senior.map(sub=>`<span class="pill pill-blue" style="margin:3px">${esc(sub)}</span>`).join("")}</div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h2 style="font-size:16px">Co-curricular clubs and societies</h2>
      <div style="margin-top:10px">${s.coCurricular.map(c=>`<span class="pill pill-gold" style="margin:3px">${esc(c)}</span>`).join("")}</div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h2 style="font-size:17px;margin-bottom:6px">Infrastructure</h2>
      <p class="fine-print" style="margin-bottom:12px">Six building blocks make up the school campus</p>
      <div class="section-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        ${s.infrastructure.map(b => `
          <div style="background:var(--surface-1);border-radius:var(--radius-md);padding:16px">
            <span class="pill pill-green">${esc(b.block)}</span>
            <strong style="display:block;margin:8px 0 4px;font-size:14px">${esc(b.name)}</strong>
            <p style="font-size:12.5px;color:var(--ink-600);line-height:1.6">${esc(b.text)}</p>
          </div>`).join("")}
      </div>
      <div class="section-sub">Other facilities</div>
      <ul class="tidy-list">${s.otherFacilities.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
      <div class="section-sub">School farm</div>
      <p class="lede">${esc(s.schoolFarm)}</p>
    </div>

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card card-pad">
        <h2 style="font-size:16px">Parents Teachers' Association executive</h2>
        <p class="fine-print" style="margin-bottom:10px">${esc(s.pta.summary)}</p>
        ${Common.kvRows(s.pta.members.map(m=>[m.role, esc(m.name)]))}
      </div>
      <div class="card card-pad">
        <h2 style="font-size:16px">School Governing Board</h2>
        <p class="fine-print" style="margin-bottom:10px">${esc(s.sgb.summary)}</p>
        ${Common.kvRows(s.sgb.members.map(m=>[m.role, esc(m.name)]))}
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h2 style="font-size:16px">Old Students' Association</h2>
      <p class="lede">${esc(s.oldStudents)}</p>
    </div>

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card card-pad">
        <h2 style="font-size:16px">Statutory records maintained</h2>
        <ul class="tidy-list">${s.statutoryRecords.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
      </div>
      <div class="card card-pad">
        <h2 style="font-size:16px">School files held</h2>
        <ul class="tidy-list">${s.schoolFiles.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card card-pad">
        <h2 style="font-size:16px">Areas of need</h2>
        <ul class="tidy-list">${s.needs.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
      </div>
      <div class="card card-pad">
        <h2 style="font-size:16px">Infrastructural deficits, 2026</h2>
        <ul class="tidy-list">${s.infraDeficits2026.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
      </div>
    </div>

    <div class="card card-pad">
      <h2 style="font-size:17px;margin-bottom:6px">Projects and sponsors</h2>
      <p class="fine-print" style="margin-bottom:12px">Recorded contributions to the school since 2017</p>
      <div class="table-wrap" style="max-height:none">
        <table class="data-table">
          <thead><tr><th>Project</th><th>Period</th><th>Sponsor</th></tr></thead>
          <tbody>${s.projectsSponsors.map(p => `<tr><td>${esc(p.project)}</td><td>${esc(p.period)}</td><td>${esc(p.sponsor)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
})();

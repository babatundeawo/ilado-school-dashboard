import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc } from "../lib/util.js";
import { skeleton, errorState, finishRender, kvRows, emptyState } from "../lib/ui.js";
import { simpleTable } from "../lib/datatable.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

const list = (items, cls = "") => `<ul class="tidy-list ${cls}">${(items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
const pills = (items, cls = "pill-blue") => `<div class="pills">${(items || []).map((i) => `<span class="pill ${cls}">${esc(i)}</span>`).join("")}</div>`;

try {
  const s = await loadDataset("school");
  if (!s) {
    root.innerHTML = emptyState("School profile not loaded", "The school profile hasn't been loaded.", isAdmin);
  } else {
    const a = s.currentStats.asOfJan2026, b = s.currentStats.asOfHandover2026;
    root.innerHTML = `
      <section class="card card-pad stack">
        <p class="eyebrow">${esc(s.shortName)}</p>
        <h2>${esc(s.name)}</h2>
        <div class="ceremony-strip"><span>${esc(s.address)}</span><span>Established ${esc(s.established)}</span><span>Recognised ${esc(s.recognised)}</span><span>BECE Centre No. ${esc(s.beceCentreNumber)}</span></div>
        <p class="quote">${esc(s.motto)}</p>
      </section>
      <div class="grid-2">
        <section class="card card-pad stack"><p class="eyebrow">Enrolment, ${esc(a.label)}</p>
          <div class="glance"><div><strong>${a.total}</strong><span>Total students</span></div><div><strong>${a.male}</strong><span>Male</span></div><div><strong>${a.female}</strong><span>Female</span></div><div><strong>${a.teschomTeachers}</strong><span>TESCOM teachers</span></div></div></section>
        <section class="card card-pad stack"><p class="eyebrow">Enrolment, ${esc(b.label)}</p>
          <div class="glance"><div><strong>${b.total}</strong><span>Total students</span></div><div><strong>${b.male}</strong><span>Male</span></div><div><strong>${b.female}</strong><span>Female</span></div><div><strong>${s.examinations.beceCohorts}</strong><span>BECE cohorts to date</span></div></div></section>
      </div>
      <section class="card card-pad stack"><h2>School history</h2>
        <div class="timeline">${s.history.map((h) => `<div class="timeline-item"><div class="timeline-year">${esc(h.year)}</div><div class="timeline-text">${esc(h.text)}</div></div>`).join("")}</div></section>
      <section class="card card-pad stack"><h2>Students enrolled by class</h2><p class="fine">From the 2026 handover notes</p>${simpleTable(s.enrolmentByClass)}</section>
      <div class="grid-2">
        <section class="card card-pad stack"><h2>Curriculum, Junior Secondary</h2><p class="fine">Departments: ${esc(s.departments.join(", "))}</p>${pills(s.curriculum.junior)}</section>
        <section class="card card-pad stack"><h2>Curriculum, Senior Secondary</h2><p class="fine">Science, Arts and Commercial departments</p>${pills(s.curriculum.senior)}</section>
      </div>
      <section class="card card-pad stack"><h2>Co-curricular clubs and societies</h2>${pills(s.coCurricular, "pill-brass")}</section>
      <section class="card card-pad stack"><h2>Infrastructure</h2><p class="fine">Six building blocks make up the school campus</p>
        <div class="tiles">${s.infrastructure.map((x) => `<div class="tile"><span class="pill pill-green">${esc(x.block)}</span><strong>${esc(x.name)}</strong><p>${esc(x.text)}</p></div>`).join("")}</div>
        <p class="section-title">Other facilities</p>${list(s.otherFacilities)}
        <p class="section-title">School farm</p><p class="lede">${esc(s.schoolFarm)}</p></section>
      <div class="grid-2">
        <section class="card card-pad stack"><h2>Parents Teachers' Association executive</h2><p class="fine">${esc(s.pta.summary)}</p>${kvRows(s.pta.members.map((m) => [m.role, esc(m.name)]))}</section>
        <section class="card card-pad stack"><h2>School Governing Board</h2><p class="fine">${esc(s.sgb.summary)}</p>${kvRows(s.sgb.members.map((m) => [m.role, esc(m.name)]))}</section>
      </div>
      <section class="card card-pad stack"><h2>Old Students' Association</h2><p class="lede">${esc(s.oldStudents)}</p></section>
      <div class="grid-2">
        <section class="card card-pad stack"><h2>Statutory records maintained</h2>${list(s.statutoryRecords)}</section>
        <section class="card card-pad stack"><h2>School files held</h2>${list(s.schoolFiles)}</section>
      </div>
      <div class="grid-2">
        <section class="card card-pad stack"><h2>Areas of need</h2>${list(s.needs)}</section>
        <section class="card card-pad stack"><h2>Infrastructural deficits, 2026</h2>${list(s.infraDeficits2026)}</section>
      </div>
      <section class="card card-pad stack"><h2>Projects and sponsors</h2><p class="fine">Recorded contributions to the school since 2017</p>
        ${simpleTable(s.projectsSponsors.map((p) => ({ Project: p.project, Period: p.period, Sponsor: p.sponsor })))}</section>`;
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

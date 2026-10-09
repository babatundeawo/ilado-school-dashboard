import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc, initials } from "../lib/util.js";
import { skeleton, errorState, finishRender, kvRows, emptyState } from "../lib/ui.js";
import { simpleTable } from "../lib/datatable.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

const list = (items, cls = "") => `<ul class="tidy-list ${cls}">${(items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
const strip = (...parts) => `<div class="ceremony-strip">${parts.filter(Boolean).map((p) => `<span>${esc(p)}</span>`).join("")}</div>`;

function retiree(p, inner) {
  return `<section class="card card-pad stack">
    <div class="retiree-head"><div class="retiree-avatar" aria-hidden="true">${esc(initials(p.name))}</div><div><h2>${esc(p.name)}</h2><p class="fine">${esc(p.role)}</p></div></div>
    ${strip(p.ceremony?.date, p.ceremony?.time, p.ceremony?.venue)}${inner}</section>`;
}

try {
  const r = await loadDataset("retirement");
  if (!r) {
    root.innerHTML = emptyState("Retirement records not loaded", "The retirement and handover record hasn't been loaded.", isAdmin);
  } else {
    const a = r.adeoti, o = r.ogundiran;
    // Bank account details are administrator-only: the database refuses everyone else.
    let accounts = null;
    if (isAdmin) { try { accounts = await loadDataset("retirementAccounts", { restricted: true }); } catch { accounts = null; } }

    const adeotiBody = `
      <div class="grid-2"><div><p class="section-title">Personal information</p>${kvRows(Object.entries(a.personal).map(([k, v]) => [k, esc(v)]))}</div>
      <div><p class="section-title">On the day</p>${kvRows(Object.entries(a.onTheDay).map(([k, v]) => [k, esc(v)]))}</div></div>
      <p class="section-title">Education</p>${simpleTable(a.education, ["Institution", "Qualification", "Year"])}
      <p class="section-title">Career history</p>${simpleTable(a.career, ["School / Institution", "Role", "Period"])}
      <p class="section-title">Achievements as Principal</p>${list(a.achievements)}
      <p class="section-title">Order of programme</p>${list(a.programme, "numbered")}
      <p class="section-title">Scripture</p><p class="quote">${esc(a.scripture)}</p>
      <p class="section-title">Appreciation</p><p class="lede">${esc(a.appreciation)}</p>`;
    const ogundiranBody = `
      ${strip(`Born ${o.bornYear}, ${o.birthplace}`, `Schooling: ${o.schooling}`)}
      <p class="section-title">Profile, in his own words (Yoruba, as recorded)</p><div class="prose" lang="yo">${o.profileYoruba.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      <p class="section-title">Principals served under, since 2006</p>${kvRows(o.principalsServedUnder.map((p) => [p.period, esc(p.name)]))}
      <p class="section-title">Order of programme</p>${list(o.programme, "numbered")}
      <p class="section-title">In tribute</p><p class="quote">${esc(o.note)}</p>`;

    const accountsCard = accounts
      ? `<p class="fine">Signatories: ${esc(accounts.signatories)} &middot; Balance as at handover: ${esc(accounts.accountBalance)}</p>
         ${simpleTable(accounts.handoverAccounts.map((x) => ({ Account: x.account, Number: x.number, Status: x.status || "\u2014" })))}`
      : `<p class="restricted-note">Account details are restricted to school administrators.</p>`;

    root.innerHTML = `
      <section class="card card-pad stack"><p class="eyebrow">2026 handover</p>
        <h2>${esc(r.outgoingPrincipal)} to ${esc(r.incomingPrincipal)}</h2>
        <p class="lede">Handover completed on ${esc(r.handoverDate)}, closing a tenure of ${esc(r.tenureServed)}.</p>
        <div class="glance"><div><strong>${r.schoolAtAGlance.buildingBlocks}</strong><span>Building blocks</span></div><div><strong>${r.schoolAtAGlance.departments}</strong><span>Departments</span></div><div><strong>${r.schoolAtAGlance.clubs}</strong><span>Clubs</span></div><div><strong>${r.staffingAtHandover.total}</strong><span>Staff at handover</span></div></div></section>
      <section class="card card-pad stack"><h2>Succession of principals</h2>${simpleTable(r.principalSuccession)}</section>
      ${retiree(a, adeotiBody)}
      ${retiree(o, ogundiranBody)}
      <div class="grid-2">
        <section class="card card-pad stack"><h2>School accounts at handover</h2>${accountsCard}</section>
        <section class="card card-pad stack"><h2>Staffing confirmed at handover</h2>${kvRows([
          ["Permanent teaching staff", r.staffingAtHandover.permanentTeaching], ["P.T.A.-appointed teachers", r.staffingAtHandover.ptaAppointed],
          ["Non-teaching staff", r.staffingAtHandover.nonTeaching], ["Total", r.staffingAtHandover.total]])}</section>
      </div>
      <section class="card card-pad stack"><h2>Outstanding needs handed over</h2>${list(r.outstandingNeeds)}</section>`;
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

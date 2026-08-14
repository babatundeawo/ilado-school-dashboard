/* =========================================================
   retirement.js — renders the Retirement & Handover page.
   ========================================================= */
(() => {
  const { esc, kvRows } = Common;
  const data = DB.load();
  const r = data.retirement;
  const root = document.getElementById("pageContent");

  if(!r){
    root.innerHTML = `<div class="empty-state"><h3>Retirement records not available</h3></div>`;
    return;
  }

  const initials = (name) => (name||"").replace(/^(Mr|Mrs|Miss|Revd|Rev'd|Alh\.|Alhaji|Hon\.)\s+/i,"").split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();

  function retireeCard(person, extraSections){
    return `
      <div class="card card-pad" style="margin-bottom:18px">
        <div class="retiree-head">
          <div class="retiree-avatar">${initials(person.name)}</div>
          <div><h2 style="font-size:18px">${esc(person.name)}</h2><p class="fine-print">${esc(person.role)}</p></div>
        </div>
        <div class="ceremony-strip">
          ${person.ceremony?.date ? `<span>\u{1F4C5} ${esc(person.ceremony.date)}</span>` : ""}
          ${person.ceremony?.time ? `<span>\u23F0 ${esc(person.ceremony.time)}</span>` : ""}
          ${person.ceremony?.venue ? `<span>\u{1F4CD} ${esc(person.ceremony.venue)}</span>` : ""}
        </div>
        ${extraSections}
      </div>`;
  }

  const adeotiSections = `
    <div class="grid-2" style="margin-top:16px">
      <div>
        <div class="section-sub">Personal information</div>
        ${kvRows(Object.entries(r.adeoti.personal).map(([k,v])=>[k, esc(v)]))}
      </div>
      <div>
        <div class="section-sub">On the day</div>
        ${kvRows(Object.entries(r.adeoti.onTheDay).map(([k,v])=>[k, esc(v)]))}
      </div>
    </div>
    <div class="section-sub">Education</div>
    <div class="table-wrap" style="max-height:none">
      <table class="data-table"><thead><tr><th>Institution</th><th>Qualification</th><th>Year</th></tr></thead>
        <tbody>${r.adeoti.education.map(e=>`<tr><td>${esc(e['Institution'])}</td><td>${esc(e['Qualification'])}</td><td>${esc(e['Year'])}</td></tr>`).join("")}</tbody></table>
    </div>
    <div class="section-sub">Career history</div>
    <div class="table-wrap" style="max-height:none">
      <table class="data-table"><thead><tr><th>School / Institution</th><th>Role</th><th>Period</th></tr></thead>
        <tbody>${r.adeoti.career.map(e=>`<tr><td>${esc(e['School / Institution'])}</td><td>${esc(e['Role'])}</td><td>${esc(e['Period'])}</td></tr>`).join("")}</tbody></table>
    </div>
    <div class="section-sub">Achievements as Principal</div>
    <ul class="tidy-list">${r.adeoti.achievements.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>
    <div class="section-sub">Order of programme</div>
    <ol class="tidy-list numbered">${r.adeoti.programme.map(p=>`<li>${esc(p)}</li>`).join("")}</ol>
    <div class="section-sub">Scripture</div>
    <p class="lede" style="font-style:italic">${esc(r.adeoti.scripture)}</p>
    <div class="section-sub">Appreciation</div>
    <p class="lede">${esc(r.adeoti.appreciation)}</p>
  `;

  const ogundiranSections = `
    <div class="ceremony-strip" style="margin-top:-8px;margin-bottom:16px">
      <span>Born ${esc(r.ogundiran.bornYear)}, ${esc(r.ogundiran.birthplace)}</span>
      <span>Schooling: ${esc(r.ogundiran.schooling)}</span>
    </div>
    <div class="section-sub">Profile, in his own words (Yoruba, as recorded)</div>
    <div class="lede" style="display:flex;flex-direction:column;gap:8px">${r.ogundiran.profileYoruba.map(p=>`<p>${esc(p)}</p>`).join("")}</div>
    <div class="section-sub">Principals served under, since 2006</div>
    ${kvRows(r.ogundiran.principalsServedUnder.map(p=>[p.period, esc(p.name)]))}
    <div class="section-sub">Order of programme</div>
    <ol class="tidy-list numbered">${r.ogundiran.programme.map(p=>`<li>${esc(p)}</li>`).join("")}</ol>
    <div class="section-sub">In tribute</div>
    <p class="lede" style="font-style:italic">${esc(r.ogundiran.note)}</p>
  `;

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px">
      <div class="kicker-label">2026 handover</div>
      <h2 style="font-size:19px;margin:8px 0 10px">${esc(r.outgoingPrincipal)} \u2192 ${esc(r.incomingPrincipal)}</h2>
      <p class="lede">Handover completed on ${esc(r.handoverDate)}, closing a tenure of ${esc(r.tenureServed)}.</p>
      <div class="glance-grid" style="margin-top:16px">
        <div><strong>${r.schoolAtAGlance.buildingBlocks}</strong><span>Building blocks</span></div>
        <div><strong>${r.schoolAtAGlance.departments}</strong><span>Departments</span></div>
        <div><strong>${r.schoolAtAGlance.clubs}</strong><span>Clubs</span></div>
        <div><strong>${r.staffingAtHandover.total}</strong><span>Staff at handover</span></div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h2 style="font-size:17px;margin-bottom:14px">Succession of principals</h2>
      <div class="table-wrap" style="max-height:none">
        <table class="data-table">
          <thead><tr>${Object.keys(r.principalSuccession[0]||{}).map(k=>`<th>${esc(k)}</th>`).join("")}</tr></thead>
          <tbody>${r.principalSuccession.map(row => `<tr>${Object.values(row).map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </div>

    ${retireeCard(r.adeoti, adeotiSections)}
    ${retireeCard(r.ogundiran, ogundiranSections)}

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card card-pad">
        <h2 style="font-size:16px">School accounts at handover</h2>
        <p class="fine-print" style="margin-bottom:10px">Signatories: ${esc(r.signatories)} \u00b7 Balance as at handover: ${esc(r.accountBalance)}</p>
        <div class="table-wrap" style="max-height:none">
          <table class="data-table"><thead><tr><th>Account</th><th>Number</th><th>Status</th></tr></thead>
            <tbody>${r.handoverAccounts.map(a=>`<tr><td>${esc(a.account)}</td><td>${esc(a.number)}</td><td>${esc(a.status||"\u2014")}</td></tr>`).join("")}</tbody></table>
        </div>
      </div>
      <div class="card card-pad">
        <h2 style="font-size:16px">Staffing confirmed at handover</h2>
        ${kvRows([
          ["Permanent teaching staff", r.staffingAtHandover.permanentTeaching],
          ["P.T.A.-appointed teachers", r.staffingAtHandover.ptaAppointed],
          ["Non-teaching staff", r.staffingAtHandover.nonTeaching],
          ["Total", r.staffingAtHandover.total],
        ])}
      </div>
    </div>

    <div class="card card-pad">
      <h2 style="font-size:16px">Outstanding needs handed over</h2>
      <ul class="tidy-list">${r.outstandingNeeds.map(n=>`<li>${esc(n)}</li>`).join("")}</ul>
    </div>
  `;
})();

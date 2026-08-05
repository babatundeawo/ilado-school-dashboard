/* =========================================================
   staff.js — renders the Staff Directory page.
   ========================================================= */
(() => {
  const { esc, openDrawer, kvRows } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");

  const total = data.staff.teaching.length + data.staff.nonTeaching.length + data.staff.corps.length;
  if(!total){
    root.innerHTML = `
      <div class="empty-state">
        <div style="font-size:34px">🧑‍🏫</div>
        <h3>No staff roll imported</h3>
        <p>Import the detailed nominal roll workbook to see teaching, non-teaching and corps member records.</p>
        <a class="btn btn-gold" href="import.html">Import staff roll</a>
      </div>`;
    return;
  }

  const SENSITIVE_RE = /phone|gsm|whatsapp|email|address|dob|date_of_birth|residential/;
  const STAFF_COLUMNS = {
    teaching: [
      ["full_name_of_staff","Name"], ["gender","Gender"],
      ["present_post_prinpal_supervisor_vice_principal_tutor","Post"],
      ["main_subject_taught_consider_degree_cert","Main subject"],
      ["grade","Grade"], ["step","Step"], ["gsm_no","GSM"], ["email_address","Email"]
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
  let revealed = false;

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
      <div style="font-size:22px">📇</div>
      <div style="flex:1;min-width:240px">
        <strong style="display:block;margin-bottom:4px">Export to Google Contacts</strong>
        <p style="color:var(--ink-600);font-size:13px;max-width:65ch">
          Downloads one CSV with every staff member's phone, email, address, birthday, post and department, formatted
          for Google's contact importer — names, roles and departments included, nothing left out.
        </p>
      </div>
      <button class="btn btn-gold" id="gcExportBtn" style="align-self:center">📇 Export CSV for Google Contacts</button>
    </div>
    <div class="card">
      <div class="controls-row">
        <div class="field"><label>Category</label>
          <select id="stfTypeFilter">
            <option value="teaching">Teaching (${data.staff.teaching.length})</option>
            <option value="nonTeaching">Non-teaching (${data.staff.nonTeaching.length})</option>
            <option value="corps">Corps members (${data.staff.corps.length})</option>
          </select>
        </div>
        <div class="field" style="flex:1;min-width:200px"><label>Search</label>
          <input type="search" id="stfSearch" placeholder="Search by name…">
        </div>
        <button class="btn btn-ghost btn-sm" id="stfRevealBtn" style="align-self:flex-end">👁 Reveal sensitive fields</button>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="stfTable"><thead><tr id="stfHead"></tr></thead><tbody></tbody></table>
      </div>
    </div>`;

  document.getElementById("gcExportBtn").addEventListener("click", () => Common.exportGoogleContactsCsv(data.staff));

  function maskVal(key, val){
    const v = val===null||val===undefined||val==="" ? "—" : String(val);
    if(SENSITIVE_RE.test(key) && v!=="—" && !revealed) return `<span class="masked" data-reveal>${esc(v)}</span>`;
    return esc(v);
  }

  function showDrawer(rec, type){
    const cols = STAFF_COLUMNS[type];
    const shownKeys = new Set(cols.map(c=>c[0]));
    const extraEntries = Object.entries(rec).filter(([k]) => k!=="_source" && !shownKeys.has(k));
    const fmt = (k,v) => SENSITIVE_RE.test(k) ? `<span class="masked" data-reveal2>${esc(v ?? "—")}</span>` : esc(v ?? "—");
    openDrawer(rec[cols[0][0]] || "Staff record", `
      ${kvRows(cols.map(([k,label]) => [label, fmt(k, rec[k])]))}
      <h3 style="margin:18px 0 6px;font-size:14px">All fields on record</h3>
      ${kvRows(extraEntries.map(([k,v]) => [k.replace(/_/g," "), fmt(k, v)]))}
    `);
    Common.drawerEl().querySelectorAll("[data-reveal2]").forEach(el => el.addEventListener("click", () => el.classList.toggle("masked")));
  }

  function renderRows(){
    const type = document.getElementById("stfTypeFilter").value;
    const q = document.getElementById("stfSearch").value.toLowerCase();
    const cols = STAFF_COLUMNS[type];
    const nameKey = cols[0][0];
    const list = data.staff[type].filter(r => !q || String(r[nameKey]||"").toLowerCase().includes(q));

    document.getElementById("stfHead").innerHTML = cols.map(([,label]) => `<th>${esc(label)}</th>`).join("") + `<th></th>`;
    const tbody = document.querySelector("#stfTable tbody");
    tbody.innerHTML = list.map((r,i) => `
      <tr data-idx="${i}" style="cursor:pointer">
        ${cols.map(([key]) => `<td>${maskVal(key, r[key])}</td>`).join("")}
        <td><span class="pill pill-gold">View</span></td>
      </tr>`).join("") || `<tr><td colspan="${cols.length+1}" style="color:var(--ink-600)">No staff match this search.</td></tr>`;

    tbody.querySelectorAll("tr[data-idx]").forEach(tr => tr.addEventListener("click", (e) => {
      if(e.target.closest("[data-reveal]")) return;
      showDrawer(list[Number(tr.dataset.idx)], type);
    }));
    tbody.querySelectorAll("[data-reveal]").forEach(el => el.addEventListener("click", (ev) => { ev.stopPropagation(); el.classList.toggle("masked"); }));
  }

  document.getElementById("stfTypeFilter").addEventListener("change", renderRows);
  document.getElementById("stfSearch").addEventListener("input", renderRows);
  document.getElementById("stfRevealBtn").addEventListener("click", (e) => {
    revealed = !revealed;
    e.target.textContent = revealed ? "🙈 Hide sensitive fields" : "👁 Reveal sensitive fields";
    renderRows();
  });
  renderRows();
})();

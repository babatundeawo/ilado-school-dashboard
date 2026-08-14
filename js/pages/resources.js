/* =========================================================
   resources.js — renders the Inventory & Library page.
   Tabbed layout: the school's full property inventory and its
   library book catalogue, exactly as recorded in the 2026
   handover notes.
   ========================================================= */
(() => {
  const { esc } = Common;
  const data = DB.load();
  const res = data.resources;
  const root = document.getElementById("pageContent");

  if(!res){
    root.innerHTML = `<div class="empty-state"><h3>Inventory records not available</h3></div>`;
    return;
  }

  function genericTable(rows, opts={}){
    if(!rows || !rows.length) return `<p class="fine-print">No items recorded.</p>`;
    const cols = Object.keys(rows[0]);
    return `<div class="table-wrap" style="${opts.tall?'':'max-height:none'}">
      <table class="data-table">
        <thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
  }

  const TABS = [
    { id:"library", label:"Library catalogue" },
    { id:"offices", label:"Office inventories" },
    { id:"science", label:"Laboratory & science" },
    { id:"sports", label:"Sports & field" },
    { id:"registrar", label:"Registrar's documents" },
    { id:"general", label:"General store, staff room & charts" },
  ];

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px">
      <p class="lede">The school's recorded property inventory and full library catalogue, exactly as documented in the 2026 handover notes. Use the tabs below to browse each area.</p>
    </div>
    <div class="controls-row" style="padding:0 0 16px;flex-wrap:wrap">
      ${TABS.map((t,i)=>`<button class="btn ${i===0?'btn-primary':'btn-ghost'} btn-sm" data-tab="${t.id}">${t.label}</button>`).join("")}
    </div>
    <div id="tabPanels"></div>`;

  const panels = {
    library: () => `
      <div class="card" style="margin-bottom:18px">
        <div class="card-head"><div><h2>Full library book catalogue</h2><p>${res.libraryLedger.length} titles on record</p></div></div>
        <div class="controls-row"><div class="field" style="flex:1;min-width:220px"><label>Search titles</label><input type="search" id="libSearch" placeholder="Search the library catalogue\u2026"></div></div>
        <div class="table-wrap" id="libTableWrap"></div>
      </div>
      <div class="card card-pad">
        <h2 style="font-size:16px;margin-bottom:6px">Books collected from the L.I.E., 2025</h2>
        <p class="fine-print" style="margin-bottom:12px">Additional class sets supplied through the Local Inspectorate of Education</p>
        ${genericTable(res.lieBooks2025, {tall:true})}
      </div>`,
    offices: () => res.offices.map(o => `
      <div class="card card-pad" style="margin-bottom:18px">
        <h2 style="font-size:16px;margin-bottom:10px">${esc(o.name)}</h2>
        ${genericTable(o.items, {tall:true})}
      </div>`).join(""),
    science: () => `
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">Laboratory (general)</h2>${genericTable(res.laboratoryGeneral,{tall:true})}</div>
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">Chemistry materials</h2>${genericTable(res.chemistryMaterials,{tall:true})}</div>
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">Biology materials</h2>${genericTable(res.biologyMaterials,{tall:true})}</div>
      <div class="card card-pad"><h2 style="font-size:16px;margin-bottom:10px">Physics material</h2>${genericTable(res.physicsMaterial,{tall:true})}</div>`,
    sports: () => `<div class="card card-pad"><h2 style="font-size:16px;margin-bottom:10px">Sports equipment</h2>${genericTable(res.sportsEquipment,{tall:true})}</div>`,
    registrar: () => `<div class="card card-pad"><h2 style="font-size:16px;margin-bottom:10px">Registrar's office documents</h2>${genericTable(res.registrarDocuments,{tall:true})}</div>`,
    general: () => `
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">General store</h2>${genericTable(res.generalStore,{tall:true})}</div>
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">Staff room furniture</h2>${genericTable(res.staffRoom,{tall:true})}</div>
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">Library furniture</h2>${genericTable(res.libraryFurniture,{tall:true})}</div>
      <div class="card card-pad" style="margin-bottom:18px"><h2 style="font-size:16px;margin-bottom:10px">Agricultural equipment</h2>${genericTable(res.agriculturalEquipment,{tall:true})}</div>
      <div class="card card-pad"><h2 style="font-size:16px;margin-bottom:10px">Charts supplied by the Ministry of Education</h2>${genericTable(res.chartsMinistry,{tall:true})}</div>`,
  };

  function renderLibraryTable(q){
    const query = (q||"").toLowerCase();
    const cols = Object.keys(res.libraryLedger[0]);
    const rows = res.libraryLedger.filter(r => !query || String(r[cols[1]]||"").toLowerCase().includes(query));
    document.getElementById("libTableWrap").innerHTML = `
      <table class="data-table">
        <thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" style="color:var(--ink-600)">No titles match this search.</td></tr>`}</tbody>
      </table>`;
  }

  function showTab(id){
    document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("btn-primary", b.dataset.tab===id));
    document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("btn-ghost", b.dataset.tab!==id));
    document.getElementById("tabPanels").innerHTML = panels[id]();
    if(id==="library"){
      renderLibraryTable("");
      document.getElementById("libSearch").addEventListener("input", e => renderLibraryTable(e.target.value));
    }
  }

  document.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click", () => showTab(btn.dataset.tab)));
  showTab("library");
})();

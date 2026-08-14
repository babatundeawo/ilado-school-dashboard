/* =========================================================
   nav.js — wiring shared by every page: mobile nav, clear-data
   button, theme toggle, animated stat counters, and a Cmd/Ctrl+K
   command palette that searches pages, students and staff.
   ========================================================= */
(() => {
  Common.wireMobileNav();
  Common.wireClearDataButton();
  Common.initTheme();
  document.addEventListener("DOMContentLoaded", Common.wireCounters);
  if(document.readyState !== "loading") Common.wireCounters();

  const PAGES = [
    { href: "index.html", label: "Overview", hint: "Dashboard and quick stats" },
    { href: "about.html", label: "School Profile", hint: "History, curriculum, PTA, SGB" },
    { href: "students.html", label: "Student Registry", hint: "Search the student roll" },
    { href: "results.html", label: "Term Records", hint: "Attendance and subject coverage" },
    { href: "marking.html", label: "Continuous Assessment", hint: "CA coverage by class and term" },
    { href: "staff.html", label: "Staff Directory", hint: "Teaching, non-teaching, PTA staff" },
    { href: "retirement.html", label: "Retirement & Handover", hint: "2026 ceremonies and handover" },
    { href: "events.html", label: "Events & Speeches", hint: "Addresses and official speeches" },
    { href: "resources.html", label: "Inventory & Library", hint: "Full inventories and book catalogue" },
    { href: "import.html", label: "Import Data", hint: "Load or refresh workbooks" },
  ];

  function buildPalette(){
    const wrap = document.createElement("div");
    wrap.className = "cmdk-backdrop";
    wrap.innerHTML = `
      <div class="cmdk">
        <div class="cmdk-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="cmdkInput" placeholder="Search pages, students, staff\u2026" autocomplete="off">
          <kbd>Esc</kbd>
        </div>
        <div class="cmdk-list" id="cmdkList"></div>
      </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  let paletteEl, listEl, inputEl, activeIdx = 0, currentItems = [];

  function renderResults(q){
    const query = q.trim().toLowerCase();
    let items = [];
    if(!query){
      items = PAGES.map(p => ({ type:"page", label:p.label, sub:p.hint, href:p.href }));
    }else{
      items = PAGES.filter(p => p.label.toLowerCase().includes(query))
        .map(p => ({ type:"page", label:p.label, sub:p.hint, href:p.href }));
      try{
        const data = DB.load();
        (data.students||[]).forEach(s => {
          if(items.length >= 30) return;
          if((s.name||"").toLowerCase().includes(query)){
            items.push({ type:"student", label:s.name, sub:`${s.class||""} \u00b7 Student`, href:`students.html` });
          }
        });
        const staffAll = [
          ...(data.staff?.teaching||[]).map(s=>({name:s.full_name_of_staff, sub:"Teaching staff"})),
          ...(data.staff?.nonTeaching||[]).map(s=>({name:s.full_name, sub:"Non-teaching staff"})),
        ];
        staffAll.forEach(s => {
          if(items.length >= 34) return;
          if((s.name||"").toLowerCase().includes(query)){
            items.push({ type:"staff", label:s.name, sub:s.sub, href:`staff.html` });
          }
        });
      }catch(e){ /* DB not ready on this page */ }
    }
    currentItems = items.slice(0, 24);
    activeIdx = 0;
    listEl.innerHTML = currentItems.length ? currentItems.map((it, i) => `
      <a href="${it.href}" class="cmdk-item ${i===0?'is-active':''}" data-idx="${i}">
        <span class="cmdk-icon">${it.type==="page"?"\u25A2":it.type==="student"?"\u{1F393}":"\u{1F9D1}\u200D\u{1F3EB}"}</span>
        <span class="cmdk-text"><strong>${Common.esc(it.label)}</strong><small>${Common.esc(it.sub||"")}</small></span>
      </a>`).join("") : `<div class="cmdk-empty">No matches.</div>`;
  }

  function openPalette(){
    if(!paletteEl){ paletteEl = buildPalette(); listEl = document.getElementById("cmdkList"); inputEl = document.getElementById("cmdkInput");
      inputEl.addEventListener("input", () => renderResults(inputEl.value));
      paletteEl.addEventListener("click", (e) => { if(e.target === paletteEl) closePalette(); });
      document.addEventListener("keydown", (e) => {
        if(!paletteEl.classList.contains("is-open")) return;
        if(e.key === "Escape") closePalette();
        if(e.key === "ArrowDown"){ e.preventDefault(); moveActive(1); }
        if(e.key === "ArrowUp"){ e.preventDefault(); moveActive(-1); }
        if(e.key === "Enter"){ const it = currentItems[activeIdx]; if(it) location.href = it.href; }
      });
    }
    renderResults("");
    paletteEl.classList.add("is-open");
    setTimeout(() => inputEl.focus(), 30);
  }
  function closePalette(){ paletteEl?.classList.remove("is-open"); }
  function moveActive(delta){
    const items = listEl.querySelectorAll(".cmdk-item");
    if(!items.length) return;
    activeIdx = (activeIdx + delta + items.length) % items.length;
    items.forEach((el,i) => el.classList.toggle("is-active", i===activeIdx));
    items[activeIdx].scrollIntoView({ block:"nearest" });
  }

  document.addEventListener("keydown", (e) => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); openPalette(); }
  });
  document.querySelectorAll("[data-open-search]").forEach(btn => btn.addEventListener("click", openPalette));
})();

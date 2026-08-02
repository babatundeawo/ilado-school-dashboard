/* =========================================================
   app.js — wires routing, imports, and interactions together.
   ========================================================= */
(() => {
  const VIEW_META = {
    overview: { title:"Overview", subtitle:"A snapshot of the school register, drawn from whatever you've imported so far." },
    students: { title:"Student Registry", subtitle:"Every learner currently on record, searchable by class, gender and name." },
    results:  { title:"E-Results", subtitle:"Term-by-term subject performance, parsed straight from the result workbooks." },
    marking:  { title:"Marking Sheets", subtitle:"Continuous assessment: attendance, notebook, textbook, open day and exam scores." },
    staff:    { title:"Staff Directory", subtitle:"Teaching, non-teaching and corps member records. Sensitive fields are hidden by default." },
    import:   { title:"Import Data", subtitle:"Load your Excel workbooks below. Everything is processed locally in this browser." }
  };

  let currentView = "overview";
  let pendingImportLabel = null;

  const viewport = document.getElementById("viewport");
  const fileInput = document.getElementById("fileInput");
  const bundleFileInput = document.getElementById("bundleFileInput");

  function toast(msg){
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-visible"), 3200);
  }

  /* ---------------- Drawer ---------------- */
  let backdrop, drawer;
  function ensureDrawer(){
    if(drawer) return;
    backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    drawer = document.createElement("div");
    drawer.className = "drawer";
    drawer.innerHTML = `
      <div class="drawer-head"><h3 id="drawerTitle"></h3><button id="drawerClose" aria-label="Close">×</button></div>
      <div class="drawer-body" id="drawerBody"></div>`;
    document.body.append(backdrop, drawer);
    backdrop.addEventListener("click", closeDrawer);
    drawer.querySelector("#drawerClose").addEventListener("click", closeDrawer);
  }
  function openDrawer(title, bodyHtml){
    ensureDrawer();
    drawer.querySelector("#drawerTitle").textContent = title;
    drawer.querySelector("#drawerBody").innerHTML = bodyHtml;
    backdrop.classList.add("is-open");
    drawer.classList.add("is-open");
  }
  function closeDrawer(){
    if(!drawer) return;
    backdrop.classList.remove("is-open");
    drawer.classList.remove("is-open");
  }

  function kvRows(pairs){
    return pairs.map(([k,v]) => `<div class="kv-row"><span>${Views.esc(k)}</span><span>${v}</span></div>`).join("");
  }

  /* ---------------- Routing / rendering ---------------- */
  function setActiveNav(view){
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("is-active", b.dataset.view===view));
  }

  function render(view){
    currentView = view;
    setActiveNav(view);
    document.getElementById("viewTitle").textContent = VIEW_META[view].title;
    document.getElementById("viewSubtitle").textContent = VIEW_META[view].subtitle;
    const data = DB.load();
    viewport.innerHTML = Views[view](data);
    wireView(view, data);
    wireBundleDropzones();
    viewport.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => render(b.dataset.goto)));
  }

  function wireView(view, data){
    if(view === "students"){
      const rerun = () => Views.renderStudentRows(data);
      ["stuClassFilter","stuGenderFilter"].forEach(id => document.getElementById(id)?.addEventListener("change", rerun));
      document.getElementById("stuSearch")?.addEventListener("input", rerun);
      document.getElementById("stuExportBtn")?.addEventListener("click", () => exportCsv(Views.renderStudentRows(data), "student_registry.csv"));
      rerun();
    }

    if(view === "results"){
      const classSel = document.getElementById("resClassFilter");
      const termSel = document.getElementById("resTermFilter");
      const showDrawer = (rec) => {
        const avg = Views.studentAverage(rec);
        const subjRows = rec.subjects.map(s => `<div class="kv-row"><span>${Views.esc(s.subject)}</span><span>${s.total ?? "—"} <span style="color:var(--text-400);font-weight:400">(CA ${s.ca ?? "—"} · Exam ${s.exam ?? "—"})</span></span></div>`).join("");
        openDrawer(rec.name, `
          ${kvRows([
            ["Admission No.", Views.esc(rec.admissionNo||"—")],
            ["Class", Views.esc(rec.class)],
            ["Term", Views.esc(rec.term||"—")],
            ["Attendance", rec.timesOpened ? `${rec.timesPresent}/${rec.timesOpened} days` : "—"],
            ["Overall average", avg!==null ? avg.toFixed(1) : "—"],
          ])}
          <h3 style="margin:18px 0 6px;font-size:14px">Subject scores</h3>
          ${subjRows || `<p style="color:var(--text-600);font-size:13px">No subject data on this record.</p>`}
        `);
      };
      const rerun = () => Views.renderResultRows(data, showDrawer);
      classSel?.addEventListener("change", () => { Views.refreshResultTermOptions(data); rerun(); });
      termSel?.addEventListener("change", rerun);
      document.getElementById("resSearch")?.addEventListener("input", rerun);
      if(classSel){ Views.refreshResultTermOptions(data); rerun(); }
    }

    if(view === "marking"){
      const classSel = document.getElementById("mkClassFilter");
      const termSel = document.getElementById("mkTermFilter");
      const rerun = () => Views.renderMarkingRows(data);
      classSel?.addEventListener("change", () => { Views.refreshMarkingTermOptions(data); rerun(); });
      termSel?.addEventListener("change", rerun);
      document.getElementById("mkSearch")?.addEventListener("input", rerun);
      if(classSel){ Views.refreshMarkingTermOptions(data); rerun(); }
    }

    if(view === "staff"){
      const showDrawer = (rec, type) => {
        const cols = Views.STAFF_COLUMNS[type];
        const shownKeys = new Set(cols.map(c=>c[0]));
        const extraEntries = Object.entries(rec).filter(([k]) => k!=="_source" && !shownKeys.has(k));
        const fmt = (k,v) => Views.SENSITIVE_RE.test(k) ? `<span class="masked" data-reveal2>${Views.esc(v ?? "—")}</span>` : Views.esc(v ?? "—");
        openDrawer(rec[cols[0][0]] || "Staff record", `
          ${kvRows(cols.map(([k,label]) => [label, fmt(k, rec[k])]))}
          <h3 style="margin:18px 0 6px;font-size:14px">All fields on record</h3>
          ${kvRows(extraEntries.map(([k,v]) => [k.replace(/_/g," "), fmt(k, v instanceof Date ? v.toISOString().slice(0,10) : v)]))}
        `);
        drawer.querySelectorAll("[data-reveal2]").forEach(el => el.addEventListener("click", () => el.classList.toggle("masked")));
      };
      const rerun = () => Views.renderStaffRows(data, showDrawer);
      document.getElementById("stfTypeFilter")?.addEventListener("change", rerun);
      document.getElementById("stfSearch")?.addEventListener("input", rerun);
      document.getElementById("stfRevealBtn")?.addEventListener("click", (e) => {
        const on = Views.toggleStaffReveal();
        e.target.textContent = on ? "🙈 Hide sensitive fields" : "👁 Reveal sensitive fields";
        rerun();
      });
      rerun();
    }

    if(view === "import"){
      viewport.querySelectorAll("[data-import]").forEach(btn => {
        btn.addEventListener("click", () => {
          pendingImportLabel = btn.dataset.import;
          fileInput.multiple = pendingImportLabel === "results";
          fileInput.click();
        });
      });
    }
  }

  /* ---------------- Import pipeline ---------------- */
  function replaceByFile(list, fileNames, matchKey){
    return list.filter(item => !fileNames.includes(item[matchKey]));
  }

  function importOneFile(data, label, file, wb){
    let rows = 0;
    if(label === "students"){
      data.students = data.students.filter(s => !(s.source||"").startsWith(file.name));
      const parsed = Parsers.parseStudentRegistry(wb, file.name);
      data.students.push(...parsed);
      rows = parsed.length;
    }else if(label === "marking"){
      data.marking = data.marking.filter(m => m.file !== file.name);
      const parsed = Parsers.parseMarkingSheet(wb, file.name);
      data.marking.push(...parsed);
      rows = parsed.length;
    }else if(label === "results"){
      data.results = data.results.filter(r => r.file !== file.name);
      const parsed = Parsers.parseEResult(wb, file.name);
      data.results.push(...parsed);
      rows = parsed.length;
    }else if(label === "staff"){
      const parsed = Parsers.parseStaffRoll(wb, file.name);
      ["teaching","nonTeaching","corps"].forEach(k => {
        data.staff[k] = data.staff[k].filter(s => s._source !== file.name);
        data.staff[k].push(...parsed[k]);
        rows += parsed[k].length;
      });
    }
    return rows;
  }

  async function handleFiles(label, files){
    const data = DB.load();
    let totalRows = 0;
    const fileNames = Array.from(files).map(f=>f.name);

    for(const file of files){
      try{
        const wb = await Parsers.readFileAsWorkbook(file);
        totalRows += importOneFile(data, label, file, wb);
      }catch(err){
        console.error(err);
        toast(`Couldn't read "${file.name}" — check it's a valid Excel file.`);
      }
    }

    DB.save();
    DB.logImport({ label, fileName: fileNames.join(", "), rows: totalRows });
    toast(`Imported ${totalRows} row(s) from ${fileNames.length} file(s).`);
    render(currentView);
  }

  async function handleBundle(files){
    const data = DB.load();
    const summary = { students:0, marking:0, results:0, staff:0 };
    const unknownFiles = [];

    for(const file of files){
      try{
        const wb = await Parsers.readFileAsWorkbook(file);
        const label = Parsers.classifyWorkbook(wb);
        if(label === "unknown"){ unknownFiles.push(file.name); continue; }
        const rows = importOneFile(data, label, file, wb);
        summary[label] += rows;
        DB.logImport({ label, fileName: file.name, rows });
      }catch(err){
        console.error(err);
        unknownFiles.push(file.name);
      }
    }

    DB.save();
    const parts = Object.entries(summary).filter(([,n])=>n>0).map(([k,n]) => `${n} ${k}`);
    let msg = parts.length ? `Imported: ${parts.join(", ")}.` : "Nothing recognisable was imported.";
    if(unknownFiles.length) msg += ` Couldn't identify: ${unknownFiles.join(", ")}.`;
    toast(msg);
    render(currentView);
  }

  function wireBundleDropzones(){
    document.querySelectorAll("[data-bundle-drop]").forEach(zone => {
      zone.addEventListener("click", (e) => {
        if(e.target.closest("[data-bundle-browse]") || e.target === zone) bundleFileInput.click();
      });
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-drag"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("is-drag"));
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("is-drag");
        if(e.dataTransfer.files.length) handleBundle(e.dataTransfer.files);
      });
    });
  }

  fileInput.addEventListener("change", (e) => {
    if(e.target.files.length) handleFiles(pendingImportLabel, e.target.files);
    fileInput.value = "";
  });

  bundleFileInput.addEventListener("change", (e) => {
    if(e.target.files.length) handleBundle(e.target.files);
    bundleFileInput.value = "";
  });

  document.getElementById("topImportBtn").addEventListener("click", () => render("import"));

  document.getElementById("clearDataBtn").addEventListener("click", () => {
    if(confirm("Clear all imported data from this browser? This can't be undone.")){
      DB.clearAll();
      toast("All local data cleared.");
      render(currentView);
    }
  });

  document.getElementById("mainNav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if(btn) render(btn.dataset.view);
  });

  /* ---------------- CSV export ---------------- */
  function exportCsv(rows, filename){
    if(!rows || !rows.length){ toast("Nothing to export with current filters."); return; }
    const cols = Object.keys(rows[0]);
    const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const csv = [cols.join(",")].concat(rows.map(r => cols.map(c=>esc(r[c])).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------------- Boot ---------------- */
  render("overview");
})();

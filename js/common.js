/* =========================================================
   common.js — small helpers shared by every page's script.
   Must load after db.js (and parsers.js on pages that need
   file import) and before the page's own js/pages/*.js file.
   ========================================================= */
const Common = (() => {

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function uniq(arr){ return [...new Set(arr.filter(v => v !== null && v !== undefined && v !== ""))]; }

  /* ---------------- Theme (light only, v2) ---------------- */
  function applyTheme(){
    document.documentElement.setAttribute("data-theme", "light");
  }
  function initTheme(){
    applyTheme();
  }

  /* ---------------- Toast ---------------- */
  function toast(msg){
    const el = document.getElementById("toast");
    if(!el) return;
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
      <div class="drawer-head"><h3 id="drawerTitle"></h3><button id="drawerClose" aria-label="Close">\u00d7</button></div>
      <div class="drawer-body" id="drawerBody"></div>`;
    document.body.append(backdrop, drawer);
    backdrop.addEventListener("click", closeDrawer);
    drawer.querySelector("#drawerClose").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeDrawer(); });
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
  function drawerEl(){ ensureDrawer(); return drawer; }
  function kvRows(pairs){
    return pairs.map(([k,v]) => `<div class="kv-row"><span>${esc(k)}</span><span>${v}</span></div>`).join("");
  }

  /* ---------------- Mobile off-canvas nav ---------------- */
  function wireMobileNav(){
    const sidebar = document.querySelector(".sidebar");
    const trigger = document.getElementById("navTrigger");
    if(!sidebar || !trigger) return;
    let bd = document.querySelector(".sidebar-backdrop");
    if(!bd){
      bd = document.createElement("div");
      bd.className = "sidebar-backdrop";
      document.body.appendChild(bd);
    }
    const open = () => { sidebar.classList.add("is-open"); bd.classList.add("is-open"); };
    const close = () => { sidebar.classList.remove("is-open"); bd.classList.remove("is-open"); };
    trigger.addEventListener("click", open);
    bd.addEventListener("click", close);
    sidebar.querySelectorAll(".nav-item").forEach(a => a.addEventListener("click", close));
  }

  /* ---------------- Clear-data control (present in every sidebar) ---------------- */
  function wireClearDataButton(){
    document.getElementById("clearDataBtn")?.addEventListener("click", () => {
      if(confirm("Clear all imported register data (students, results, marking, staff) from this browser? School profile and retirement pages are unaffected. This can't be undone.")){
        DB.clearImportedOnly();
        toast("Imported register data cleared.");
        setTimeout(() => location.reload(), 400);
      }
    });
  }

  /* ---------------- Animated stat counters ---------------- */
  function animateCount(el, target, duration=900){
    if(!el) return;
    const start = 0;
    const t0 = performance.now();
    function tick(now){
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
      if(p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }
  function wireCounters(){
    document.querySelectorAll("[data-count]").forEach(el => {
      const target = Number(el.dataset.count) || 0;
      animateCount(el, target);
    });
  }

  /* ---------------- Bundle import (auto-detects each file) ---------------- */
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

  async function handleBundle(files, { reloadAfter = true } = {}){
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
    if(unknownFiles.length) msg += ` Could not identify: ${unknownFiles.join(", ")}.`;
    toast(msg);
    if(reloadAfter) setTimeout(() => location.reload(), 700);
    return summary;
  }

  function wireBundleDropzones(bundleInput){
    document.querySelectorAll("[data-bundle-drop]").forEach(zone => {
      zone.addEventListener("click", (e) => {
        if(e.target.closest("[data-bundle-browse]") || e.target === zone || zone.contains(e.target)) bundleInput.click();
      });
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-drag"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("is-drag"));
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("is-drag");
        if(e.dataTransfer.files.length) handleBundle(e.dataTransfer.files);
      });
    });
    bundleInput.addEventListener("change", (e) => {
      if(e.target.files.length) handleBundle(e.target.files);
      bundleInput.value = "";
    });
  }

  function bundleDropzoneHtml(idSuffix=""){
    return `
      <div class="dropzone" id="bundleDrop${idSuffix}" data-bundle-drop>
        <div style="font-size:26px;margin-bottom:8px">\u{1F4E5}</div>
        <strong>Drop all your workbooks here</strong>
        <span>Student registry, marking sheet, e-results, staff roll: drop them all at once, this will sort out which is which.</span>
        <div style="margin-top:14px"><button class="btn btn-gold btn-sm" type="button" data-bundle-browse>Or choose files\u2026</button></div>
      </div>`;
  }

  /* ---------------- CSV export ---------------- */
  function exportCsv(rows, filename){
    if(!rows || !rows.length){ toast("Nothing to export with current filters."); return; }
    const cols = Object.keys(rows[0]);
    const escCsv = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const csv = [cols.join(",")].concat(rows.map(r => cols.map(c=>escCsv(r[c])).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------------- Google Contacts CSV export ---------------- */
  const SCHOOL_NAME = "Ilado-Sagbo Community Grammar School";

  const CONTACT_CATEGORY_CONFIG = {
    teaching: {
      nameKey:"full_name_of_staff", genderKey:"gender", dobKey:"date_of_birth_dd_mm_yyy",
      emailKey:"email_address", phoneKeys:["gsm_no","gsm_whatsapp_no_only"],
      titleKey:"present_post_prinpal_supervisor_vice_principal_tutor",
      deptKey:"main_subject_taught_consider_degree_cert",
      addressKey:"residential_address", groupLabel:"ISCGS Teaching Staff",
      extraNotes:[
        ["lg_of_origin","LGA of Origin"], ["post_on_first_appointment","Post on First Appointment"],
        ["date_of_first_appointment_dd_mm_yyyy","Date of First Appointment"],
        ["date_of_last_promotion_dd_mm_yyyy","Date of Last Promotion"],
        ["date_of_retirement_dd_mm_yyyy","Date of Retirement"],
        ["date_posted_to_present_school","Date Posted to Present School"],
        ["qualifications_with_dates","Qualifications"],
        ["area_of_specialization_consider_degree_cert","Area of Specialization"],
        ["other_teaching_subject_consider_nce_cert","Other Teaching Subject"],
        ["junior_classes_taught","Junior Classes Taught"], ["senior_classes_taught","Senior Classes Taught"],
        ["total_period_per_week","Periods per Week"], ["grade","Grade"], ["step","Step"],
        ["disability_yes_no","Disability"], ["remark","Remark"]
      ]
    },
    nonTeaching: {
      nameKey:"full_name", genderKey:"gender", dobKey:"date_of_birth",
      emailKey:null, phoneKeys:["gsm_whatsapp_no_only"],
      titleKey:"job_title", deptKey:null,
      addressKey:"home_address", groupLabel:"ISCGS Non-Teaching Staff",
      extraNotes:[
        ["date_of_first_appointment","Date of First Appointment"],
        ["date_of_last_promotion","Date of Last Promotion"],
        ["date_of_retirement","Date of Retirement"],
        ["date_posted_to_present_school","Date Posted to Present School"],
        ["qualifications_with_date","Qualifications"], ["teaching_qualifications","Teaching Qualifications"],
        ["area_of_specialization","Area of Specialization"], ["grade","Grade"], ["step","Step"],
        ["disability_yes_no","Disability"], ["remark","Remark"]
      ]
    },
    corps: {
      nameKey:"full_name", genderKey:"gender", dobKey:"date_of_birth",
      emailKey:null, phoneKeys:["gsm_whatsapp_no_only"],
      titleKey:"classes_taught", deptKey:"teaching_subject_s",
      addressKey:"home_address", groupLabel:"ISCGS Corps Members",
      extraNotes:[
        ["date_of_first_appointment","Date of First Appointment"],
        ["grade","Grade"], ["step","Step"], ["disability_yes_no","Disability"], ["remark","Remark"]
      ]
    }
  };

  function formatNgPhone(v){
    if(v===null || v===undefined || v==="") return "";
    const digits = String(v).replace(/\D/g,"");
    if(!digits) return "";
    if(digits.length===10) return "0"+digits;
    if(digits.length===13 && digits.startsWith("234")) return "+"+digits;
    return digits;
  }

  function buildContactRows(list, cfg){
    return (list||[]).map(r => {
      const name = String(r[cfg.nameKey] || "").trim();
      if(!name) return null;
      const parts = name.split(/\s+/);
      const family = parts[0] || "";
      const given = parts.slice(1).join(" ");

      const email = cfg.emailKey ? String(r[cfg.emailKey] || "").trim() : "";
      let phone = "";
      for(const pk of cfg.phoneKeys){ if(r[pk]){ phone = formatNgPhone(r[pk]); break; } }
      const title = cfg.titleKey ? String(r[cfg.titleKey] || "").trim() : "";
      const dept = cfg.deptKey ? String(r[cfg.deptKey] || "").trim() : "";
      const address = cfg.addressKey ? String(r[cfg.addressKey] || "").trim() : "";
      const dobRaw = cfg.dobKey ? String(r[cfg.dobKey] || "") : "";
      const birthday = /^\d{4}-\d{2}-\d{2}$/.test(dobRaw) ? dobRaw : "";

      const notesLines = [];
      (cfg.extraNotes || []).forEach(([k,label]) => {
        const v = r[k];
        if(v !== null && v !== undefined && String(v).trim() !== "") notesLines.push(`${label}: ${v}`);
      });

      return {
        "Name": name, "Given Name": given, "Family Name": family,
        "Birthday": birthday, "Gender": r[cfg.genderKey] || "",
        "E-mail 1 - Type": email ? "Work" : "", "E-mail 1 - Value": email,
        "Phone 1 - Type": phone ? "Mobile" : "", "Phone 1 - Value": phone,
        "Organization 1 - Type": "Work", "Organization 1 - Name": SCHOOL_NAME,
        "Organization 1 - Title": title, "Organization 1 - Department": dept,
        "Address 1 - Type": address ? "Home" : "", "Address 1 - Formatted": address,
        "Notes": notesLines.join("\n"),
        "Group Membership": cfg.groupLabel
      };
    }).filter(Boolean);
  }

  function exportGoogleContactsCsv(staffData){
    const rows = [
      ...buildContactRows(staffData.teaching, CONTACT_CATEGORY_CONFIG.teaching),
      ...buildContactRows(staffData.nonTeaching, CONTACT_CATEGORY_CONFIG.nonTeaching),
      ...buildContactRows(staffData.corps, CONTACT_CATEGORY_CONFIG.corps),
    ];
    if(!rows.length){ toast("No staff records to export."); return; }

    const headers = ["Name","Given Name","Family Name","Birthday","Gender",
      "E-mail 1 - Type","E-mail 1 - Value","Phone 1 - Type","Phone 1 - Value",
      "Organization 1 - Type","Organization 1 - Name","Organization 1 - Title","Organization 1 - Department",
      "Address 1 - Type","Address 1 - Formatted","Notes","Group Membership"];
    const escCsv = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => escCsv(r[h])).join(","))).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "iscgs_staff_google_contacts.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Exported ${rows.length} staff contact(s), ready to import into Google Contacts.`);
  }

  return {
    esc, uniq, toast, openDrawer, closeDrawer, drawerEl, kvRows,
    wireClearDataButton, wireMobileNav, handleBundle, wireBundleDropzones, bundleDropzoneHtml,
    exportCsv, importOneFile, exportGoogleContactsCsv, initTheme, wireCounters, animateCount
  };
})();

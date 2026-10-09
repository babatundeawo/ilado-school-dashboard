import { boot } from "../app.js";
import { loadDataset, saveDataset, computeSummary } from "../lib/store.js";
import { $, icon } from "../lib/util.js";
import { toast, confirmDialog, finishRender } from "../lib/ui.js";
import {
  loadXlsx, readFileAsWorkbook, classifyWorkbook, parseStudentRegistry, parseMarkingSheet, parseEResult, parseStaffRoll,
  toStoredMarking, toStoredResults
} from "../lib/parsers.js";

const { root } = await boot();

root.innerHTML = `
  <div class="alert alert-success" role="note">${icon("lock")}<div><strong>Your files are read in this browser.</strong> Only the cleaned records are saved to your private Firebase database, where the security rules let approved members read them. Assessment marks are never saved.</div></div>

  <section class="card card-pad stack" aria-labelledby="seedTitle">
    <h2 id="seedTitle">1. Load the school data file</h2>
    <p class="lede">Use this once to move the existing records (students, staff, school profile, retirement, inventory) into the secure database. Choose the <strong>data.js</strong> file from the original project. It stays on your computer; it is not uploaded to GitHub.</p>
    <div class="row"><input class="input" id="seedFile" type="file" accept=".js,.json,application/json,text/javascript" aria-label="Choose data.js"><button class="btn btn-primary" id="seedBtn" type="button" disabled>Load into database</button></div>
    <ol class="steps" id="seedSteps" aria-live="polite"></ol>
  </section>

  <section class="card card-pad stack" aria-labelledby="wbTitle">
    <h2 id="wbTitle">2. Add or refresh from workbooks</h2>
    <p class="lede">Drop your Excel workbooks (student registry, marking sheet, E-results, staff roll). Each file is recognised automatically, and re-importing a file replaces its earlier rows.</p>
    <div class="field field-narrow"><label for="wbKind">These files are</label>
      <select class="select" id="wbKind"><option value="">Detect automatically</option><option value="students">Student registry</option><option value="marking">Marking sheet</option><option value="results">E-results</option><option value="staff">Staff nominal roll</option></select></div>
    <div class="dropzone" id="drop" tabindex="0" role="button" aria-label="Choose workbook files">
      ${icon("upload")}<strong>Drop workbooks here</strong><span class="fine">.xlsx, .xlsm or .xls. You can choose several at once.</span>
      <button class="btn btn-sm" type="button" id="browse">Or choose files</button>
    </div>
    <input id="wbInput" type="file" accept=".xlsx,.xlsm,.xls" multiple hidden>
    <ol class="steps" id="wbSteps" aria-live="polite"></ol>
  </section>`;
finishRender(root);

/* ---------- Progress list ---------- */
function steps(el) {
  return {
    add(label) { const li = document.createElement("li"); li.textContent = label; li.className = "is-active"; el.append(li); return li; },
    done(li, label) { li.className = "is-done"; if (label) li.textContent = label; },
    fail(li, label) { li.className = "is-fail"; li.textContent = label; },
    clear() { el.innerHTML = ""; }
  };
}

/* ---------- 1. Seed from data.js ---------- */
const seedInput = $("#seedFile"), seedBtn = $("#seedBtn"), seedSteps = steps($("#seedSteps"));
seedInput.addEventListener("change", () => { seedBtn.disabled = !seedInput.files.length; });

function parsePreloaded(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("This doesn't look like the school data file.");
  const data = JSON.parse(text.slice(a, b + 1));
  if (!Array.isArray(data.students) || !data.staff || !data.school) throw new Error("This file is missing the expected sections (students, staff, school).");
  return data;
}

/** Defence in depth: keep only the fields the app shows, so marks can never slip in. */
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
const RESULT_KEYS = ["name", "admissionNo", "gender", "class", "term", "studentsInClass", "timesOpened", "timesPresent", "timesAbsent", "subjects", "source"];
const MARKING_KEYS = ["name", "gender", "class", "term", "status", "source"];

seedBtn.addEventListener("click", async () => {
  const ok = await confirmDialog({
    title: "Load the school data?",
    body: "<p>This replaces any records already in the database with the contents of this file.</p>",
    confirmLabel: "Load data"
  });
  if (!ok) return;
  seedBtn.disabled = true; seedBtn.classList.add("is-loading"); seedSteps.clear();
  let li = seedSteps.add("Reading the file");
  try {
    const d = parsePreloaded(await seedInput.files[0].text());
    seedSteps.done(li, `Read the file (${d.students.length} students)`);

    const retirement = { ...d.retirement };
    const accounts = { handoverAccounts: retirement.handoverAccounts || [], accountBalance: retirement.accountBalance || "", signatories: retirement.signatories || "" };
    delete retirement.handoverAccounts; delete retirement.accountBalance; delete retirement.signatories;

    const results = (d.results || []).map((r) => pick(r, RESULT_KEYS));
    const marking = (d.marking || []).map((m) => pick(m, MARKING_KEYS));
    const jobs = [
      ["Student registry", () => saveDataset("students", d.students)],
      ["Term records", () => saveDataset("results", results)],
      ["Continuous assessment coverage", () => saveDataset("marking", marking)],
      ["Staff", () => saveDataset("staff", d.staff)],
      ["School profile", () => saveDataset("school", d.school)],
      ["Retirement and handover", () => saveDataset("retirement", retirement)],
      ["Restricted account details", () => saveDataset("retirementAccounts", accounts, { restricted: true })],
      ["Inventory and library", () => saveDataset("resources", d.resources)],
      ["Events and speeches", () => saveDataset("events", d.events || [])],
      ["Overview totals", () => saveDataset("summary", computeSummary({ students: d.students, results, marking, staff: d.staff, imports: d.meta?.imports || [], dataPolicy: d.meta?.dataPolicy || "" }))]
    ];
    for (const [label, run] of jobs) {
      li = seedSteps.add(`Saving ${label.toLowerCase()}`);
      try { await run(); seedSteps.done(li, `Saved ${label.toLowerCase()}`); } catch (e) { seedSteps.fail(li, `Couldn't save ${label.toLowerCase()}: ${e.code || e.message}`); throw e; }
    }
    toast("All records are now in the secure database.");
  } catch (e) {
    seedSteps.fail(li, e.code === "permission-denied" ? "Permission denied: publish the security rules and make sure your account is an administrator." : (e.message || "Something went wrong."));
    toast("The data wasn't fully loaded. See the list for details.", { error: true });
  } finally { seedBtn.classList.remove("is-loading"); seedBtn.disabled = !seedInput.files.length; }
});

/* ---------- 2. Workbooks ---------- */
const drop = $("#drop"), wbInput = $("#wbInput"), wbSteps = steps($("#wbSteps"));
drop.addEventListener("click", () => wbInput.click());
drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wbInput.click(); } });
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-drag"); });
drop.addEventListener("dragleave", () => drop.classList.remove("is-drag"));
drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-drag"); if (e.dataTransfer.files.length) importFiles([...e.dataTransfer.files]); });
wbInput.addEventListener("change", () => { if (wbInput.files.length) importFiles([...wbInput.files]); wbInput.value = ""; });

async function importFiles(files) {
  wbSteps.clear();
  let li = wbSteps.add("Preparing the spreadsheet reader");
  try { await loadXlsx(); wbSteps.done(li, "Spreadsheet reader ready"); } catch (e) { wbSteps.fail(li, e.message); return; }

  li = wbSteps.add("Loading current records");
  let students, marking, results, staff, summary;
  try {
    [students, marking, results, staff, summary] = await Promise.all(["students", "marking", "results", "staff", "summary"].map((k) => loadDataset(k)));
    students ||= []; marking ||= []; results ||= []; staff ||= { teaching: [], nonTeaching: [], corps: [], ptaAppointed: [] };
    ["teaching", "nonTeaching", "corps", "ptaAppointed"].forEach((k) => { staff[k] ||= []; });
    wbSteps.done(li, "Current records loaded");
  } catch (e) { wbSteps.fail(li, "Couldn't read the current records: " + (e.code || e.message)); return; }

  const forced = $("#wbKind").value;
  const touched = new Set(), log = [];
  for (const file of files) {
    li = wbSteps.add(`Reading ${file.name}`);
    try {
      const wb = await readFileAsWorkbook(file);
      const kind = forced || classifyWorkbook(wb);
      let rows = 0;
      if (kind === "students") { const p = parseStudentRegistry(wb, file.name); students = students.filter((s) => !(s.source || "").startsWith(file.name)).concat(p); rows = p.length; }
      else if (kind === "marking") { const p = toStoredMarking(parseMarkingSheet(wb, file.name)); marking = marking.filter((m) => m.source !== file.name).concat(p); rows = p.length; }
      else if (kind === "results") { const p = toStoredResults(parseEResult(wb, file.name)); results = results.filter((r) => r.source !== file.name).concat(p); rows = p.length; }
      else if (kind === "staff") { const p = parseStaffRoll(wb, file.name); ["teaching", "nonTeaching", "corps"].forEach((k) => { staff[k] = staff[k].filter((s) => s._source !== file.name).concat(p[k]); rows += p[k].length; }); }
      else { wbSteps.fail(li, `${file.name}: couldn't tell what kind of workbook this is`); continue; }
      if (!rows) { wbSteps.fail(li, `${file.name}: recognised as ${kind} but no rows were found`); continue; }
      touched.add(kind); log.push({ label: kind, fileName: file.name, rows, importedAt: new Date().toISOString() });
      wbSteps.done(li, `${file.name}: ${rows} ${kind} row(s)`);
    } catch (e) { console.error(e); wbSteps.fail(li, `${file.name}: couldn't be read`); }
  }
  if (!touched.size) { toast("Nothing recognisable was imported.", { error: true }); return; }

  li = wbSteps.add("Saving to the secure database");
  try {
    const data = { students, marking, results, staff };
    for (const k of touched) await saveDataset(k, data[k]);
    await saveDataset("summary", computeSummary({ ...data, imports: [...log.reverse(), ...(summary?.imports || [])], dataPolicy: summary?.dataPolicy || "" }));
    wbSteps.done(li, "Saved. Other pages now show the new records.");
    toast(`Imported ${log.length} file(s).`);
  } catch (e) {
    wbSteps.fail(li, e.code === "permission-denied" ? "Permission denied: your account must be an administrator and the security rules must be published." : "Couldn't save: " + (e.message || e.code));
    toast("Saving failed.", { error: true });
  }
}

import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc, uniq, dash, $, debounce } from "../lib/util.js";
import { skeleton, emptyState, errorState, finishRender, downloadCsv } from "../lib/ui.js";
import { dataTable, options } from "../lib/datatable.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

try {
  const students = await loadDataset("students");
  if (!students?.length) {
    root.innerHTML = emptyState("No student registry yet", "The student roll hasn't been loaded.", isAdmin);
  } else {
    const classes = uniq(students.map((s) => s.class)).sort();
    const male = students.filter((s) => (s.gender || "").startsWith("M")).length;
    const female = students.filter((s) => (s.gender || "").startsWith("F")).length;
    root.innerHTML = `
      <div class="stats">
        <div class="card stat"><span class="stat-label">Total students</span><span class="stat-value" data-count="${students.length}">0</span></div>
        <div class="card stat"><span class="stat-label">Classes</span><span class="stat-value" data-count="${classes.length}">0</span></div>
        <div class="card stat"><span class="stat-label">Male / Female</span><span class="stat-value mono">${male} / ${female}</span></div>
      </div>
      <section class="card" aria-label="Student roll">
        <div class="toolbar">
          <div class="field"><label for="fClass">Class</label><select class="select" id="fClass">${options(classes, "All classes")}</select></div>
          <div class="field"><label for="fGender">Gender</label><select class="select" id="fGender"><option value="">All</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
          <div class="field field-grow"><label for="fSearch">Search</label><input class="input" id="fSearch" type="search" placeholder="Search by name" autocomplete="off"></div>
          <button class="btn" id="exportBtn" type="button">Export CSV</button>
        </div>
        <div id="tableMount"></div>
      </section>`;

    const table = dataTable($("#tableMount"), {
      rows: students,
      caption: "Student roll",
      columns: [
        { label: "#", html: (_, i) => i + 1, num: true },
        { label: "Name", html: (s) => esc(s.name), value: (s) => s.name },
        { label: "Class", html: (s) => `<span class="pill">${esc(s.class)}</span>`, value: (s) => s.class },
        { label: "Gender", html: (s) => dash(s.gender), value: (s) => s.gender },
        { label: "Comment", html: (s) => dash(s.comment) },
        { label: "Source", html: (s) => `<span class="fine">${esc(s.source)}</span>`, value: (s) => s.source }
      ]
    });
    const filtered = () => {
      const c = $("#fClass").value, g = $("#fGender").value, q = $("#fSearch").value.trim().toLowerCase();
      return students.filter((s) => (!c || s.class === c) && (!g || (s.gender || "").toUpperCase() === g) && (!q || s.name.toLowerCase().includes(q)));
    };
    const apply = () => table.setRows(filtered());
    $("#fClass").addEventListener("change", apply);
    $("#fGender").addEventListener("change", apply);
    $("#fSearch").addEventListener("input", debounce(apply, 100));
    $("#exportBtn").addEventListener("click", () => {
      const rows = filtered();
      if (rows.length) downloadCsv(rows.map(({ name, class: c, gender, comment, source }) => ({ name, class: c, gender, comment, source })), "student_registry.csv");
    });
    const q = new URLSearchParams(location.search).get("q");
    if (q) { $("#fSearch").value = q; apply(); }
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

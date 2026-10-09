import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc, $, $$, debounce } from "../lib/util.js";
import { skeleton, errorState, finishRender, emptyState } from "../lib/ui.js";
import { simpleTable, dataTable } from "../lib/datatable.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

const TABS = [
  ["library", "Library catalogue"], ["offices", "Office inventories"], ["science", "Laboratory & science"],
  ["sports", "Sports & field"], ["registrar", "Registrar's documents"], ["general", "General store, staff room & charts"]
];
const block = (title, body) => `<section class="card card-pad stack"><h2>${esc(title)}</h2>${body}</section>`;

try {
  const res = await loadDataset("resources");
  if (!res) {
    root.innerHTML = emptyState("Inventory records not loaded", "The inventory and library catalogue haven't been loaded.", isAdmin);
  } else {
    const panels = {
      library: () => `<section class="card" aria-label="Library catalogue"><div class="card-head"><div><h2>Full library book catalogue</h2><p>${res.libraryLedger.length} titles on record</p></div></div>
          <div class="toolbar"><div class="field field-grow"><label for="libSearch">Search titles</label><input class="input" id="libSearch" type="search" placeholder="Search the library catalogue" autocomplete="off"></div></div>
          <div id="libMount"></div></section>
        ${block("Books collected from the L.I.E., 2025", `<p class="fine">Additional class sets supplied through the Local Inspectorate of Education</p>${simpleTable(res.lieBooks2025)}`)}`,
      offices: () => res.offices.map((o) => block(o.name, simpleTable(o.items))).join(""),
      science: () => block("Laboratory (general)", simpleTable(res.laboratoryGeneral)) + block("Chemistry materials", simpleTable(res.chemistryMaterials)) + block("Biology materials", simpleTable(res.biologyMaterials)) + block("Physics material", simpleTable(res.physicsMaterial)),
      sports: () => block("Sports equipment", simpleTable(res.sportsEquipment)),
      registrar: () => block("Registrar's office documents", simpleTable(res.registrarDocuments)),
      general: () => block("General store", simpleTable(res.generalStore)) + block("Staff room furniture", simpleTable(res.staffRoom)) + block("Library furniture", simpleTable(res.libraryFurniture)) + block("Agricultural equipment", simpleTable(res.agriculturalEquipment)) + block("Charts supplied by the Ministry of Education", simpleTable(res.chartsMinistry))
    };

    root.innerHTML = `
      <p class="lede">The school's recorded property inventory and full library catalogue, as documented in the 2026 handover notes.</p>
      <div class="tabs" role="tablist" aria-label="Inventory areas">${TABS.map(([id, label], i) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${id}" type="button">${esc(label)}</button>`).join("")}</div>
      <div id="panel" class="stack" role="tabpanel" tabindex="0" aria-labelledby="tab-library"></div>`;

    const cols = res.libraryLedger.length ? Object.keys(res.libraryLedger[0]) : [];
    const show = (id) => {
      $$("[data-tab]").forEach((b) => { const on = b.dataset.tab === id; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
      const panel = $("#panel");
      panel.setAttribute("aria-labelledby", `tab-${id}`);
      panel.innerHTML = panels[id]();
      if (id === "library" && cols.length) {
        const table = dataTable($("#libMount"), { rows: res.libraryLedger, caption: "Library catalogue", pageSize: 100, columns: cols.map((c) => ({ label: c, html: (r) => esc(r[c]), value: (r) => r[c] })) });
        $("#libSearch").addEventListener("input", debounce((e) => {
          const q = e.target.value.trim().toLowerCase();
          table.setRows(res.libraryLedger.filter((r) => !q || String(r[cols[1]] || "").toLowerCase().includes(q)));
        }, 100));
      }
    };
    const tablist = $("[role=tablist]");
    tablist.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) show(b.dataset.tab); });
    tablist.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      const tabs = $$("[data-tab]"); let i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
      i = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[i].focus(); show(tabs[i].dataset.tab);
    });
    show("library");
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

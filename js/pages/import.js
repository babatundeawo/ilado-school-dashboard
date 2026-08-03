/* =========================================================
   import.js — renders the Import Data page and wires up
   both the "drop everything at once" flow and the
   per-category import cards.
   ========================================================= */
(() => {
  const { esc, bundleDropzoneHtml, wireBundleDropzones, handleBundle } = Common;
  const data = DB.load();
  const root = document.getElementById("pageContent");
  const fileInput = document.getElementById("fileInput");
  const bundleInput = document.getElementById("bundleFileInput");
  let pendingLabel = null;

  const lastFor = (label) => data.meta.imports.find(i=>i.label===label);
  const card = (label, title, desc, hint) => {
    const last = lastFor(label);
    return `
    <div class="import-card">
      <h3>${esc(title)}</h3>
      <p>${esc(desc)}</p>
      <button class="btn btn-primary btn-sm" data-import="${label}">Choose file(s)</button>
      <div class="status" style="margin-top:10px">
        ${last ? `Last import: ${last.rows} rows from "${esc(last.fileName)}" · ${new Date(last.importedAt).toLocaleString()}` : `<span style="color:var(--ink-400);font-weight:400">${esc(hint)}</span>`}
      </div>
    </div>`;
  };

  root.innerHTML = `
    <div class="card card-pad privacy-banner">
      <div class="icon">🔒</div>
      <div>
        <strong>Everything stays on this device</strong>
        <p>This site has no server or database. When you choose a file, it's read and parsed entirely inside your
        browser using JavaScript, then saved to this browser's local storage. Nothing is uploaded anywhere —
        not to GitHub, not to Anthropic, not to anyone. If you clear your browser data, or use "Clear all
        imported data" in the sidebar, the records disappear.</p>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:20px">
      ${bundleDropzoneHtml("Import")}
    </div>

    <p style="font-size:12px;color:var(--ink-600);margin:0 0 10px">Or import one category at a time:</p>
    <div class="import-grid">
      ${card("students","Student Registry","The workbook with class-by-class student lists (GENERAL / JSS·SSS sheets).","Not imported yet.")}
      ${card("marking","Marking Sheet","The CA marking workbook with attendance, notebook, textbook, exam columns.","Not imported yet.")}
      ${card("results","E-Results","One or more per-class result workbooks (with 1ST/2ND/3RD TERM Db sheets). Select several at once.","Not imported yet.")}
      ${card("staff","Staff Nominal Roll","The detailed nominal roll workbook with Teaching / Non-Teaching / Corp Members sheets.","Not imported yet.")}
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-head"><div><h2>Import log</h2><p>Everything you've loaded into this browser session</p></div></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Category</th><th>File</th><th>Rows</th><th>When</th></tr></thead>
          <tbody>
            ${data.meta.imports.length ? data.meta.imports.map(i => `
              <tr><td><span class="pill pill-muted">${esc(i.label)}</span></td><td>${esc(i.fileName)}</td><td>${i.rows}</td><td>${new Date(i.importedAt).toLocaleString()}</td></tr>
            `).join("") : `<tr><td colspan="4" style="color:var(--ink-600)">No imports yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  wireBundleDropzones(bundleInput);

  root.querySelectorAll("[data-import]").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingLabel = btn.dataset.import;
      fileInput.multiple = pendingLabel === "results";
      fileInput.click();
    });
  });

  fileInput.addEventListener("change", (e) => {
    if(e.target.files.length) handleBundleForLabel(pendingLabel, e.target.files);
    fileInput.value = "";
  });

  // Per-category import still runs through the same parsing pipeline,
  // just tagged with the category the user picked instead of auto-detecting.
  async function handleBundleForLabel(label, files){
    let total = 0;
    for(const file of files){
      try{
        const wb = await Parsers.readFileAsWorkbook(file);
        total += Common.importOneFile(data, label, file, wb);
        DB.logImport({ label, fileName: file.name, rows: total });
      }catch(err){ console.error(err); }
    }
    DB.save();
    Common.toast(`Imported ${total} row(s).`);
    setTimeout(() => location.reload(), 700);
  }
})();

/* =========================================================
   events.js — renders the Events & Speeches archive page.
   ========================================================= */
(() => {
  const { esc } = Common;
  const data = DB.load();
  const events = data.events || [];
  const root = document.getElementById("pageContent");

  if(!events.length){
    root.innerHTML = `<div class="empty-state"><h3>No speeches on file</h3></div>`;
    return;
  }

  root.innerHTML = `
    <div class="section-grid">
      ${events.map((e,i) => `
        <div class="card card-pad">
          <div class="kicker-label">${esc(e.date)} \u00b7 ${esc(e.venue)}</div>
          <h2 style="font-size:18px;margin:8px 0 6px">${esc(e.title)}</h2>
          <p class="fine-print" style="margin-bottom:10px">Delivered by ${esc(e.speaker)}</p>
          <p class="lede" style="margin-bottom:14px">${esc(e.summary)}</p>
          <button class="btn btn-ghost btn-sm" data-toggle="${i}">Read full text</button>
          <div class="speech-body" id="speech-${i}" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--line-subtle)">
            ${e.paragraphs.map(p=>`<p class="lede" style="margin-bottom:12px">${esc(p)}</p>`).join("")}
          </div>
        </div>`).join("")}
    </div>`;

  root.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const body = document.getElementById("speech-"+btn.dataset.toggle);
      const open = body.style.display !== "none";
      body.style.display = open ? "none" : "block";
      btn.textContent = open ? "Read full text" : "Hide full text";
    });
  });
})();

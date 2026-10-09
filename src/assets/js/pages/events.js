import { boot } from "../app.js";
import { loadDataset } from "../lib/store.js";
import { esc } from "../lib/util.js";
import { skeleton, errorState, finishRender, emptyState } from "../lib/ui.js";

const { root, isAdmin } = await boot();
root.innerHTML = skeleton();

try {
  const events = await loadDataset("events");
  if (!events?.length) {
    root.innerHTML = emptyState("No speeches on file", "The speeches archive hasn't been loaded.", isAdmin);
  } else {
    root.innerHTML = `<div class="grid-auto grid-wide">${events.map((e, i) => `
      <article class="card card-pad stack">
        <p class="eyebrow">${esc(e.date)} &middot; ${esc(e.venue)}</p>
        <h2>${esc(e.title)}</h2>
        <p class="fine">Delivered by ${esc(e.speaker)}</p>
        <p class="lede">${esc(e.summary)}</p>
        <div><button class="btn btn-sm" type="button" aria-expanded="false" aria-controls="speech-${i}" data-toggle="${i}">Read full text</button></div>
        <div class="speech-body" id="speech-${i}" hidden>${(e.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      </article>`).join("")}</div>`;
    root.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-toggle]");
      if (!b) return;
      const body = document.getElementById(`speech-${b.dataset.toggle}`);
      body.hidden = !body.hidden;
      b.setAttribute("aria-expanded", String(!body.hidden));
      b.textContent = body.hidden ? "Read full text" : "Hide full text";
    });
  }
} catch (e) { root.innerHTML = errorState(e); }
finishRender(root);

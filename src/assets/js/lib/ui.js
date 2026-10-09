/* UI helpers: toasts, dialogs, drawer, sortable tables, counters, reveal, CSV. */
import { esc, $$, icon } from "./util.js";

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Toast ---------- */
export function toast(message, { error = false, ms = 4500 } = {}) {
  const region = document.getElementById("toastRegion");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast${error ? " is-error" : ""}`;
  el.textContent = message;
  region.append(el);
  setTimeout(() => el.remove(), ms);
}

/* ---------- Dialogs (native <dialog>: focus trap and Esc come for free) ---------- */
function makeDialog(className, innerHtml) {
  const d = document.createElement("dialog");
  d.className = className;
  d.innerHTML = innerHtml;
  document.body.append(d);
  d.addEventListener("close", () => d.remove());
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  return d;
}

export function confirmDialog({ title, body, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const d = makeDialog("modal", `
      <div class="modal-card">
        <h2>${esc(title)}</h2><div class="lede">${body}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="no" type="button">Cancel</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="yes" type="button">${esc(confirmLabel)}</button>
        </div>
      </div>`);
    let result = false;
    d.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act) { result = act === "yes"; d.close(); }
    });
    d.addEventListener("close", () => resolve(result));
    d.showModal();
  });
}

export function openDrawer(title, bodyHtml) {
  const d = makeDialog("drawer", `
    <div class="drawer-card">
      <div class="drawer-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close type="button" aria-label="Close">${icon("close")}</button></div>
      <div class="drawer-body">${bodyHtml}</div>
    </div>`);
  d.querySelector("[data-close]").addEventListener("click", () => d.close());
  d.showModal();
  return d;
}

export const kvRows = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<div class="kv-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;

/* ---------- Counters, bars, reveal ---------- */
function animateCounters(root = document) {
  $$("[data-count]", root).forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    if (reducedMotion() || target < 2) { el.textContent = target.toLocaleString(); return; }
    const t0 = performance.now(), dur = 900;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function animateBars(root = document) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$(".bar-fill[data-s]", root).forEach((el) => el.style.setProperty("--s", el.dataset.s));
  }));
}
export function bar(label, value, max, { brass = false } = {}) {
  const s = max ? Math.max(0.02, value / max).toFixed(3) : 0;
  return `<div class="bar-row"><div class="bar-label" title="${esc(label)}">${esc(label)}</div>
    <div class="bar-track" role="img" aria-label="${esc(label)}: ${value}"><div class="bar-fill${brass ? " is-brass" : ""}" data-s="${s}"></div></div>
    <div class="bar-value">${value}</div></div>`;
}

export function reveal(root = document.getElementById("pageContent")) {
  if (!root || reducedMotion() || !("IntersectionObserver" in window)) return;
  document.body.classList.add("reveal-ready");
  const items = $$(":scope > *, .stats > *, .grid-2 > *, .grid-3 > *, .grid-auto > *", root).filter((el) => !el.hidden);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add("is-in");
      setTimeout(() => e.target.classList.remove("reveal", "is-in"), 1100); // hand hover transitions back to the component
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  items.forEach((el, i) => { el.style.setProperty("--i", String(Math.min(i, 6))); el.classList.add("reveal"); io.observe(el); });
}

/** Call after a page has rendered its content. */
export function finishRender(root = document.getElementById("pageContent")) {
  animateCounters(root); animateBars(root); reveal(root);
}

/* ---------- Loading / empty / error states ---------- */
export const skeleton = (n = 4) => `<div class="skeleton-grid" aria-hidden="true">${"<div class='skeleton'></div>".repeat(n)}</div><div class="skeleton skeleton-block" aria-hidden="true"></div><span class="sr-only">Loading records</span>`;
function stateBlock({ ico = "alert", kind = "", title, body = "", action = "" }) {
  return `<div class="card"><div class="state"><span class="gate-icon ${kind}">${icon(ico)}</span><h2>${esc(title)}</h2>${body ? `<p>${body}</p>` : ""}${action}</div></div>`;
}
export const emptyState = (title, body, isAdmin) => stateBlock({
  ico: "book", title, body,
  action: isAdmin ? `<a class="btn btn-primary" href="import.html">Go to Import Data</a>` : `<p class="fine">Ask a school administrator to load this data.</p>`
});
export const errorState = (error) => stateBlock({
  ico: "alert", kind: "is-danger", title: "We couldn't load these records",
  body: esc(error?.code === "permission-denied" ? "Your account doesn't have access to this data." : (navigator.onLine === false ? "You appear to be offline. Reconnect and try again." : "Something went wrong while reading from the database.")),
  action: `<button class="btn" type="button" onclick="location.reload()">Try again</button>`
});

/* ---------- CSV ---------- */
export function downloadCsv(rows, filename, headers, { neutralise = true } = {}) {
  const cols = headers || Object.keys(rows[0] || {});
  const cell = (v) => {
    let s = String(v ?? "");
    if (neutralise && /^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.map(cell).join(",")].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(","))).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

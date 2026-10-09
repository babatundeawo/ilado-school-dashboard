/* Small shared helpers. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uniq = (arr) => [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ""))];
export const dash = (v) => (v === null || v === undefined || v === "" ? "\u2014" : esc(v));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const initials = (name = "") => name.replace(/^(Mr|Mrs|Miss|Ms|Dr|Revd|Rev'd|Rev|Alh\.|Alhaji|Alhaja|Hon\.|Chief|Engr\.|Prof)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const icon = (id, cls = "") => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;

/** Only allows redirects to our own pages (prevents open-redirect abuse). */
export function safeNext(value, fallback = "index.html") {
  return typeof value === "string" && /^[a-z0-9-]+\.html$/i.test(value) ? value : fallback;
}

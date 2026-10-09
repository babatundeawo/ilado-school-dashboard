/* Accessible data table: sorting on the underlying data (not just visible rows),
   progressive "show more" paging, an empty state and a live result count. */
import { esc } from "./util.js";

/**
 * columns: [{ label, html(row, i), value?(row) -> sort key, num? }]
 * Returns { setRows(rows) } so filters can re-render.
 */
export function dataTable(mount, { columns, rows = [], pageSize = 150, onRowClick, emptyText = "No records match these filters.", caption = "" }) {
  let data = rows, sortIdx = -1, asc = true, shown = pageSize;

  mount.innerHTML = `
    <div class="table-wrap"><table class="table">
      ${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ""}
      <thead><tr>${columns.map((c, i) => `<th scope="col" ${c.value ? `data-i="${i}" tabindex="0" data-sort aria-sort="none"` : ""}>${esc(c.label)}</th>`).join("")}</tr></thead>
      <tbody></tbody></table></div>
    <div class="result-count" aria-live="polite"></div>`;
  const tbody = mount.querySelector("tbody");
  const count = mount.querySelector(".result-count");

  const sorted = () => {
    if (sortIdx < 0) return data;
    const get = columns[sortIdx].value;
    const num = /^-?\d+(\.\d+)?$/;
    return [...data].sort((a, b) => {
      const av = get(a) ?? "", bv = get(b) ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv
        : num.test(String(av)) && num.test(String(bv)) ? Number(av) - Number(bv)
        : String(av).localeCompare(String(bv), undefined, { sensitivity: "base", numeric: true });
      return asc ? cmp : -cmp;
    });
  };

  const render = () => {
    const list = sorted();
    const slice = list.slice(0, shown);
    tbody.innerHTML = slice.length
      ? slice.map((r, i) => `<tr${onRowClick ? ` class="is-clickable" tabindex="0" data-r="${i}"` : ""}>${columns.map((c) => `<td${c.num ? ' class="num"' : ""}>${c.html(r, i)}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${columns.length}" class="muted">${esc(emptyText)}</td></tr>`;
    const remaining = list.length - slice.length;
    count.innerHTML = `Showing ${slice.length.toLocaleString()} of ${list.length.toLocaleString()}` +
      (remaining > 0 ? ` <button class="btn btn-sm" type="button" data-more>Show ${Math.min(pageSize, remaining)} more</button>` : "");
    if (onRowClick) tbody.querySelectorAll("tr[data-r]").forEach((tr) => {
      const open = () => onRowClick(slice[Number(tr.dataset.r)]);
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
    });
  };

  mount.addEventListener("click", (e) => {
    if (e.target.closest("[data-more]")) { shown += pageSize; render(); return; }
    const th = e.target.closest("th[data-sort]");
    if (th) toggleSort(Number(th.dataset.i));
  });
  mount.addEventListener("keydown", (e) => {
    const th = e.target.closest?.("th[data-sort]");
    if (th && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleSort(Number(th.dataset.i)); }
  });
  function toggleSort(i) {
    asc = sortIdx === i ? !asc : true; sortIdx = i;
    mount.querySelectorAll("th[data-sort]").forEach((th) => {
      const on = Number(th.dataset.i) === i;
      th.classList.toggle("sort-asc", on && asc); th.classList.toggle("sort-desc", on && !asc);
      th.setAttribute("aria-sort", on ? (asc ? "ascending" : "descending") : "none");
    });
    render();
  }

  render();
  return { setRows(next) { data = next; shown = pageSize; render(); } };
}

/** Plain (non-interactive) table for short reference lists. */
export function simpleTable(rows, cols) {
  if (!rows?.length) return `<p class="fine">No items recorded.</p>`;
  const keys = cols || Object.keys(rows[0]);
  return `<div class="table-wrap is-short"><table class="table"><thead><tr>${keys.map((k) => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${esc(r[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

/** Builds <option> lists and wires filter controls to a callback. */
export const options = (values, label) => `<option value="">${esc(label)}</option>${values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}`;

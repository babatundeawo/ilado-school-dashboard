/* App shell behaviour: mobile menu, sticky topbar, scroll progress, account menu,
   command palette (Ctrl/Cmd + K) and automatic sign-out after inactivity. */
import { $, $$, esc, initials, icon, debounce } from "./util.js";
import { toast } from "./ui.js";
import { signOut } from "./auth.js";
import { loadDataset } from "./store.js";
import { features } from "./firebase.js";

export function initShell({ user, member }) {
  const isAdmin = member.role === "admin";
  $$("[data-admin-only]").forEach((el) => { el.hidden = !isAdmin; });

  const name = user.displayName || user.email || "Signed in";
  $("#accountInitials").textContent = initials(name) || "?";
  $("#accountName").textContent = name;
  $("#accountEmail").textContent = user.email || "";
  $("#accountRole").textContent = isAdmin ? "Administrator" : "Viewer";
  $("#signOutBtn").addEventListener("click", signOut);

  initMobileNav();
  initTopbar();
  initAccountMenu();
  initPalette(isAdmin);
  initIdleTimeout(features.idleMinutes);
}

function initMobileNav() {
  const sidebar = $("#sidebar"), trigger = $("#navTrigger"), scrim = $("#scrim");
  const mq = matchMedia("(max-width: 64rem)");
  const setOpen = (open) => {
    sidebar.classList.toggle("is-open", open);
    scrim.hidden = !open;
    requestAnimationFrame(() => scrim.classList.toggle("is-open", open));
    trigger.setAttribute("aria-expanded", String(open));
    trigger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) $(".nav-link", sidebar)?.focus(); else if (mq.matches) trigger.focus({ preventScroll: true });
  };
  const sync = () => { if (!mq.matches) { sidebar.classList.remove("is-open"); scrim.hidden = true; } };
  trigger.addEventListener("click", () => setOpen(!sidebar.classList.contains("is-open")));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sidebar.classList.contains("is-open")) setOpen(false); });
  mq.addEventListener("change", sync);
  // Keep the closed mobile drawer out of the tab order.
  sidebar.inert = mq.matches;
  const syncInert = () => { sidebar.inert = mq.matches && !sidebar.classList.contains("is-open"); };
  new MutationObserver(syncInert).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
  mq.addEventListener("change", syncInert);
}

function initTopbar() {
  const bar = $("#topbar");
  let ticking = false;
  const update = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.classList.toggle("is-scrolled", y > 8);
    bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : "0");
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

function initAccountMenu() {
  const btn = $("#accountBtn"), menu = $("#accountMenu");
  const close = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) $(".menu-item", menu).focus();
  });
  document.addEventListener("click", (e) => { if (!$("#account").contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { close(); btn.focus(); } });
}

/* ---------- Command palette ---------- */
function initPalette(isAdmin) {
  const pages = $$(".nav-link").filter((a) => isAdmin || !a.closest("[data-admin-only]")).map((a) => ({
    type: "page", label: a.textContent.trim(), sub: "Page", href: a.getAttribute("href"), ico: a.querySelector("use")?.getAttribute("href")?.slice(3) || "arrow"
  }));
  let dlg, input, list, items = [], active = 0, people = null, loadingPeople = false;

  const build = () => {
    dlg = document.createElement("dialog");
    dlg.className = "palette";
    dlg.setAttribute("aria-label", "Search");
    dlg.innerHTML = `<div class="palette-card">
      <div class="palette-input">${icon("search")}<input type="text" role="combobox" aria-expanded="true" aria-controls="paletteList" aria-autocomplete="list" placeholder="Search pages, students, staff" autocomplete="off" spellcheck="false"><kbd class="kbd">Esc</kbd></div>
      <ul class="palette-list" id="paletteList" role="listbox"></ul></div>`;
    document.body.append(dlg);
    input = $("input", dlg); list = $("ul", dlg);
    input.addEventListener("input", debounce(() => render(input.value), 80));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); items[active] && (location.href = items[active].href); }
    });
  };

  const ensurePeople = async () => {
    if (people || loadingPeople) return;
    loadingPeople = true;
    try {
      const [students, staff] = await Promise.all([loadDataset("students"), loadDataset("staff")]);
      people = [
        ...(students || []).map((s) => ({ type: "student", label: s.name, sub: `${s.class || ""} \u00b7 Student`, href: `students.html?q=${encodeURIComponent(s.name)}`, ico: "users" })),
        ...(staff?.teaching || []).map((s) => ({ type: "staff", label: s.full_name_of_staff, sub: "Teaching staff", href: `staff.html?q=${encodeURIComponent(s.full_name_of_staff)}`, ico: "badge" })),
        ...(staff?.nonTeaching || []).map((s) => ({ type: "staff", label: s.full_name, sub: "Non-teaching staff", href: `staff.html?q=${encodeURIComponent(s.full_name)}`, ico: "badge" }))
      ].filter((p) => p.label);
    } catch { people = []; }
    render(input.value);
  };

  const render = (q) => {
    const query = q.trim().toLowerCase();
    items = query
      ? [...pages.filter((p) => p.label.toLowerCase().includes(query)), ...(people || []).filter((p) => p.label.toLowerCase().includes(query))]
      : pages;
    items = items.slice(0, 30); active = 0;
    list.innerHTML = items.length
      ? items.map((it, i) => `<li class="palette-item" role="presentation"><a href="${esc(it.href)}" role="option" id="po${i}" aria-selected="${i === 0}">${icon(it.ico)}<span><strong>${esc(it.label)}</strong><small>${esc(it.sub)}</small></span></a></li>`).join("")
      : `<li class="palette-empty">${people === null && query.length > 1 ? "Searching\u2026" : "No matches."}</li>`;
    input.setAttribute("aria-activedescendant", items.length ? "po0" : "");
  };
  const move = (d) => {
    if (!items.length) return;
    active = (active + d + items.length) % items.length;
    $$("a", list).forEach((a, i) => a.setAttribute("aria-selected", String(i === active)));
    const el = $$("a", list)[active]; el.scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", el.id);
  };
  const open = () => { if (!dlg) build(); if (dlg.open) return; render(""); dlg.showModal(); input.value = ""; input.focus(); ensurePeople(); };

  $("#searchTrigger").addEventListener("click", open);
  document.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); } });
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const k = $(".search-trigger .kbd"); if (k && mac) k.textContent = "\u2318 K";
}

/* ---------- Idle sign-out (school computers are often shared) ---------- */
function initIdleTimeout(minutes) {
  const limit = minutes * 60_000;
  let last = Date.now(), warned = false;
  const bump = () => { last = Date.now(); warned = false; };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, bump, { passive: true }));
  setInterval(() => {
    const idle = Date.now() - last;
    if (idle > limit) signOut();
    else if (idle > limit - 60_000 && !warned) { warned = true; toast("You'll be signed out in a minute because of inactivity.", { ms: 8000 }); }
  }, 15_000);
}

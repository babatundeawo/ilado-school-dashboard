/* Light/dark theme: respects the system setting, remembers the choice. */
const KEY = "iscgs_theme";
const get = () => document.documentElement.getAttribute("data-theme") || "light";

function apply(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b100e" : "#0c6342");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

export function initTheme() {
  apply(get());
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = get() === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch { /* private mode: still switch for this visit */ }
    apply(next);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => {
    let saved = null; try { saved = localStorage.getItem(KEY); } catch { /* ignore */ }
    if (!saved) apply(e.matches ? "dark" : "light");
  });
}

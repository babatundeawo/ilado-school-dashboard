/* Entry point shared by every signed-in page. Each page script calls boot()
   first, then renders its content using the returned session. */
import { initTheme } from "./lib/theme.js";
import { requireSession } from "./lib/auth.js";
import { initShell } from "./lib/shell.js";

export async function boot() {
  initTheme();
  const access = document.body.dataset.access || "member";
  const session = await requireSession({ access });
  initShell(session);
  document.getElementById("app").hidden = false;
  document.body.classList.remove("is-booting");
  return { ...session, isAdmin: session.member.role === "admin", root: document.getElementById("pageContent") };
}

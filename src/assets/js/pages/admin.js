import { boot } from "../app.js";
import { getServices } from "../lib/firebase.js";
import { esc } from "../lib/util.js";
import { toast, confirmDialog, finishRender, skeleton, errorState } from "../lib/ui.js";
import { collection, getDocs, doc, writeBatch, serverTimestamp } from "firebase/firestore";

const { root, user } = await boot();
root.innerHTML = skeleton(2);

const when = (ts) => (ts?.toDate ? ts.toDate().toLocaleString() : "");

async function load() {
  const { db } = await getServices();
  const [reqs, mems] = await Promise.all([getDocs(collection(db, "accessRequests")), getDocs(collection(db, "members"))]);
  const requests = reqs.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.requestedAt?.seconds || 0) - (b.requestedAt?.seconds || 0));
  const members = mems.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || ""));
  return { db, requests, members };
}

async function render() {
  const { db, requests, members } = await load();
  const memberIds = new Set(members.map((m) => m.uid)); // ignore leftover requests from people already approved
  const pending = requests.filter((r) => r.status !== "declined" && !memberIds.has(r.uid));
  const declined = requests.filter((r) => r.status === "declined" && !memberIds.has(r.uid));

  root.innerHTML = `
    <section class="card" aria-labelledby="reqTitle">
      <div class="card-head"><div><h2 id="reqTitle">Waiting for approval</h2><p>People who signed up and verified their email</p></div><span class="pill pill-gold">${pending.length}</span></div>
      <ul class="request-list">${pending.length ? pending.map((r) => `
        <li class="request-item"><div class="request-who"><strong>${esc(r.displayName || "No name given")}</strong><span>${esc(r.email)} &middot; ${esc(when(r.requestedAt))}</span></div>
          <button class="btn btn-primary btn-sm" data-approve="${esc(r.uid)}" type="button">Approve as viewer</button>
          <button class="btn btn-sm" data-approve-admin="${esc(r.uid)}" type="button">Approve as admin</button>
          <button class="btn btn-danger btn-sm" data-decline="${esc(r.uid)}" type="button">Decline</button></li>`).join("")
        : `<li class="request-item"><span class="fine">Nobody is waiting. New requests appear here.</span></li>`}</ul>
      ${declined.length ? `<div class="card-body"><p class="section-title">Declined</p><ul class="request-list">${declined.map((r) => `<li class="request-item"><div class="request-who"><strong>${esc(r.displayName || "No name given")}</strong><span>${esc(r.email)}</span></div><button class="btn btn-sm" data-approve="${esc(r.uid)}" type="button">Approve instead</button></li>`).join("")}</ul></div>` : ""}
    </section>
    <section class="card" aria-labelledby="memTitle">
      <div class="card-head"><div><h2 id="memTitle">People with access</h2><p>Viewers can read the register. Administrators can also import data and manage access.</p></div><span class="pill pill-green">${members.length}</span></div>
      <div class="table-wrap is-short"><table class="table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${members.map((m) => `<tr><td>${esc(m.displayName || "\u2014")}${m.uid === user.uid ? ' <span class="pill">You</span>' : ""}</td><td>${esc(m.email)}</td>
          <td><label class="sr-only" for="role-${esc(m.uid)}">Role for ${esc(m.email)}</label><select class="select" id="role-${esc(m.uid)}" data-role="${esc(m.uid)}" ${m.uid === user.uid ? "disabled" : ""}><option value="viewer" ${m.role === "viewer" ? "selected" : ""}>Viewer</option><option value="admin" ${m.role === "admin" ? "selected" : ""}>Administrator</option></select></td>
          <td>${m.uid === user.uid ? "" : `<button class="btn btn-danger btn-sm" data-remove="${esc(m.uid)}" type="button">Remove access</button>`}</td></tr>`).join("")}
      </tbody></table></div>
    </section>`;
  finishRender(root);

  const find = (uid) => requests.find((r) => r.uid === uid) || members.find((m) => m.uid === uid);
  const approve = async (uid, role) => {
    const r = find(uid), b = writeBatch(db);
    b.set(doc(db, "members", uid), { role, email: r.email, displayName: r.displayName || "", approvedAt: serverTimestamp(), approvedBy: user.uid });
    b.delete(doc(db, "accessRequests", uid));
    await b.commit(); toast(`${r.email} can now sign in as ${role === "admin" ? "an administrator" : "a viewer"}.`);
  };

  root.onclick = async (e) => {
    const t = e.target.closest("button"); if (!t) return;
    t.classList.add("is-loading");
    try {
      if (t.dataset.approve) await approve(t.dataset.approve, "viewer");
      else if (t.dataset.approveAdmin) {
        if (await confirmDialog({ title: "Make this person an administrator?", body: `<p>Administrators can load or replace all school data and manage who has access.</p>`, confirmLabel: "Make administrator" })) await approve(t.dataset.approveAdmin, "admin"); else { t.classList.remove("is-loading"); return; }
      }
      else if (t.dataset.decline) { const b = writeBatch(db); b.update(doc(db, "accessRequests", t.dataset.decline), { status: "declined" }); await b.commit(); toast("Request declined."); }
      else if (t.dataset.remove) {
        const m = find(t.dataset.remove);
        if (!(await confirmDialog({ title: "Remove access?", body: `<p><strong>${esc(m.email)}</strong> will no longer be able to see the register.</p>`, confirmLabel: "Remove access", danger: true }))) { t.classList.remove("is-loading"); return; }
        const b = writeBatch(db); b.delete(doc(db, "members", t.dataset.remove)); await b.commit(); toast("Access removed.");
      } else { t.classList.remove("is-loading"); return; }
      await render();
    } catch (err) { t.classList.remove("is-loading"); toast(err.code === "permission-denied" ? "Permission denied by the security rules." : "That didn't work. Please try again.", { error: true }); }
  };
  root.onchange = async (e) => {
    const sel = e.target.closest("[data-role]"); if (!sel) return;
    try {
      const m = find(sel.dataset.role), b = writeBatch(db);
      b.set(doc(db, "members", m.uid), { role: sel.value, email: m.email, displayName: m.displayName || "", approvedAt: m.approvedAt || serverTimestamp(), approvedBy: m.approvedBy || user.uid });
      await b.commit(); toast(`${m.email} is now ${sel.value === "admin" ? "an administrator" : "a viewer"}.`);
    } catch { toast("Couldn't change the role.", { error: true }); await render(); }
  };
}

try { await render(); } catch (e) { root.innerHTML = errorState(e); }

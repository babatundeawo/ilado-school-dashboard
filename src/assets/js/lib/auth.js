/* Authentication and access gate.
   Sign-in proves who you are; membership (approved by an administrator and stored
   in Firestore) decides what you may see. The Firestore rules enforce this on the
   server. The checks here only decide which screen to show. */
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, updateProfile,
  setPersistence, browserLocalPersistence, browserSessionPersistence
} from "firebase/auth";
import { getServices, isConfigured, features } from "./firebase.js";
import { fetchMember, fetchAccessRequest, createAccessRequest } from "./store.js";
import { esc, icon } from "./util.js";

const MESSAGES = {
  "auth/invalid-credential": "That email and password don't match. Check them and try again.",
  "auth/invalid-login-credentials": "That email and password don't match. Check them and try again.",
  "auth/wrong-password": "That email and password don't match. Check them and try again.",
  "auth/user-not-found": "That email and password don't match. Check them and try again.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Can't reach the sign-in service. Check your internet connection.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  "auth/popup-closed-by-user": "The Google window was closed before finishing.",
  "auth/cancelled-popup-request": "The Google window was closed before finishing.",
  "auth/unauthorized-domain": "This website address isn't approved for sign-in yet. The administrator needs to add it in Firebase (see the setup guide, 'Authorized domains').",
  "auth/operation-not-allowed": "This sign-in method isn't switched on in Firebase yet. See the setup guide, 'Enable sign-in methods'.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "The site's Firebase settings are wrong or missing. See the setup guide, 'Add the settings to GitHub'.",
  "auth/invalid-api-key": "The site's Firebase settings are wrong or missing. See the setup guide, 'Add the settings to GitHub'.",
  "permission-denied": "Permission denied. Your account isn't approved for this yet, or the security rules need publishing.",
  "app/not-configured": "This site has not been connected to Firebase yet. See docs/FIREBASE_LOGIN_SETUP.md."
};
export const friendlyError = (e) => MESSAGES[e?.code] || "Something went wrong. Please try again.";

/* ---------- Actions used by the login page ---------- */
async function applyPersistence(auth, remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}
export async function signIn(email, password, remember) {
  const { auth } = await getServices();
  await applyPersistence(auth, remember);
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}
export async function signUp(name, email, password, remember) {
  const { auth } = await getServices();
  await applyPersistence(auth, remember);
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name.trim() });
  await sendEmailVerification(user);
  return user;
}
export async function googleSignIn(remember) {
  const { auth } = await getServices();
  await applyPersistence(auth, remember);
  return (await signInWithPopup(auth, new GoogleAuthProvider())).user;
}
export async function resetPassword(email) {
  const { auth } = await getServices();
  await sendPasswordResetEmail(auth, email);
}
export async function signOut() {
  try { const { auth } = await getServices(); await fbSignOut(auth); } catch { /* already signed out */ }
  location.href = "login.html";
}
export async function currentUserOnce() {
  const { auth } = await getServices();
  return new Promise((resolve) => { const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); }); });
}

/* ---------- Gate screens ---------- */
function gateEl() { return document.getElementById("gate"); }
function showGate(html) {
  const g = gateEl();
  g.innerHTML = `<div class="gate-card" role="alertdialog" aria-labelledby="gateTitle">${html}</div>`;
  g.hidden = false;
  document.getElementById("app").hidden = true;
  document.body.classList.remove("is-booting");
  g.querySelector("h1")?.setAttribute("tabindex", "-1");
  g.querySelector("h1")?.focus({ preventScroll: true });
}
const card = (kind, ico, title, body, actions) => `
  <span class="gate-icon ${kind}">${icon(ico)}</span>
  <h1 id="gateTitle">${esc(title)}</h1>
  <div class="stack"><div class="lede">${body}</div></div>
  <div class="gate-actions">${actions}</div>`;
const btn = (id, label, cls = "btn-primary") => `<button class="btn ${cls}" id="${id}" type="button">${label}</button>`;

/**
 * Resolves with { user, member } once the visitor is signed in, verified and approved
 * (and an admin, when access === "admin"). Otherwise shows the right gate screen.
 */
export function requireSession({ access = "member" } = {}) {
  return new Promise(async (resolve) => {
    if (!isConfigured) {
      showGate(card("is-warn", "alert", "Sign-in isn't set up yet",
        "This site hasn't been connected to a Firebase project, so nobody can sign in. The owner needs to add the Firebase settings to GitHub. Step-by-step help is in <strong>docs/FIREBASE_LOGIN_SETUP.md</strong>.",
        `<a class="btn btn-primary" href="login.html">Go to sign-in</a>`));
      return;
    }
    let services;
    try { services = await getServices(); } catch (e) {
      showGate(card("is-danger", "alert", "Couldn't start", esc(friendlyError(e)), btn("retry", "Try again"))); document.getElementById("retry").onclick = () => location.reload(); return;
    }
    let settled = false;
    let evaluating = false;

    const evaluate = async (user) => {
      if (settled || evaluating) return;
      evaluating = true;
      try {
        if (!user) { location.replace(`login.html?next=${encodeURIComponent(location.pathname.split("/").pop() || "index.html")}`); return; }

        if (!user.emailVerified) {
          showGate(card("", "mail", "Verify your email",
            `We sent a verification link to <strong>${esc(user.email)}</strong>. Open it, then come back and press the button below. Check your spam folder if you can't find it.`,
            `${btn("recheck", "I've verified my email")}${btn("resend", "Send the link again", "btn")}${btn("out", "Sign out", "btn-ghost")}`));
          wire({
            recheck: async () => { await user.reload(); await user.getIdToken(true); evaluating = false; await evaluate(services.auth.currentUser); },
            resend: async (b) => { const { sendEmailVerification: send } = await import("firebase/auth"); await send(user); b.textContent = "Link sent. Check your inbox"; },
            out: signOut
          });
          return;
        }

        let member = await memberWithRetry(user);
        if (!member) {
          let req = await fetchAccessRequest(user.uid);
          if (!req) { await createAccessRequest(user); req = { status: "pending" }; }
          if (req.status === "declined") {
            showGate(card("is-danger", "lock", "Access wasn't approved",
              "An administrator declined this request. If you think this is a mistake, please contact the school office.",
              btn("out", "Sign out")));
          } else {
            showGate(card("is-warn", "clock", "Waiting for approval",
              `Your request for <strong>${esc(user.email)}</strong> has been sent to the school administrators. You'll see the register as soon as one of them approves it. Press the button to check again.`,
              `${btn("again", "Check again")}${btn("out", "Sign out", "btn-ghost")}`));
            wire({ again: async () => { evaluating = false; await evaluate(services.auth.currentUser); }, out: signOut });
          }
          return;
        }

        if (access === "admin" && member.role !== "admin") {
          showGate(card("is-danger", "lock", "Administrators only",
            "This page is only for school administrators. Your account can use the rest of the register.",
            `<a class="btn btn-primary" href="index.html">Back to overview</a>`));
          return;
        }
        settled = true;
        document.getElementById("gate").hidden = true;
        resolve({ user, member });
      } catch (e) {
        showGate(card("is-danger", "alert", "We couldn't check your access", esc(friendlyError(e)),
          `${btn("retry", "Try again")}${btn("out", "Sign out", "btn-ghost")}`));
        wire({ retry: () => location.reload(), out: signOut });
      } finally { evaluating = false; }
    };

    onAuthStateChanged(services.auth, evaluate);
  });
}

/** A just-verified account can briefly carry an old token; refresh it once and retry. */
async function memberWithRetry(user) {
  try { return await fetchMember(user.uid); } catch (e) {
    if (e?.code !== "permission-denied") throw e;
    await user.getIdToken(true);
    return fetchMember(user.uid);
  }
}

function wire(handlers) {
  Object.entries(handlers).forEach(([id, fn]) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.addEventListener("click", async () => {
      b.classList.add("is-loading");
      try { await fn(b); } catch (e) { b.textContent = friendlyError(e); } finally { b.classList.remove("is-loading"); }
    });
  });
}

export { features };

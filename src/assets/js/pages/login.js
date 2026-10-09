import { onAuthStateChanged } from "firebase/auth";
import { initTheme } from "../lib/theme.js";
import { getServices, isConfigured, features } from "../lib/firebase.js";
import { signIn, signUp, googleSignIn, resetPassword, friendlyError } from "../lib/auth.js";
import { safeNext, $, icon, esc } from "../lib/util.js";

initTheme();
const next = safeNext(new URLSearchParams(location.search).get("next"));
const alertBox = $("#authAlert");
const forms = { in: $("#formIn"), up: $("#formUp"), reset: $("#formReset") };

const say = (msg, kind = "error") => { alertBox.innerHTML = msg ? `<div class="alert alert-${kind}">${icon(kind === "error" ? "alert" : "check")}<span>${esc(msg)}</span></div>` : ""; };
const fieldError = (id, msg) => { const el = $(`#${id}Err`), input = $(`#${id}`); el.hidden = !msg; el.textContent = msg || ""; input.toggleAttribute("aria-invalid", Boolean(msg)); if (msg) input.setAttribute("aria-describedby", `${id}Err`); };
const busy = (btn, on) => { btn.classList.toggle("is-loading", on); btn.disabled = on; };

function show(which) {
  Object.entries(forms).forEach(([k, f]) => { f.hidden = k !== which; });
  const isReset = which === "reset";
  $(".auth-tabs").hidden = isReset;
  $("#authTitle").textContent = isReset ? "Reset your password" : which === "up" ? "Request access" : "Welcome back";
  $("#authLede").textContent = isReset ? "Enter your email and we'll send you a link to choose a new password." : which === "up" ? "Create an account with your school email." : "Sign in to open the register.";
  $("#tabIn").setAttribute("aria-selected", String(which === "in")); $("#tabIn").tabIndex = which === "in" ? 0 : -1;
  $("#tabUp").setAttribute("aria-selected", String(which === "up")); $("#tabUp").tabIndex = which === "up" ? 0 : -1;
  say("");
  forms[which].querySelector("input")?.focus({ preventScroll: true });
}
$("#tabIn").addEventListener("click", () => show("in"));
$("#tabUp").addEventListener("click", () => show("up"));
$("#forgotBtn").addEventListener("click", () => show("reset"));
$("#rsBack").addEventListener("click", () => show("in"));
$(".auth-tabs").addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const goUp = $("#tabIn").getAttribute("aria-selected") === "true"; show(goUp ? "up" : "in"); (goUp ? $("#tabUp") : $("#tabIn")).focus(); }
});

let signingUp = false;
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

if (!isConfigured) {
  say("This site hasn't been connected to Firebase yet, so sign-in is switched off. The owner can finish setup with docs/FIREBASE_LOGIN_SETUP.md.", "error");
  document.querySelectorAll("form button, form input").forEach((el) => { el.disabled = true; });
} else {
  if (features.googleSignIn) $("#googleWrap").hidden = false;
  getServices().then(({ auth }) => onAuthStateChanged(auth, (u) => { if (u && !signingUp) location.replace(next); })).catch((e) => say(friendlyError(e)));
}

async function run(btn, task) {
  say(""); busy(btn, true);
  try { await task(); } catch (e) { say(friendlyError(e)); } finally { busy(btn, false); }
}

forms.in.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#inEmail").value.trim(), pass = $("#inPass").value;
  fieldError("inEmail", emailOk(email) ? "" : "Enter a valid email address.");
  fieldError("inPass", pass ? "" : "Enter your password.");
  if (!emailOk(email) || !pass) return;
  run($("#inSubmit"), async () => { await signIn(email, pass, $("#inRemember").checked); location.replace(next); });
});

forms.up.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#upName").value.trim(), email = $("#upEmail").value.trim(), pass = $("#upPass").value;
  fieldError("upName", name.length >= 2 ? "" : "Enter your full name.");
  fieldError("upEmail", emailOk(email) ? "" : "Enter a valid email address.");
  fieldError("upPass", pass.length >= 8 ? "" : "Use at least 8 characters.");
  if (name.length < 2 || !emailOk(email) || pass.length < 8) return;
  signingUp = true;
  run($("#upSubmit"), async () => { try { await signUp(name, email, pass, $("#upRemember").checked); location.replace("index.html"); } finally { signingUp = false; } });
});

forms.reset.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#rsEmail").value.trim();
  fieldError("rsEmail", emailOk(email) ? "" : "Enter a valid email address.");
  if (!emailOk(email)) return;
  run($("#rsSubmit"), async () => {
    await resetPassword(email);
    say("If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.", "success");
  });
});

$("#googleBtn").addEventListener("click", () => run($("#googleBtn"), async () => { await googleSignIn($("#inRemember").checked); location.replace(next); }));

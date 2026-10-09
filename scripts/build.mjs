// Build script: assembles src/ into dist/. No dependencies, runs on GitHub Actions
// (Node 20+). It (1) wraps every page in the shared layout, (2) writes the Firebase
// config from environment variables so no configuration lives in the repository,
// (3) computes Content Security Policy hashes for inline scripts, and (4) bundles CSS.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");
const cfg = JSON.parse(readFileSync(join(root, "site.config.json"), "utf8"));
const env = process.env;

// SITE_BASE is the URL path the site is served from, e.g. "/ilado-school-dashboard/" on GitHub Pages.
let SITE_BASE = env.SITE_BASE || "/";
if (!SITE_BASE.startsWith("/")) SITE_BASE = "/" + SITE_BASE;
if (!SITE_BASE.endsWith("/")) SITE_BASE += "/";
const SITE_URL = (env.SITE_URL || "").replace(/\/$/, "");
const isCI = env.CI === "true";
const strict = env.REQUIRE_FIREBASE_CONFIG === "true";

/* ---------- Firebase config from environment ---------- */
const firebase = {
  apiKey: env.FIREBASE_API_KEY || "",
  authDomain: env.FIREBASE_AUTH_DOMAIN || "",
  projectId: env.FIREBASE_PROJECT_ID || "",
  appId: env.FIREBASE_APP_ID || "",
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || ""
};
const required = ["FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN", "FIREBASE_PROJECT_ID", "FIREBASE_APP_ID"];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  const msg = `Missing Firebase settings: ${missing.join(", ")}. Add them under Settings > Secrets and variables > Actions (see docs/FIREBASE_LOGIN_SETUP.md, step 8).`;
  if (strict) { console.error("\nERROR: " + msg + "\n"); process.exit(1); }
  console.warn("WARNING: " + msg + " The site will build, but sign-in will show a setup notice.");
}
const features = {
  googleSignIn: env.ENABLE_GOOGLE_SIGNIN === "true",
  appCheckSiteKey: env.FIREBASE_APPCHECK_SITE_KEY || "",
  idleMinutes: Number(env.IDLE_TIMEOUT_MINUTES) > 0 ? Number(env.IDLE_TIMEOUT_MINUTES) : 30
};

/* ---------- Helpers ---------- */
const read = (p) => readFileSync(join(src, p), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sha = (s) => "'sha256-" + createHash("sha256").update(s, "utf8").digest("base64") + "'";

function buildCsp(html) {
  const hashes = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => sha(m[1]));
  const appCheck = !!features.appCheckSiteKey;
  const authFrame = firebase.authDomain ? `https://${firebase.authDomain}` : "https://*.firebaseapp.com";
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(" ")} https://www.gstatic.com https://cdnjs.cloudflare.com${appCheck ? " https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/" : ""}`,
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: https://*.googleusercontent.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebaseinstallations.googleapis.com",
    `frame-src ${authFrame} https://accounts.google.com${appCheck ? " https://www.google.com/recaptcha/ https://recaptcha.google.com" : ""}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "manifest-src 'self'"
  ].join("; ");
}

function iconUse(id) { return `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`; }

function navHtml(activeId) {
  return cfg.groups.map((g) => {
    const items = cfg.pages.filter((p) => p.group === g.id);
    const links = items.map((p) => {
      const cur = p.id === activeId ? ' aria-current="page"' : "";
      return `<a class="nav-link" href="${p.id}.html"${cur}>${iconUse(p.icon)}<span>${esc(p.nav)}</span></a>`;
    }).join("");
    const adminAttr = g.access === "admin" ? ' data-admin-only hidden' : "";
    return `<div class="nav-group"${adminAttr}><p class="nav-label">${esc(g.label)}</p>${links}</div>`;
  }).join("");
}

const importMap = JSON.stringify({
  imports: {
    "firebase/app": `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/firebase-app.js`,
    "firebase/auth": `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/firebase-auth.js`,
    "firebase/firestore": `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/firebase-firestore.js`,
    "firebase/app-check": `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/firebase-app-check.js`
  }
});

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`Template placeholder {{${k}}} has no value`);
    return vars[k];
  });
}

function seoVars(title, description, file) {
  const canonical = SITE_URL ? `<link rel="canonical" href="${SITE_URL}/${file}">` : "";
  const og = SITE_URL
    ? `<meta property="og:image" content="${SITE_URL}/assets/img/og-image.png"><meta property="og:url" content="${SITE_URL}/${file}">`
    : "";
  return { canonical, og, title: esc(title), description: esc(description) };
}

/* ---------- Build ---------- */
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Static assets (images, manifest, robots) and JS modules
cpSync(join(src, "assets/img"), join(dist, "assets/img"), { recursive: true });
cpSync(join(src, "assets/js"), join(dist, "assets/js"), { recursive: true });
for (const f of ["manifest.webmanifest", "robots.txt"]) cpSync(join(src, f), join(dist, f));

// Generated Firebase config (never committed)
writeFileSync(
  join(dist, "assets/js/firebase-config.js"),
  `// Generated at build time from GitHub Actions secrets. Not stored in the repository.\n` +
  `export const firebaseConfig = ${JSON.stringify(firebase, null, 2)};\n` +
  `export const features = ${JSON.stringify(features, null, 2)};\n`
);

// CSS: concatenate in a fixed order and strip comments/whitespace
const cssOrder = ["tokens.css", "base.css", "layout.css", "components.css", "pages.css", "print.css"];
const css = cssOrder.map((f) => read(`assets/css/${f}`)).join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s*([{};,>])\s*/g, "$1").replace(/:\s+/g, ":").replace(/\s{2,}/g, " ").trim();
mkdirSync(join(dist, "assets/css"), { recursive: true });
writeFileSync(join(dist, "assets/css/app.css"), css);

const version = (env.GITHUB_SHA || "dev").slice(0, 7);
const sprite = read("partials/icons.svg");
const layout = read("layout.html");
const authLayout = read("auth-layout.html");

function finalize(html, file) {
  html = html.replace("{{csp}}", buildCsp(html));
  writeFileSync(join(dist, file), html);
}

for (const p of cfg.pages) {
  const content = read(`pages/${p.id}.html`);
  const html = render(layout, {
    ...seoVars(`${p.title} · ${cfg.name}`, p.description, `${p.id}.html`),
    siteName: esc(cfg.name), school: esc(cfg.school), location: esc(cfg.location), session: esc(cfg.session),
    id: p.id, access: p.access, script: p.script, heading: esc(p.heading), lede: esc(p.lede),
    nav: navHtml(p.id), content, sprite, importMap, version, csp: "{{csp}}"
  });
  finalize(html, `${p.id}.html`);
}

// Login and 404 use the lighter auth layout
for (const [id, title, description, script] of [
  ["login", "Sign in", "Sign in to the ISCGS Register with your school account.", "login"],
  ["404", "Page not found", "This page does not exist.", "notfound"]
]) {
  const html = render(authLayout, {
    ...seoVars(`${title} · ${cfg.name}`, description, `${id}.html`),
    baseTag: id === "404" ? `<base href="${SITE_BASE}">` : "", siteName: esc(cfg.name), school: esc(cfg.school), id, script,
    content: read(`pages/${id}.html`), sprite, importMap, version, csp: "{{csp}}"
  });
  finalize(html, `${id}.html`);
}

console.log(`Built ${cfg.pages.length + 2} pages into dist/ (base "${SITE_BASE || "/"}", build ${version}).`);

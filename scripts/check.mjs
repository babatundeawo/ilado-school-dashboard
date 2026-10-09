// Quality gates for the built site (dist/). Run by GitHub Actions after the build.
// Reports problems clearly; only real breakages (errors) fail the build.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const cfg = JSON.parse(readFileSync(join(root, "site.config.json"), "utf8"));
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

if (!existsSync(dist)) { console.error("dist/ not found. Run the build first."); process.exit(1); }
const htmlFiles = readdirSync(dist).filter((f) => f.endsWith(".html"));

for (const f of htmlFiles) {
  const html = readFileSync(join(dist, f), "utf8");
  if (!/<title>[^<]{3,}<\/title>/.test(html)) err(`${f}: missing <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) warn(`${f}: description is missing or short`);
  if (!/<html lang="/.test(html)) err(`${f}: <html> needs a lang attribute`);
  if (!/<meta http-equiv="Content-Security-Policy"/.test(html)) err(`${f}: no Content-Security-Policy`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) warn(`${f}: expected exactly one <h1>`);
  if (/\sstyle="/.test(html.replace(/<svg[\s\S]*?<\/svg>/, ""))) err(`${f}: inline style attribute (blocked by the CSP)`);
  if (/\{\{\w+\}\}/.test(html)) err(`${f}: unreplaced template placeholder`);
  for (const img of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(img[0])) err(`${f}: <img> without alt text`);

  // Internal links and assets must exist
  for (const m of html.matchAll(/(?:href|src)="([^"#?:]+?)(?:[?#][^"]*)?"/g)) {
    const ref = m[1];
    if (ref.startsWith("http") || ref.startsWith("//") || ref.startsWith("data:")) continue;
    const target = normalize(join(dist, ref.startsWith("/") ? ref.slice(1) : ref));
    if (!existsSync(target)) err(`${f}: broken reference to "${ref}"`);
  }
}

// Every page in the config was built, and every nav link points at a built page
for (const p of cfg.pages) if (!htmlFiles.includes(`${p.id}.html`)) err(`${p.id}.html was not built`);

// JS modules: relative imports resolve
function walk(dir) { return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
for (const file of walk(join(dist, "assets/js")).filter((p) => p.endsWith(".js"))) {
  const code = readFileSync(file, "utf8");
  for (const m of code.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    if (!existsSync(normalize(join(dirname(file), m[1])))) err(`${file.replace(dist + "/", "")}: missing import "${m[1]}"`);
  }
  if (/console\.(log|debug)\(/.test(code)) warn(`${file.replace(dist + "/", "")}: leftover console.log`);
}

// Private data must never reach the public site
const forbidden = ["data.js", "pass.code", "serviceAccount", ".env"];
for (const file of walk(dist)) for (const bad of forbidden) if (file.endsWith(bad)) err(`Forbidden file in the build: ${file.replace(dist + "/", "")}`);
const sizeKb = walk(dist).reduce((n, f) => n + statSync(f).size, 0) / 1024;
if (sizeKb > 3000) err(`Build is unexpectedly large (${Math.round(sizeKb)} KB). Is private data included?`);
const secretLike = /(AIza[0-9A-Za-z_-]{35})/;
for (const file of walk(dist).filter((p) => /\.(html|js|css)$/.test(p) && !p.endsWith("firebase-config.js"))) {
  if (secretLike.test(readFileSync(file, "utf8"))) err(`Possible API key hard-coded in ${file.replace(dist + "/", "")}`);
}

warnings.forEach((w) => console.warn("  warning:", w));
errors.forEach((e) => console.error("  ERROR:  ", e));
console.log(`\nChecked ${htmlFiles.length} pages: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);

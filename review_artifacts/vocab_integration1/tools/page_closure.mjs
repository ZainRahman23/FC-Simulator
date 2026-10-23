// page_closure.mjs — the files a sandbox page loads: its classic <script src>, the ES-module graph from its module scripts (static
// `import … from "…"`, `export … from "…"` and literal dynamic `import("…")`), and the data files the code names literally (.json / .bin /
// .png under sandbox/ or assets/). Paths are relative to the checkout root. With --blobs, each file's git blob at HEAD (git hash-object).
//   node page_closure.mjs sandbox/visual/croqlw_lab.html [--blobs] [--json out.json]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const page = process.argv[2]; if (!page) { console.error("usage: node page_closure.mjs <page.html> [--blobs] [--json f]"); process.exit(1); }
const seen = new Set(), data = new Set();
const rel = (abs) => path.relative(ROOT, abs);
function visitModule(abs) { if (seen.has(abs) || !fs.existsSync(abs)) return; seen.add(abs); const src = fs.readFileSync(abs, "utf8"), dir = path.dirname(abs);
  const re = /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g; let m;
  while ((m = re.exec(src))) { const spec = m[1] || m[2] || m[3]; if (!spec || !spec.startsWith(".")) continue; visitModule(path.resolve(dir, spec)); }
  // (literal data files the module names — resolved against the module's folder, the page's folder and the root)
  const dr = /["'`]([^"'`\s]+?\.(?:json|bin|png))["'`]/g; while ((m = dr.exec(src))) { const p = m[1]; if (/^https?:/.test(p) || p.includes("${")) continue;
    for (const base of [dir, path.dirname(path.resolve(ROOT, page)), ROOT]) { const a = path.resolve(base, p); if (fs.existsSync(a)) { data.add(rel(a)); break; } } } }
const html = fs.readFileSync(path.resolve(ROOT, page), "utf8"), pdir = path.dirname(path.resolve(ROOT, page));
for (const m of html.matchAll(/<script([^>]*)\ssrc=["']([^"']+)["']/g)) { const abs = path.resolve(pdir, m[2]); if (/type=["']module["']/.test(m[1])) visitModule(abs); else if (fs.existsSync(abs)) seen.add(abs); }
const files = [rel(path.resolve(ROOT, page)), ...[...seen].map(rel)].concat([...data]).filter((x, i, a) => a.indexOf(x) === i).sort();
const out = { page, files: files.length, list: files };
if (process.argv.includes("--blobs")) out.blobs = Object.fromEntries(files.map((f) => [f, execFileSync("git", ["hash-object", f], { cwd: ROOT }).toString().trim()]));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
console.log(`${page}: ${files.length} files`); for (const f of files) console.log("  " + f + (out.blobs ? "  " + out.blobs[f] : ""));

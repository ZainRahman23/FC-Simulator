// dribble15/tools/d15_review_build.mjs — builds review_artifacts/dribble15/review/DRIBBLE15_REVIEW.html (the owner's DRIBBLE-1.5: a small page — the known case, the
// recovered 90° cuts, a regression, the 60° case, straight RUN; the D1.2 / D1.3 / D1.4 / D1.5 table, the single-change experiments and the
// D1.4 → D1.5 matched-seed classification) from the videos (../videos), posters (made here
// with ffmpeg), stills, the evidence JSONs and DRIBBLE15_STATUS.json. LOCAL REVIEW ONLY: the lab shows real player names.
// usage: FFMPEG=<bin> node d15_review_build.mjs
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../../../review_artifacts/dribble15"), VID = path.join(ROOT, "videos"), POS = path.join(ROOT, "posters"), EV = path.join(ROOT, "evidence"), OUT = path.join(ROOT, "review");
fs.mkdirSync(POS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(EV, f), "utf8")); } catch { return null; } };
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "DRIBBLE15_STATUS.json"), "utf8"));
const lines = fs.readFileSync(path.join(HERE, "d15_videos.txt"), "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("|").map((x) => x.trim()));
const meta = {}; for (const l of lines) { if (l[0] === "SBS") meta[l[1]] = { sbs: 2, clips: [l[2], l[3]] }; else meta[l[0]] = { page: l[1], q: l[2], t0: +l[3], t1: +l[4], view: l[5], rate: +l[6] }; }
for (const m of Object.values(meta)) if (m.sbs) Object.assign(m, { q: meta[m.clips[0]].q, t0: meta[m.clips[0]].t0, t1: meta[m.clips[0]].t1, view: "sbs", rate: meta[m.clips[0]].rate, pages: m.clips.map((c) => meta[c].page) });
for (const name of Object.keys(meta)) { const v = path.join(VID, name + ".mp4"), p = path.join(POS, name + ".jpg"); if (!fs.existsSync(v) || fs.existsSync(p)) continue;
  const m = meta[name], dur = (m.t1 - m.t0) / m.rate; execFileSync(process.env.FFMPEG || "ffmpeg", ["-v", "error", "-y", "-ss", (dur * 0.55).toFixed(2), "-i", v, "-frames:v", "1", "-q:v", "4", "-vf", "scale=1600:-2", p]); }
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lab = (page, q) => `http://127.0.0.1:8361/sandbox/visual/${page || "dribble15.html"}?${q}`;
const PN = { "dribble12.html": "DRIBBLE-1.2", "dribble13.html": "DRIBBLE-1.3", "dribble14.html": "DRIBBLE-1.4", "dribble15.html": "DRIBBLE-1.5" };
const fig = (name, cap, big) => { const m = meta[name]; if (!m || !fs.existsSync(path.join(VID, name + ".mp4"))) return `<p class="miss">missing ${name}</p>`;
  const cam = (q) => (/zoom=/.test(q || "") ? "the gameplay camera zoomed 2.6×" : "the 1× Touchline gameplay camera");
  const view = m.sbs ? `${m.pages.map((p) => PN[p] || p).join(" | ")}, same scenario / seed / player, frame-synchronised, ${m.rate}× speed, ${meta[m.clips[0]].view === "game" ? cam(meta[m.clips[0]].q) : "close view (" + meta[m.clips[0]].view + ")"}` : m.view === "game" ? `${m.rate}× ${cam(m.q)}` : `close view (${m.view}) at ${m.rate}× speed${/diag=1/.test(m.q) ? ", diagnostics on" : ""}`;
  const links = m.sbs ? m.pages.map((p, i) => `<a href="${lab(p, meta[m.clips[i]].q)}">${PN[p]} lab</a>`).join(" · ") : `<a href="${lab(m.page, m.q)}">open in the lab</a>`;
  return `<figure class="${big ? "big" : ""}"><video controls muted loop playsinline preload="none" poster="../posters/${name}.jpg" src="../videos/${name}.mp4"></video><figcaption><b>${esc(cap)}</b><br><span class="mut">${view} · sim ${m.t0}–${m.t1} s · <code>${name}.mp4</code> · ${links}</span></figcaption></figure>`; };
const grid = (items) => `<div class="g1">${(items || []).map(([a, b]) => fig(a, b)).join("")}</div>`;
const strip = (s) => { const f = path.join(ROOT, "stills", s.file); return fs.existsSync(f) ? `<figure><img src="../stills/${s.file}" style="width:100%;border-radius:4px"><figcaption><b>${esc(s.caption)}</b></figcaption></figure>` : `<p class="miss">missing still ${s.file}</p>`; };
const td = (x, cls) => `<td${cls ? ` class="${cls}"` : ""}>${x == null ? "—" : esc(x)}</td>`;
// performance table (the owner's §27): DRIBBLE-1.2 | 1.3 | 1.4
const P = S.perf || { rows: [] };
const perf = `<div class="tw"><table class="perf"><tr><th>metric</th><th>DRIBBLE-1.2</th><th>DRIBBLE-1.3</th><th>DRIBBLE-1.4</th><th>DRIBBLE-1.5</th></tr>${P.rows.map((r) => `<tr><td>${esc(r[0])}</td>${td(r[1])}${td(r[2])}${td(r[3])}${td(r[4], "hl")}</tr>`).join("")}</table></div>`;
// the single-change experiments (S.experiments: [[name, change, taken, clean, clean60, clean90, 60R, 60L, 90R, 90L, note]])
const exTable = `<div class="tw"><table><tr><th>configuration (384 cut runs, seeds 1–96)</th><th>change against DRIBBLE-1.4</th><th>taken</th><th>clean</th><th>clean 60°</th><th>clean 90°</th><th>60R · 60L · 90R · 90L per 8</th><th>note</th></tr>${(S.experiments || []).map((r) => `<tr><td><b>${esc(r[0])}</b></td>${td(r[1])}${td(r[2])}${td(r[3])}${td(r[4])}${td(r[5], r[11] ? "hl" : "")}${td(r[6])}${td(r[7])}</tr>`).join("")}</table></div>`;
const df = J("diff_d14_d15.json");
const dfTable = df ? `<div class="tw"><table><tr><th>DRIBBLE-1.4 → DRIBBLE-1.5, matched seeds (384 runs)</th><th>runs</th></tr>${Object.entries(df.tally).map(([k, v]) => `<tr><td>${esc(k)}</td>${td(v)}</tr>`).join("")}</table></div>
<div class="tw"><table><tr><th>first changed decision (better / worse runs)</th><th>better</th><th>worse</th></tr>${Object.entries(df.causes).map(([k, v]) => `<tr><td>${esc(k)}</td>${td(v.better)}${td(v.worse)}</tr>`).join("")}</table></div>
<div class="tw"><table><tr><th>run</th><th>D1.4 → D1.5</th><th>first changed decision</th><th>D1.4 plan</th><th>D1.5 plan</th><th>error draws on common touches</th></tr>${df.rows.map((r) => `<tr><td>${r.id}:${r.sd}</td>${td(r.d14 + " → " + r.d15, r.kind === "worse" ? "bad" : "hl")}${td(r.why)}${td(r.firstChange.d14 ? `${r.firstChange.d14.role} ${r.firstChange.d14.F} ${r.firstChange.d14.reg} @${r.firstChange.d14.kc}` : "—")}${td(r.firstChange.d15 ? `${r.firstChange.d15.role} ${r.firstChange.d15.F} ${r.firstChange.d15.reg} @${r.firstChange.d15.kc}` : "—")}${td(`${r.sameDraws} / ${r.commonTouches} identical`)}</tr>`).join("")}</table></div>` : `<p class="miss">diff missing</p>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DRIBBLE-1.5 review</title>
<style>:root{--bg:#0f1412;--fg:#e6efe9;--mut:#9fb3a8;--card:#16201b;--line:#2c3d34;--acc:#8cffaa;--warn:#ffd45e;--bad:#ff8a7a}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1500px;margin:0 auto;padding:16px 22px 60px}
a{color:#9fd8ff}code{font:12.5px ui-monospace,Menlo,monospace;color:#cfe}h1{font-size:24px;margin:6px 0}h2{font-size:19px;margin:34px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}
.card{background:var(--card);border-radius:8px;padding:10px 14px;margin:10px 0}.mut{color:var(--mut)}.miss{color:var(--bad)}.vl{font-family:ui-monospace,Menlo,monospace;font-size:13.5px;line-height:1.75}.vl b{color:var(--acc)}.vl b.p{color:var(--warn)}.vl b.f{color:var(--bad)}
video{width:100%;background:#000;border-radius:4px;display:block}figure{margin:6px 0 12px}figcaption{font-size:13px;margin-top:4px}.g1{display:grid;gap:12px;grid-template-columns:1fr}.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}td.hl{color:var(--acc);font-weight:600}td.bad{color:var(--bad)}table.perf td{font-size:13.5px}li{margin:3px 0}</style></head><body><main>
<h1>DRIBBLE-1.5 — the last narrow foundation pass</h1>
<p class="mut">${esc(S.date)} · branch <code>prototype/dribble-1</code> · instruction <code>review_artifacts/dribble15/sources/2026-10-18_user_instruction_dribble1_5_last_foundation_pass.md</code> · <b>local review page</b> (real player names) · labs: <a href="${lab("dribble15.html", "scn=CUT90_RUN&seed=83&diag=1")}">DRIBBLE-1.5</a> · <a href="${lab("dribble14.html", "scn=CUT90_RUN&seed=83&diag=1")}">DRIBBLE-1.4</a></p>
<div class="card vl">${S.statusLines.map(([k, v]) => `${esc(k)}: <b class="${/^(FAIL|NO)\b/.test(v) ? "f" : /PARTIAL|NOT MET/.test(v) ? "p" : ""}">${esc(v)}</b>`).join("<br>")}</div>
<p class="mut">I cannot play video in real time; every judgement on this page was made from frame strips and stills of these clips.</p>
<h2>Three videos to watch first</h2>${S.watchFirst.map(([n, c]) => fig(n, c, true)).join("")}
<h2>D1.2 / D1.3 / D1.4 / D1.5 — 384 cut runs per core (4 cuts × seeds 1–96)</h2>${perf}<div class="card">${S.perfNote || ""}</div>
<h2>A — the 90° root cause: a second stage measured from the lagging velocity</h2><div class="card">${S.caseA || ""}</div>${grid(S.videos.A)}${(S.stillsA || []).map(strip).join("")}
<h2>B — recovered clean 90° cuts</h2><div class="card">${S.caseB || ""}</div>${grid(S.videos.B)}
<h2>C — the known 90° right seed 16 case</h2><div class="card">${S.caseC || ""}</div>${grid(S.videos.C)}
<h2>D — a D1.4 → D1.5 regression</h2><div class="card">${S.caseD || ""}</div>${grid(S.videos.D)}
<h2>E — the best recovered 60° cut (DRIBBLE-1.4) and straight RUN</h2><div class="card">${S.caseE || ""}</div>${grid(S.videos.E)}
<h2>The single-change experiments</h2><div class="card">${S.expNote || ""}</div>${exTable}
<h2>Every D1.4 → D1.5 change, on matched seeds</h2><div class="card">${S.diffNote || ""}</div>${dfTable}
<h2>What changed</h2><div class="card"><ul>${S.howItWorks.map((x) => `<li>${x}</li>`).join("")}</ul></div>
<h2>Limitations and next step</h2><div class="card"><h3>Three limitations to leave to attributes / defenders</h3><ol>${S.limitations.map((x) => `<li>${x}</li>`).join("")}</ol><h3>Recommended next step</h3><p>${S.nextStep}</p></div>
<h2>Provenance</h2><div class="card"><ul>${S.provenance.map((x) => `<li>${x}</li>`).join("")}</ul></div>
</main></body></html>`;
fs.writeFileSync(path.join(OUT, "DRIBBLE15_REVIEW.html"), html); console.log("wrote", path.join(OUT, "DRIBBLE15_REVIEW.html"));

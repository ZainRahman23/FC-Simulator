// turn1/tools/t1_review_build.cjs — builds review_artifacts/turn1/review/TURN1_REVIEW.html from the evidence (TURN1_check.json, TURN1_continuity.json,
// TURN1_status.json) and the renders in review/video + review/posters. Presentation only. usage (any cwd): node t1_review_build.cjs
const fs = require("fs"), path = require("path");
const RA = path.resolve(__dirname, "../../../../review_artifacts/turn1"), EV = (f) => JSON.parse(fs.readFileSync(path.join(RA, "evidence", f), "utf8"));
const C = EV("TURN1_check.json").scenarios, P = EV("TURN1_continuity.json").scenarios, ST = EV("TURN1_status.json"), SCN = require("../turn1_scenarios.js");
const vids = new Set(fs.readdirSync(path.join(RA, "review", "video"))), has = (f) => vids.has(f);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), f2 = (x) => x == null ? "–" : (+x).toFixed(2);
const vid = (id, cap, big) => has(id + ".mp4") ? `<figure class="${big ? "big" : ""}"><video controls muted loop playsinline preload="none" ${fs.existsSync(path.join(RA, "review", "posters", id.replace(/_025x|_GAME1x/, "") + ".jpg")) ? `poster="posters/${id.replace(/_025x|_GAME1x/, "")}.jpg"` : ""} src="video/${id}.mp4"></video><figcaption>${cap}</figcaption></figure>` : `<p class="miss">missing ${id}</p>`;
const tech = (c) => !c ? "" : c.maneuver ? `${c.maneuver[0] === "PIVOT" ? "PIVOT" : c.maneuver[1]} · plant +${f2(c.plantAfterS)} s` : "ARC";
const cell = (id) => { const c = C[id]; if (!c) return "<td>–</td>"; const p = P[id] ? Math.max(P[id].pelvis.mm, P[id].head.mm) : null;
  return `<td><video controls muted loop playsinline preload="none" poster="posters/${id}.jpg" src="video/${id}.mp4"></video><div class="m"><b>${esc(tech(c))}</b> · heading ±5° +${f2(c.headingWithin5degAfterS)} s · v min ${f2(c.speedMin)} · slip ${c.slipMaxCm} cm</div></td>`; };
const SPD = [["JOG", "JOG 5.5 m/s"], ["RUN", "RUN 7.8 m/s"], ["SPRINT", "SPRINT 9.5 m/s"]];
let matrix = "";
for (const side of [["R", "RIGHT — toward the camera"], ["L", "LEFT — away from the camera"]]) {
  matrix += `<h3>${side[1]}</h3><div class="tw"><table class="mx"><tr><th>turn</th>${SPD.map(s => `<th>${s[1]}</th>`).join("")}</tr>`;
  for (const a of SCN.ANGLES) matrix += `<tr><th>${a}°</th>${SPD.map(s => cell(`${s[0]}_${a}${side[0]}`)).join("")}</tr>`;
  matrix += `</table></div>`; }
const straight = `<div class="grid3">${SPD.map(s => vid(`${s[0]}_STRAIGHT`, `${s[1]} straight — RUN-1.3 control (TURN-1 must not change it)`)).join("")}</div>`;
const seqIds = ["ZIGZAG_RUN", "ZIGZAG_JOG", "SLALOM_JOG", "SLALOM_SPRINT", "CONT_CURVE", "CONT_PRE_RETARGET", "CONT_PRE_ABANDON", "CONT_PRE_FLIP", "CONT_POST"];
const seqs = `<div class="grid3">${seqIds.map(id => vid(id, `${esc(SCN.get(id).label)}${C[id] ? ` · ${esc(tech(C[id]))}` : ""}`)).join("")}</div>`;
const slow = `<div class="grid2">${["JOG_90R", "SPRINT_90L", "RUN_60R", "JOG_30R", "JOG_180L", "ZIGZAG_RUN"].map(id => vid(id + "_025x", `${esc(SCN.get(id).label)} — 0.25×`)).join("")}</div>`;
const game = `<div class="grid3">${["JOG_90R", "SPRINT_90L", "RUN_60R", "SLALOM_JOG", "ZIGZAG_RUN", "SPRINT_180R"].map(id => vid(id + "_GAME1x", `${esc(SCN.get(id).label)} — the real gameplay camera at 1× zoom`)).join("")}</div>`;
const first = `<div class="grid3">${ST.watchFirst.map(w => vid(w.id, `<b>${esc(w.why)}</b><br>${esc(SCN.get(w.id.replace(/_025x|_GAME1x/, "")).label)}`, true)).join("")}</div>`;
const metricRows = Object.entries(C).map(([id, c]) => `<tr><td>${id}</td><td>${c.deterministic ? "yes" : "NO"}</td><td>${esc(tech(c) || "–")}</td><td>${f2(c.headingWithin5degAfterS)}</td><td>${f2(c.speedMin)}</td><td>${c.slipMaxCm}</td><td>${c.reachMax.toFixed(3)}</td><td>${P[id] ? P[id].pelvis.mm : "–"}</td><td>${P[id] ? Math.max(...Object.values(P[id]).map(x => x.mm)).toFixed(1) : "–"}</td></tr>`).join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TURN-1 review</title>
<style>:root{--bg:#0f1412;--fg:#e6efe9;--mut:#9fb3a8;--card:#16201b;--line:#2c3d34;--acc:#ffd45e}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1800px;margin:auto;padding:16px}
h1{font-size:24px;margin:6px 0}h2{font-size:19px;margin:34px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}.card{background:var(--card);border-radius:8px;padding:10px 14px;margin:10px 0}
.vl{font-family:ui-monospace,Menlo,monospace;font-size:13.5px;line-height:1.75}.vl b{color:var(--acc)}video{width:100%;background:#000;border-radius:4px;display:block}figure{margin:6px 0 12px}figcaption,.m{font-size:12.5px;color:var(--mut)}figure.big figcaption{font-size:13.5px;color:var(--fg)}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:1000px){.grid3,.grid2{grid-template-columns:1fr}main{padding:10px 16px}}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}th{color:var(--mut)}.mx td{width:31%}.tw{overflow-x:auto}.mut{color:var(--mut)}code{color:#cfe9ff}ul li,ol li{margin:4px 0}.miss{color:#ffb0a0}</style></head><body><main>
<h1>TURN-1 — turning and cutting locomotion (no ball)</h1>
<p class="mut">16 Oct 2026 · branch <code>prototype/turn-1</code> · instruction <code>review_artifacts/turn1/sources/2026-10-16_user_instruction_turn1_turning_cutting_locomotion.md</code> · report <code>TURN1_REPORT.md</code>. I cannot play video in real time; I judged motion from frame strips and contact sheets, and the numbers below are measured. Please watch at 1×.</p>
<div class="card vl">${ST.statuses.map(([k, v]) => `${esc(k)}: <b>${esc(v)}</b>`).join("<br>")}</div>
<h2>Three videos to watch first</h2>${first}
<div class="card"><b>How to read the clips.</b> Left: the Touchline gameplay camera (CAMERA_V1 — 30 m high, 43 m back, 22° pitch, 28° FOV, rail-following), zoomed 2.2× around the runner (the "real camera" clips below are unzoomed). Top right: a close view from the gameplay camera's side. Bottom right: top-down debug — white line = COM track, green / pink = right / left foot paths, dots = plants (orange brake · red plant · yellow exit · green accel · blue run/arc), rings = where a swinging foot is aimed; arrows: cyan = requested direction, white = velocity (length ∝ speed), yellow = pelvis heading, violet = gaze. Bottom text: time, speed, travel direction, pelvis heading, request, step role, maneuver.</div>
<h2>The matrix: speed × requested turn</h2><p class="mut">Each run: 1 s straight at the speed, then the request (at the HUD's t 1.00 s); the clip starts at 0.5 s. Poster = the plant touchdown (cuts) or +0.45 s (arcs). Under each: the resolved technique and when its plant landed after the request, when the travel direction came within 5° of the request, the lowest speed, the largest plant-foot slip while loaded.</p>${matrix}
<h2>RUN → TURN / CUT → RUN, and continuous input</h2>${seqs}
<h2>Straight running is unchanged (controls)</h2>${straight}
<h2>0.25× diagnostics</h2>${slow}
<h2>The real gameplay camera (1× zoom, as in a match)</h2>${game}
<h2>The system</h2><div class="card">${ST.system}</div>
<h2>Minimum authored library (recommendation)</h2><div class="card">${ST.library}</div>
<h2>DRIBBLE-1 interface</h2><div class="card">${ST.dribble}</div>
<h2>Simulation / presentation boundary</h2><div class="card">${ST.boundary}</div>
<h2>Three biggest V1 defects</h2><ol>${ST.defects.map(d => `<li>${d}</li>`).join("")}</ol>
<h2>Measurements, every scenario</h2><p class="mut">Determinism: every scenario replayed twice in one process with identical state hashes (240 Hz log + 60 Hz joint positions). Continuity: the largest 240 Hz residual |p(t+h) − 2p(t) + p(t−h)| of the pelvis and of any tracked joint (pelvis, ankles, toe tips, hands, head); RUN-1.3's own straight running shows 14–36 mm at foot contact events (the landing transient), &lt; 1 mm at the pelvis. Slip: horizontal motion of the loaded contact point (heel, or toe pad once the heel is up / during a pivot) over 10–90 % of each stance.</p>
<div class="tw"><table><tr><th>scenario</th><th>deterministic</th><th>technique</th><th>heading ±5° after (s)</th><th>v min (m/s)</th><th>slip max (cm)</th><th>reach max</th><th>pelvis residual (mm)</th><th>worst joint residual (mm)</th></tr>${metricRows}</table></div>
</main></body></html>`;
fs.writeFileSync(path.join(RA, "review", "TURN1_REVIEW.html"), html); console.log("wrote TURN1_REVIEW.html", (html.length / 1024).toFixed(0) + " KB");

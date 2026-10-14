// SP2C review page builder: reads sp2c/evidence (SP2C_eval.json, sp2c_rollover.json, obstacle/obstacle_summary.json, SP2C_verdict.json) and the
// FSWEEP summary, writes sp2c/review/SP2C_REVIEW.html. Our renders: review/video/ (in Git). Reference material: review/local_reference/
// (gitignored; plays only on the machine that built it). Videos are loaded as blobs (the :8350 review server ignores Range requests).
// usage (worktree root): node .../sp2c/render/sp2c_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), R = path.join(D, ".."), EV = path.join(R, "evidence"), OUT = path.join(R, "review", "SP2C_REVIEW.html");
const rj = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f)); } catch (e) { return d; } };
const E = rj(path.join(EV, "SP2C_eval.json")), RO = rj(path.join(EV, "sp2c_rollover.json")), OB = rj(path.join(EV, "obstacle", "obstacle_summary.json")), VD = rj(path.join(EV, "SP2C_verdict.json"), { lines: [], note: "" });
const FS = rj(path.join(R, "..", "sp2a", "fsweep", "evidence", "fsweep_summary.json")).conditions;
const f = (x, d = 2) => x == null || !Number.isFinite(+x) ? "–" : (+x).toFixed(d), pct = (x) => x == null ? "–" : Math.round(100 * x) + "%", v3 = (a, d = 3) => a ? `(${a.map(x => f(x, d)).join(", ")})` : "–";
const C5 = E.runs.SP2C["5.0"], A5 = E.runs.SP2A["5.0"], SPEEDS = ["4.5", "5.0", "5.5"], MS = ["firstFoldContact", "+50ms", "+100ms", "+250ms", "+500ms", "+1.0s", "endOfSlide"];
// ── milestone diagnostics (SP2A F37.5 vs SP2C F37.5 at 5.0 m/s) ──
const contactsStr = (c) => Object.entries(c || {}).sort((a, b) => b[1].normalBW - a[1].normalBW).map(([g, x]) => `${g} ${f(x.normalBW)}/${f(x.brakeBW)}`).join("<br>") || "airborne";
const msRow = (lab, s) => !s ? `<tr><td>${lab}</td><td colspan="14" class="mut">–</td></tr>` : `<tr><td><b>${lab}</b><br><span class="mut">${f(s.t, 3)} s</span></td><td>${v3(s.knee_inPelvis, 2)}<br><span class="mut">ankle ${v3(s.ankle_inPelvis, 2)}</span></td>
  <td>${f(s.hip_L.flex, 0)} / ${f(s.hip_L.abd, 0)} / ${f(s.hip_L.rot, 0)}</td><td>${f(s.knee_L, 0)}</td><td>${f(s.ankle_L.df, 0)} / ${f(s.ankle_L.inv, 0)}</td><td>${f(s.foldBoot.soleDownCos)}<br><span class="mut">k ${f(s.foldBoot.k)}</span></td><td>${f(s.foldBoot.toeY * 100, 1)} / ${f(s.foldBoot.heelY * 100, 1)}</td>
  <td>${f(s.tackBootLowestY * 100, 1)}</td><td>${f(s.pelvis.pitch, 0)} / ${f(s.pelvis.roll, 0)} / ${f(s.pelvis.yaw, 0)}</td><td>up ${f(s.trunk.upY)}<br>belly ${f(s.trunk.bellyDownY)}</td><td>${f(s.head.y)} m<br><span class="mut">face ${f(s.head.faceY)}</span></td>
  <td>${Object.keys(s.armContacts || {}).length ? contactsStr(s.armContacts) : "none"}</td><td>${s.authority ? Object.entries(s.authority).map(([k, v]) => `${k} ${f(v)}`).join("<br>") : "–"}</td><td>${f(s.vh)} / ${f(s.vy)}<br><span class="mut">L<sub>roll</sub> ${f(s.angMomRoll, 1)}</span></td><td class="sm">${contactsStr(s.contacts)}</td></tr>`;
const msTable = (run) => `<div class="tw"><table><tr><th>milestone</th><th>fold knee in pelvis (x, y, z) m</th><th>fold hip flex / abd / rot °</th><th>knee °</th><th>ankle df / inv °</th><th>fold sole-down cos (&gt; 0 studs down)</th><th>fold toe / heel cm</th><th>tackling boot lowest cm</th><th>pelvis pitch / roll / yaw °</th><th>trunk</th><th>head</th><th>arm contacts N/BW</th><th>regional authority</th><th>COM v<sub>h</sub> / v<sub>y</sub> m/s</th><th>turf contacts: normal / braking (BW, ±10 ms)</th></tr>
  ${MS.map(k => msRow(k, run.milestones[k])).join("")}</table></div>`;
// ── per-run summary (both candidates, 3 speeds) ──
const lim = (run) => (run.sweepMeasures.climits || []).filter(e => e.beyondDeg >= 0.5).map(e => `${e.id} ${f(e.beyondDeg, 1)}° / ${f(e.durS, 2)} s`).join("<br>") || "none ≥ 0.5°";
const sumRow = (nm, sp, r) => { const sm = r.sweepMeasures, st = sm.studs || {}; return `<tr><td><b>${nm}</b></td><td>${sp}</td><td><code>${r.hash.slice(0, 8)}</code></td><td>${f(r.firstFoldContactT, 3)} s</td><td>${v3(r.milestones.firstFoldContact && r.milestones.firstFoldContact.knee_inPelvis, 2)}</td>
  <td>${r.proneT == null ? "<b>never</b>" : f(r.proneT) + " s"}</td><td>${sm.finalState.class}</td><td>${sm.finalState.headTurfT == null ? "never" : f(sm.finalState.headTurfT) + " s"}</td><td>${f(sm.slidePathM)} m</td><td>${sm.stopped && sm.stopped.t != null ? f(sm.stopped.t) + " s" : "moving"}</td>
  <td>${st.foldBoot ? f(st.foldBoot.studNormalNs, 1) : "–"} / ${st.tacklingBoot ? f(st.tacklingBoot.studNormalNs, 1) : "–"}</td><td>${r.ctrl.recoverFrom == null ? "–" : f(r.ctrl.recoverFrom) + " s"}</td><td class="sm">${lim(r)}</td><td>${f(sm.ledgerSlide && sm.ledgerSlide.closureResidualNs, 2)}</td></tr>`; };
const sumTable = `<div class="tw"><table><tr><th>candidate</th><th>m/s</th><th>hash</th><th>first fold contact</th><th>knee in pelvis there</th><th>first face-down</th><th>6 s state</th><th>head on turf</th><th>slide path</th><th>stops</th><th>studs N·s fold / tackling</th><th>recovery from</th><th>limits ≥ 0.5°</th><th>closure N·s</th></tr>
  ${SPEEDS.map(sp => sumRow("SP2A F37.5", sp, E.runs.SP2A[sp]) + sumRow("SP2C F37.5", sp, E.runs.SP2C[sp])).join("")}</table></div>`;
// ── braking / normal ledger by region ──
const CATS = ["boots (partial / upper / side)", "studs (legitimate, k≥0.999)", "shin/calf", "knee", "thigh", "hip/pelvis", "torso", "upper arms", "forearms/hands"];
const ledRow = (nm, r) => { const b = (r.sweepMeasures.ledgerSlide || {}).byRegion || {}; return `<tr><td><b>${nm}</b></td>${CATS.map(k => { const e = b[k] || {}; return `<td>${f(e.normalNs, 0)} <span class="mut">(${pct(e.normalShare)})</span><br><b>${f(e.brakeNs, 0)}</b> <span class="mut">(${pct(e.brakeShare)})</span></td>`; }).join("")}</tr>`; };
const ledTable = `<div class="tw"><table><tr><th>5.0 m/s, F37.5</th>${CATS.map(c => `<th>${c}</th>`).join("")}</tr>${ledRow("SP2A", A5)}${ledRow("SP2C", C5)}</table></div><p class="mut">Each cell: normal impulse N·s (share) / <b>friction braking N·s</b> (share), over the slide.</p>`;
// ── roll-over diagnosis ──
const roTable = RO ? `<div class="tw"><table><tr><th>factor changed ALONE on SP2A (F37.5)</th>${["4.5", "5.0", "5.5"].map(s => `<th>${s} m/s: first face-down · 6 s state</th>`).join("")}</tr>${Object.entries(RO.factors).map(([k, rs]) => `<tr><td><b>${k}</b></td>${rs.map(r => `<td>${r.proneT == null ? "<b>never</b>" : f(r.proneT) + " s"} · ${r.final}</td>`).join("")}</tr>`).join("")}</table></div>` : "";
// ── obstacles ──
const obTable = OB ? `<div class="tw"><table><tr><th>case</th><th>first hit</th><th>obstacle impulse N·s</th><th>tackling leg change at +50 ms (hip / knee °)</th><th>max deflection °</th><th>local-yield steps</th><th>regional failure</th><th>whole-body fallback</th><th>slide m</th></tr>
  ${Object.entries(OB.cases).map(([k, c]) => `<tr><td><b>${k}</b></td><td>${c.firstHit ? `${f(c.firstHit.t, 3)} s · ${c.firstHit.body}` : "none"}</td><td>${f(c.obstImpulseNs)}</td><td>${c.tackLegDeviation50msDeg ? `${c.tackLegDeviation50msDeg.hip_R} / ${c.tackLegDeviation50msDeg.knee_R}` : "–"}</td><td class="sm">${Object.entries(c.maxDeflDeg).map(([j, v]) => `${j} ${v}`).join(", ")}</td><td>${c.yieldSteps}</td><td>${c.regionalFailures && Object.keys(c.regionalFailures).length ? JSON.stringify(c.regionalFailures) : "none"}</td><td>${c.wholeBodyFallback == null ? "no" : f(c.wholeBodyFallback) + " s"}</td><td>${f(c.slideDistM)}</td></tr>`).join("")}</table></div>` : `<p class="mut">not run</p>`;
// ── videos ──
const LBL = { A100: "SP2A F100", A50: "SP2A F50", A25: "SP2A F25", A37: "SP2A F37.5", C37: "SP2C F37.5" }, IDS = Object.keys(LBL);
const VIEWS = [["CLOSE_1x", "close side · 1×", -0.30, 1, "REF_1x"], ["GAME_1x", "fixed gameplay camera ×4.5 · 1×", -0.30, 1, "REF_1x"], ["SIDE_025x", "side · 0.25×", -0.20, 0.25, "REF_025x"], ["R34_025x", "rear 3/4 (folded leg) · 0.25×", -0.20, 0.25, "REF_025x"],
  ["DIAG_025x", "colliders + skeleton + intent · 0.25×", -0.20, 0.25, "REF_025x"], ["FOLD_025x", "FOLDED-LEG CLOSE-UP rear 3/4 · 0.25×", -0.30, 0.25, "REF_FOLD_025x"], ["FOLDS_025x", "folded-leg close-up side · 0.25×", -0.30, 0.25, "REF_FOLD_025x"],
  ["END_1x", "END OF SLIDE (stop −1 s → +1 s) · 1×", null, 1, null], ["END_05x", "end of slide · 0.5×", null, 0.5, null], ["END_R34_05x", "end of slide rear 3/4 · 0.5×", null, 0.5, null]];
const vid = (src, cls = "grid", cap = "") => `<figure><video class="${cls}" data-src="${src}" controls muted loop playsinline preload="none"></video>${cap ? `<figcaption class="mut">${cap}</figcaption>` : ""}</figure>`;
const cmp = (v, title, note) => `<h3>${title}</h3>${note ? `<p class="mut">${note}</p>` : ""}${vid(`local_reference/LREF_${v}.mp4`, "grid local", "REFERENCE | SP2A F100 | SP2A F50 | SP2A F25 | BEST SP2C (F37.5) — local only")}${vid(`video/ROW_${v}.mp4`, "grid", "SP2A F100 | SP2A F50 | SP2A F25 | SP2A F37.5 | SP2C F37.5")}${vid(`local_reference/LREF37_${v}.mp4`, "grid local", "REFERENCE | SP2A F37.5 | SP2C F37.5 — local only")}`;
// ── series for the plots ──
const ser = (r) => ({ c: r.seriesCols, r: r.series.map(x => x.map(v => v == null ? null : +(+v).toFixed(3))) }), SER = JSON.stringify({ A37: ser(A5), C37: ser(C5) });
const vlines = (VD.lines || []).map(l => `<div><b>${l}</b></div>`).join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SP2C tuck and follow-through</title>
<style>:root{--bg:#0f1512;--fg:#e6efe9;--mut:#9fb3a8;--acc:#ffcf4a;--card:#16201b;--line:#2c3d34}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1560px;margin:auto;padding:16px}
h1{font-size:23px;margin:8px 0}h2{font-size:19px;margin:30px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}.card{background:var(--card);border-radius:8px;padding:10px 12px;margin:10px 0}.verdict{border-left:4px solid var(--acc)}
button{background:#24332b;color:var(--fg);border:1px solid var(--line);border-radius:4px;margin:0 4px 4px 0;padding:3px 10px;cursor:pointer;font-size:14px}button.on{background:var(--acc);color:#111}
.players{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.players video{width:100%;background:#000;border-radius:4px}video.grid{width:100%;background:#000;border-radius:4px}figure{margin:6px 0 14px}figcaption{font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}td,th{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}.mut{color:var(--mut)}code{color:#cfe9ff}.miss{color:#ffb0a0;font-size:13px}.sm{font-size:12px}
canvas{width:100%;height:220px;background:#121a16;border-radius:6px}a{color:#8fd3ff}.tw{overflow-x:auto}.big{font-size:16px}.q{font-size:17px;color:var(--acc)}@media (max-width:800px){main{padding:10px 16px}.players{grid-template-columns:1fr}}</style></head><body><main>
<h1>SP2C: 3D folded-leg tuck and active physical follow-through</h1>
<p class="mut">14 Oct 2026 · TEMPORARY development friction <b>F37.5</b> (non-stud body friction ×0.375; studs unchanged; not canonical, not tuned) · SP2A and FSWEEP unchanged · 5.0 m/s run-in unless noted · 6 s per run · report <a href="../SP2C_REPORT.md">SP2C_REPORT.md</a> · log <a href="../SP2C_LOG.md">SP2C_LOG.md</a></p>
<div class="card verdict big">${vlines}${VD.note ? `<p>${VD.note}</p>` : ""}<p><b>READY FOR RUNNING RECIPIENT: NO — WAIT FOR OWNER VISUAL REVIEW.</b> Stopped for your visual review.</p></div>
<h2>1. Is the entire folded leg now genuinely tucked into the body?</h2>
<p class="q">Close-up of pelvis + folded hip + knee + ankle + boot, from the final running stride through ≈ 500 ms of ground contact (0.25×).</p>
${vid("video/PAIR_FOLD_025x.mp4", "grid", "rear 3/4 close-up: SP2A F37.5 (left) | SP2C F37.5 (right)")}${vid("video/PAIR_FOLDS_025x.mp4", "grid", "side close-up: SP2A F37.5 | SP2C F37.5")}
${vid("local_reference/LREF37_FOLD_025x.mp4", "grid local", "REFERENCE | SP2A F37.5 | SP2C F37.5 (rear 3/4 close-up) — local only")}${vid("video/ROW_FOLD_025x.mp4", "grid", "SP2A F100 | F50 | F25 | F37.5 | SP2C F37.5")}
<div class="card"><b>At first fold-side contact (5.0 m/s):</b> folded knee in pelvis-local coordinates (x lateral, − = fold side; the fold hip is at x = −0.095 m): SP2A ${v3(A5.milestones.firstFoldContact.knee_inPelvis, 2)} → SP2C ${v3(C5.milestones.firstFoldContact.knee_inPelvis, 2)} m ·
 fold boot sole-down cos SP2A ${f(A5.milestones.firstFoldContact.foldBoot.soleDownCos)} → SP2C ${f(C5.milestones.firstFoldContact.foldBoot.soleDownCos)} (negative = studs away) · toe height ${f(A5.milestones.firstFoldContact.foldBoot.toeY * 100, 1)} → ${f(C5.milestones.firstFoldContact.foldBoot.toeY * 100, 1)} cm · knee flexion at +500 ms ${f(A5.milestones["+500ms"].knee_L, 0)}° → ${f(C5.milestones["+500ms"].knee_L, 0)}°.</div>
<h2>2. Does he remain an active footballer through the follow-through, or become a ragdoll?</h2>
<p class="q">The final ≈ 1 s of each slide and the second after it, each condition aligned at its own stop.</p>
${vid("video/ROW_END_1x.mp4", "grid", "1× — SP2A F100 | F50 | F25 | F37.5 | SP2C F37.5")}${vid("video/ROW_END_05x.mp4", "grid", "0.5× side")}${vid("video/ROW_END_R34_05x.mp4", "grid", "0.5× rear 3/4")}${vid("video/PAIR_END_05x.mp4", "grid", "0.5× SP2A F37.5 | SP2C F37.5")}
<h2>3. Synchronised comparisons</h2>
${cmp("CLOSE_1x", "1× close side (run-in → 4.5 s)")}${cmp("GAME_1x", "1× fixed gameplay camera ×4.5")}${cmp("SIDE_025x", "0.25× side")}${cmp("R34_025x", "0.25× rear 3/4 (the folded leg toward the camera)")}${cmp("DIAG_025x", "0.25× diagnostic: colliders, skeleton (yellow), intent ghost (magenta), contact forces")}
<h2>4. Switch conditions at the same time position</h2>
<div class="card"><div><span class="mut">View:</span> ${VIEWS.map(([k, l], i) => `<button class="view${i === 0 ? " on" : ""}" data-v="${k}">${l}</button>`).join("")}</div>
<div><span class="mut">Condition (keys 1–5):</span> ${IDS.map((id, i) => `<button class="cond${i === IDS.length - 1 ? " on" : ""}" data-c="${id}">${i + 1} · ${LBL[id]}</button>`).join("")} <button id="pp">play / pause (space)</button> <button id="rs">restart</button></div>
<div class="players"><video id="main" controls muted playsinline></video><div><video id="ref" muted playsinline></video><p id="refmiss" class="miss" hidden>Reference: not present on this machine (kept outside Git), or no reference for this view.</p></div></div></div>
<h2>5. SP2C at the three run-in speeds</h2>${vid("video/SPEEDS_1x.mp4", "grid", "SP2C F37.5 · 4.5 | 5.0 | 5.5 m/s · close side · 1×")}
<h2>6. Summary, both candidates at F37.5, three speeds</h2>${sumTable}
<p class="mut">Closure = |horizontal contact impulse − Δ horizontal momentum| over the slide: contacts are the only horizontal force (no root propulsion, no hidden drive). Determinism: SP2C 5.0 m/s re-run <code>${E.determinism.first}</code> = <code>${E.determinism.rerun}</code> (${E.determinism.identical ? "identical" : "DIFFERENT"}).</p>
<h2>7. Diagnostics at the milestones (5.0 m/s)</h2><h3>SP2A F37.5</h3>${msTable(A5)}<h3>SP2C F37.5</h3>${msTable(C5)}
${["4.5", "5.5"].map(sp => `<h3>SP2C F37.5 · ${sp} m/s</h3>${msTable(E.runs.SP2C[sp])}`).join("")}
<h2>8. Posture over time (5.0 m/s): SP2A F37.5 (red) vs SP2C F37.5 (green)</h2>
<div class="card"><canvas id="pl1" width="1400" height="220"></canvas><p class="mut">pelvis roll ° (positive = onto the fold side) — SP2A rolls past 90° onto its front; SP2C holds ≈ 20–35°</p>
<canvas id="pl2" width="1400" height="220"></canvas><p class="mut">trunk belly-down component (−1 = face-down, +1 = face-up) and head height ×100 cm (dashed)</p>
<canvas id="pl3" width="1400" height="220"></canvas><p class="mut">folded knee lateral position in the pelvis, cm (the fold hip is at −9.5 cm; 0 = midline)</p></div>
<h2>9. Why every SP2A run rolled face-down: single-factor diagnosis</h2>${roTable}
<h2>10. Load and braking by region (5.0 m/s)</h2>${ledTable}
<h2>11. Contacts win (SP2C, obstacles in the tackling leg's path, 5.0 m/s, F37.5)</h2>${obTable}
</main><script>
const SER = ${SER}, IDS = ${JSON.stringify(IDS)}, VIEWS = ${JSON.stringify(VIEWS)};
let cond = "C37", view = VIEWS[0][0]; const main = document.getElementById("main"), ref = document.getElementById("ref"), vinfo = () => VIEWS.find(v => v[0] === view);
// videos are fetched into memory (blob URLs): the review server (python http.server) ignores HTTP Range requests, and without them a browser
// cannot seek a streamed video — keeping the time position across condition switches needs seeking
const BL = new Map(), blob = (u) => BL.get(u) || (BL.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b))), BL.get(u));
let refKey = null; const setSrc = async (keep) => { const t = main.currentTime || 0, play = !main.paused, u = await blob("video/" + view + "_" + cond + ".mp4"); main.src = u; const rk = vinfo()[4];
  if (refKey !== rk) { refKey = rk; document.getElementById("refmiss").hidden = true; ref.removeAttribute("src"); if (rk) blob("local_reference/" + rk + ".mp4").then(x => { ref.src = x; }).catch(() => { document.getElementById("refmiss").hidden = false; }); else document.getElementById("refmiss").hidden = false; }
  main.addEventListener("loadedmetadata", () => { main.currentTime = keep ? Math.min(t, main.duration - 0.01) : 0; if (ref.readyState > 0) ref.currentTime = main.currentTime; if (play) { main.play(); ref.play().catch(() => {}); } }, { once: true }); };
ref.addEventListener("loadedmetadata", () => { ref.currentTime = main.currentTime || 0; });
const io = new IntersectionObserver((es) => es.forEach(async (e) => { if (!e.isIntersecting) return; const v = e.target; io.unobserve(v); try { v.src = await blob(v.dataset.src); } catch (err) { v.closest("figure").insertAdjacentHTML("beforeend", '<p class="miss">' + (v.classList.contains("local") ? "Local reference composite: not present on this machine (kept outside Git)." : "video missing") + "</p>"); v.remove(); } }), { rootMargin: "400px" });
document.querySelectorAll("video.grid").forEach(v => io.observe(v));
document.querySelectorAll("button.cond").forEach(b => b.onclick = () => { document.querySelectorAll("button.cond").forEach(x => x.classList.remove("on")); b.classList.add("on"); cond = b.dataset.c; setSrc(true); });
document.querySelectorAll("button.view").forEach(b => b.onclick = () => { document.querySelectorAll("button.view").forEach(x => x.classList.remove("on")); b.classList.add("on"); view = b.dataset.v; setSrc(false); });
document.addEventListener("keydown", e => { if (e.target.tagName === "INPUT") return; const i = +e.key - 1; if (i >= 0 && i < IDS.length) document.querySelectorAll("button.cond")[i].click(); if (e.key === " ") { e.preventDefault(); document.getElementById("pp").click(); } });
document.getElementById("pp").onclick = () => { if (main.paused) { main.play(); ref.play().catch(() => {}); } else { main.pause(); ref.pause(); } };
document.getElementById("rs").onclick = () => { main.currentTime = 0; ref.currentTime = 0; };
main.addEventListener("seeked", () => { if (ref.src && Math.abs(ref.currentTime - main.currentTime) > 0.05) ref.currentTime = main.currentTime; });
setSrc(false);
// plots
const plot = (id, specs, lo, hi) => { const cv = document.getElementById(id), g = cv.getContext("2d"), W = cv.width, H = cv.height, t0 = 0, t1 = 6, X = (t) => 40 + (t - t0) / (t1 - t0) * (W - 50), Y = (v) => H - 20 - (v - lo) / (hi - lo) * (H - 30);
  g.fillStyle = "#121a16"; g.fillRect(0, 0, W, H); g.strokeStyle = "#2c3d34"; g.fillStyle = "#9fb3a8"; g.font = "12px sans-serif";
  for (let t = 0; t <= 6; t++) { g.beginPath(); g.moveTo(X(t), 10); g.lineTo(X(t), H - 20); g.stroke(); g.fillText(t + " s", X(t) - 8, H - 4); }
  for (const v of [lo, (lo + hi) / 2, hi, 0]) { g.beginPath(); g.moveTo(40, Y(v)); g.lineTo(W - 10, Y(v)); g.stroke(); g.fillText(String(+v.toFixed(1)), 2, Y(v) + 4); }
  for (const s of specs) { const d = SER[s.k], ci = d.c.indexOf(s.col); g.strokeStyle = s.color; g.setLineDash(s.dash || []); g.lineWidth = 2; g.beginPath(); let first = true;
    for (const r of d.r) { const v = r[ci]; if (v == null) { first = true; continue; } const x = X(r[0]), y = Y(Math.max(lo, Math.min(hi, v * (s.mul || 1)))); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); } g.stroke(); g.setLineDash([]); } };
plot("pl1", [{ k: "A37", col: "pelvisRoll", color: "#ff6b6b" }, { k: "C37", col: "pelvisRoll", color: "#7ee081" }], -60, 180);
plot("pl2", [{ k: "A37", col: "bellyDownY", color: "#ff6b6b" }, { k: "C37", col: "bellyDownY", color: "#7ee081" }, { k: "A37", col: "headY", color: "#ff6b6b", dash: [6, 4] }, { k: "C37", col: "headY", color: "#7ee081", dash: [6, 4] }], -1, 1.6);
plot("pl3", [{ k: "A37", col: "kneeLatInPelvis", color: "#ff6b6b", mul: 100 }, { k: "C37", col: "kneeLatInPelvis", color: "#7ee081", mul: 100 }], -40, 20);
</script></body></html>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, html); console.log("wrote", OUT, (html.length / 1024).toFixed(0), "KB");

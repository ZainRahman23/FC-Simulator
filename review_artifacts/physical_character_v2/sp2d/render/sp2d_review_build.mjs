// SP2D review page builder: reads sp2d/evidence (SP2D_eval.json, reference_sp2d_measures.json, SP2D_summary.json) and writes sp2d/review/SP2D_REVIEW.html.
// The critical test A | SP2C | SP2D | REFERENCE: videos (ours in review/video/, in Git; the reference composites in review/local_reference/, gitignored) and
// the requested measures over time from the first fold-side turf contact — trunk angle, posting-shoulder elevation, hand / forearm load, torso load, pelvis
// roll, chest orientation, authority — with the reference's measured points. Videos load as blobs (the :8350 server ignores Range requests).
// usage (worktree root): node .../sp2d/render/sp2d_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), R = path.join(D, ".."), EV = path.join(R, "evidence"), OUT = path.join(R, "review", "SP2D_REVIEW.html");
const rj = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f)); } catch (e) { return d; } };
const E = rj(path.join(EV, "SP2D_eval.json")), REF = rj(path.join(EV, "reference_sp2d_measures.json")), SUM = rj(path.join(EV, "SP2D_summary.json"), { lines: [], note: "" });
const f = (x, d = 2) => x == null || !Number.isFinite(+x) ? "–" : (+x).toFixed(d), pct = (x) => x == null ? "–" : (100 * x).toFixed(1) + "%";
const K = ["A", "SP2C", "SP2D"], LBL = { A: "A = SP2A", SP2C: "SP2C", SP2D: "SP2D" }, COL = { A: "#ff6b6b", SP2C: "#ffcf4a", SP2D: "#7ee081" }, SP = ["4.5", "5.0", "5.5"];
const rel = (r, t) => t == null ? "–" : `+${f(t - r.critical.firstFoldContactT, 2)} s`;
const crit = (k, sp) => { const r = E.runs[k][sp], s = r.critical.summary, fc = s.firstContact; return `<tr><td><b>${LBL[k]}</b></td><td>${sp}</td><td><code>${r.hash.slice(0, 8)}</code></td>
  <td>${f(s.trunkAt["+0.25s"], 0)} / ${f(s.trunkAt["+0.5s"], 0)} / ${f(s.trunkAt["+1s"], 0)} / ${f(s.trunkAt["+1.5s"], 0)} / ${f(s.trunkAtStop, 0)}°</td><td>${rel(r, fc.handL)}</td><td>${pct(s.handL.normalShare)} / ${pct(s.handL.brakeShare)}</td><td>${f(s.peakShoulderL, 0)}°</td>
  <td>${rel(r, fc.torso)}</td><td>${fc.head == null ? "never" : rel(r, fc.head) + ` (${pct(s.head.normalShare)})`}</td><td>${f(s.end.pelvisRoll, 0)}°</td><td>${s.chestDownT == null ? "<b>never</b>" : `<b class="bad">${rel(r, s.chestDownT)}</b>`}</td>
  <td>${f(s.uprightS, 2)} s</td><td>${(s.failures && Object.keys(s.failures).length) || s.wholeBody != null ? `<b class="bad">${JSON.stringify(s.failures)} ${s.wholeBody ?? ""}</b>` : "none"} · min ${f(s.minAuthority)}</td>
  <td>${s.end.class} · trunk ${f(s.end.trunkDeg, 0)}° · belly ${f(s.end.bellyDown)} · fold-side-down ${f(s.end.sideDownL)}</td><td>${f(r.critical.slidePathM)} m</td></tr>`; };
const critTable = `<div class="tw"><table><tr><th></th><th>m/s</th><th>hash</th><th>trunk from vertical at +0.25 / +0.5 / +1.0 / +1.5 s / stop</th><th>posting hand / forearm first on turf</th><th>its share of turf normal / braking (slide)</th><th>peak posting-shoulder elevation</th><th>torso first on turf</th><th>head on turf</th><th>pelvis roll at 6 s</th><th>chest-down</th><th>artificially upright (trunk &lt; 35° after +0.6 s)</th><th>passive: regional failure / whole-body fallback · min authority</th><th>6 s posture</th><th>slide</th></tr>
  ${SP.map(sp => K.map(k => crit(k, sp)).join("")).join("")}
  <tr><td><b>REFERENCE</b></td><td>≈ 7.5</td><td>–</td><td>13–18 (0–0.07 s) / ≈ 30 (0.10–0.23 s) / 37 (+0.27) / 69 (+0.30) / 82–84 (+0.43…+0.57) — lying from +0.30 s</td><td>+0.24…+0.27 s</td><td>(not measurable)</td><td>≈ 130–135° (+0.43…+0.57 s)</td><td>+0.30 s (lying on the folded side)</td><td>no</td><td>onto the folded side</td><td>never</td><td>–</td><td>–</td><td>on the folded side / back, get-up from +1.13 s</td><td>≈ 7.5 m</td></tr></table></div>`;
const lim = (k) => (E.runs[k]["5.0"].climits || []).filter(e => e.beyondDeg >= 0.5).map(e => `${e.id} ${f(e.beyondDeg, 1)}° / ${f(e.durS, 2)} s`).join("<br>") || "none ≥ 0.5°";
const fold = (k) => { const m = E.runs[k]["5.0"].sp2cMilestones.firstFoldContact; return `knee in pelvis ${m.knee_inPelvis.map(x => f(x)).join(", ")} m · knee ${f(m.knee_L, 0)}° · sole-down ${f(m.foldBoot.soleDownCos)} · toe ${f(m.foldBoot.toeY * 100, 1)} cm`; };
const ser = (k) => ({ t0: E.runs[k]["5.0"].critical.firstFoldContactT, c: E.runs[k]["5.0"].critical.seriesCols, r: E.runs[k]["5.0"].critical.series.map(x => x.map(v => v == null ? null : +(+v).toFixed(3))) });
const SER = JSON.stringify(Object.fromEntries(K.map(k => [k, ser(k)]))), REFP = JSON.stringify(REF ? REF.measured.map(r => [r.real_t, r.trunk_from_vertical_deg, r.shoulder_opening_deg]).concat([[0.0, 15, null], [0.17, 30, null], [-0.033, 8, null]]) : []);
const vid = (src, cls = "grid", cap = "") => `<figure><video class="${cls}" data-src="${src}" controls muted loop playsinline preload="none"></video>${cap ? `<figcaption class="mut">${cap}</figcaption>` : ""}</figure>`;
const cmp = (v, t) => `<h3>${t}</h3>${vid(`local_reference/LREF4_${v}.mp4`, "grid local", "A | SP2C | SP2D | REFERENCE — local only")}${vid(`video/ROW3_${v}.mp4`, "grid", "A | SP2C | SP2D")}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SP2D torso descent</title>
<style>:root{--bg:#0f1512;--fg:#e6efe9;--mut:#9fb3a8;--acc:#ffcf4a;--card:#16201b;--line:#2c3d34}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1560px;margin:auto;padding:16px}
h1{font-size:23px;margin:8px 0}h2{font-size:19px;margin:30px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}.card{background:var(--card);border-radius:8px;padding:10px 12px;margin:10px 0}.verdict{border-left:4px solid var(--acc)}
video.grid{width:100%;background:#000;border-radius:4px}figure{margin:6px 0 14px}figcaption{font-size:13px}a{color:#8fd3ff}.bad{color:#ff8f7a}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}td,th{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}.mut{color:var(--mut)}code{color:#cfe9ff}.miss{color:#ffb0a0;font-size:13px}
canvas{width:100%;height:230px;background:#121a16;border-radius:6px;margin-top:6px}.tw{overflow-x:auto}.big{font-size:16px}.key span{display:inline-block;margin-right:14px}@media (max-width:800px){main{padding:10px 16px}}</style></head><body><main>
<h1>SP2D: controlled torso descent onto the folded side / back + physical arm post</h1>
<p class="mut">14 Oct 2026 · TEMPORARY friction <b>F37.5</b> (non-stud body friction ×0.375, studs unchanged; not canonical, not recalibrated) · SP2C's folded leg / boot kept · recipient untouched · 5.0 m/s run-in unless noted · report <a href="../SP2D_REPORT.md">SP2D_REPORT.md</a> · log <a href="../SP2D_LOG.md">SP2D_LOG.md</a></p>
<div class="card verdict big">${(SUM.lines || []).map(l => `<div>${l}</div>`).join("")}${SUM.note ? `<p class="mut">${SUM.note}</p>` : ""}<p><b>Stopped for your visual review.</b></p></div>
<h2>1. Critical test: A | SP2C | SP2D | REFERENCE, first turf contact → end of slide → resting posture</h2>
<p class="mut">Window: 0.11 s before the first fold-side contact to ≈ 1.1 s after the slides stop. The reference slides at ≈ 7.5 m/s and lies down within 0.3 s (its clip ends 2.3 s after contact); our 5.0 m/s slides last ≈ 2.4 s — compare the organisation and order of events, not the clock.</p>
${cmp("SIDE_05x", "0.5× side")}${cmp("R34_05x", "0.5× rear 3/4 (the posting arm and the folded side toward the camera)")}${cmp("F34_05x", "0.5× front 3/4 (chest orientation, the tackling-side arm)")}${cmp("SIDE_1x", "1× side")}${cmp("GAME_1x", "1× fixed gameplay camera ×4.5")}${cmp("DIAG_05x", "0.5× diagnostic: colliders, skeleton (yellow), intent ghost, turf contact forces")}
<h2>2. The measures over time (5.0 m/s), from the first fold-side contact</h2>
<div class="card"><div class="key">${K.map(k => `<span style="color:${COL[k]}">■ ${LBL[k]}</span>`).join("")}<span style="color:#fff">● REFERENCE (measured, ±10–15°)</span></div>
<canvas id="p1" width="1400" height="230"></canvas><p class="mut">trunk angle from vertical (°): 0 upright, 90 lying</p>
<canvas id="p2" width="1400" height="230"></canvas><p class="mut">posting (folded-side, left) arm: shoulder elevation (°): 0 at the side, 180 overhead</p>
<canvas id="p3" width="1400" height="230"></canvas><p class="mut">turf normal force (BW, 25 ms means): posting hand / forearm (solid), torso (dashed)</p>
<canvas id="p4" width="1400" height="230"></canvas><p class="mut">pelvis roll (°, + onto the folded side) (solid) and chest orientation × 100 (dashed: +100 face-up, 0 on the side, −100 chest-down)</p>
<canvas id="p5" width="1400" height="230"></canvas><p class="mut">lowest regional motor authority (the "passive" indicator: a ragdoll collapse would drop it to the 0.12–0.3 floors)</p></div>
<h2>3. The answers, both candidates and A, three speeds</h2>${critTable}
<h2>4. What is kept from SP2C (5.0 m/s)</h2><div class="card">${K.map(k => `<div><b>${LBL[k]}</b> at first fold contact: ${fold(k)}</div>`).join("")}</div>
<div class="tw"><table><tr><th>joint-limit excursions ≥ 0.5° (5.0 m/s)</th>${K.map(k => `<th>${LBL[k]}</th>`).join("")}</tr><tr><td></td>${K.map(k => `<td class="mut">${lim(k)}</td>`).join("")}</tr></table></div>
<p class="mut">Determinism: SP2D 5.0 m/s re-run <code>${E.determinism.first}</code> = <code>${E.determinism.rerun}</code> (${E.determinism.identical ? "identical" : "DIFFERENT"}).</p>
<h2>5. SP2D at the three run-in speeds</h2>${vid("video/SPEEDS_1x.mp4", "grid", "SP2D · 4.5 | 5.0 | 5.5 m/s · close side · 1×")}
</main><script>
const SER = ${SER}, REFP = ${REFP}, COL = ${JSON.stringify(COL)}, K = ${JSON.stringify(K)};
const BL = new Map(), blob = (u) => BL.get(u) || (BL.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b))), BL.get(u));
const io = new IntersectionObserver((es) => es.forEach(async (e) => { if (!e.isIntersecting) return; const v = e.target; io.unobserve(v); try { v.src = await blob(v.dataset.src); } catch (err) { v.closest("figure").insertAdjacentHTML("beforeend", '<p class="miss">' + (v.classList.contains("local") ? "Local reference composite: not present on this machine (kept outside Git)." : "video missing") + "</p>"); v.remove(); } }), { rootMargin: "400px" });
document.querySelectorAll("video.grid").forEach(v => io.observe(v));
const plot = (id, specs, lo, hi, refCol) => { const cv = document.getElementById(id), g = cv.getContext("2d"), W = cv.width, H = cv.height, t0 = -0.1, t1 = 4.0, X = (t) => 44 + (t - t0) / (t1 - t0) * (W - 54), Y = (v) => H - 20 - (v - lo) / (hi - lo) * (H - 30);
  g.fillStyle = "#121a16"; g.fillRect(0, 0, W, H); g.strokeStyle = "#2c3d34"; g.fillStyle = "#9fb3a8"; g.font = "12px sans-serif";
  for (let t = 0; t <= 4; t += 0.5) { g.beginPath(); g.moveTo(X(t), 10); g.lineTo(X(t), H - 20); g.stroke(); g.fillText("+" + t + " s", X(t) - 10, H - 4); }
  for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4; g.beginPath(); g.moveTo(44, Y(v)); g.lineTo(W - 10, Y(v)); g.stroke(); g.fillText(String(+v.toFixed(2)), 2, Y(v) + 4); }
  for (const s of specs) { const d = SER[s.k], ci = d.c.indexOf(s.col); g.strokeStyle = COL[s.k]; g.setLineDash(s.dash || []); g.lineWidth = 2; g.beginPath(); let first = true;
    for (const r of d.r) { const t = r[0] - d.t0, v = r[ci]; if (v == null || t < t0 || t > t1) { first = true; continue; } const y = Y(Math.max(lo, Math.min(hi, v * (s.mul || 1)))); if (first) { g.moveTo(X(t), y); first = false; } else g.lineTo(X(t), y); } g.stroke(); g.setLineDash([]); }
  if (refCol != null) { g.fillStyle = "#ffffff"; for (const p of REFP) { const v = p[refCol]; if (v == null) continue; g.beginPath(); g.arc(X(p[0]), Y(v), 4, 0, 7); g.fill(); } } };
plot("p1", K.map(k => ({ k, col: "trunkDeg" })), 0, 120, 1); plot("p2", K.map(k => ({ k, col: "shoulderL" })), 0, 180, 2);
plot("p3", K.flatMap(k => [{ k, col: "handL_N" }, { k, col: "torso_N", dash: [6, 4] }]), 0, 1.2); plot("p4", K.flatMap(k => [{ k, col: "pelvisRoll" }, { k, col: "bellyDown", mul: 100, dash: [6, 4] }]), -100, 140); plot("p5", K.map(k => ({ k, col: "authMin" })), 0, 1.05);
</script></body></html>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, html); console.log("wrote", OUT, (html.length / 1024).toFixed(0), "KB");

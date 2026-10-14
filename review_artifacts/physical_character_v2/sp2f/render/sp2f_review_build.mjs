// SP2F review page builder: reads sp2f/evidence (SP2F_eval.json, SP2F_answers.json) and writes sp2f/review/SP2F_REVIEW.html: the stop-condition checklist,
// the SP2E fall-over diagnosis, the posting-hand contact record and trajectory-quality tables (SP2D | SP2E | SP2F, three speeds), continuous plots of every
// requested quantity from before first contact through the main slide (5.0 m/s), and the videos (ours in Git; reference composites local, gitignored).
// Videos load as blobs (the :8350 server ignores Range requests). usage (worktree root): node .../sp2f/render/sp2f_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), R = path.join(D, ".."), EV = path.join(R, "evidence"), OUT = path.join(R, "review", "SP2F_REVIEW.html");
const rj = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f)); } catch (e) { return d; } };
const E = rj(path.join(EV, "SP2F_eval.json")), ANS = rj(path.join(EV, "SP2F_answers.json"), { checklist: [], diagnosis: [], notes: [] });
const f = (x, d = 2) => x == null || !Number.isFinite(+x) ? "–" : (+x).toFixed(d), pct = (x) => x == null ? "–" : (100 * x).toFixed(1) + "%";
const K = ["SP2D", "SP2E", "SP2F"], COL = { SP2D: "#5ec8ff", SP2E: "#ffcf4a", SP2F: "#7ee081" }, SP = ["4.5", "5.0", "5.5"];
const handRow = (k, sp) => { const r = E.runs[k][sp], h = r.f.hand || {}; return `<tr><td><b>${k}</b></td><td>${sp}</td><td>${h.firstContact == null ? "never" : "+" + f(h.firstContact) + " s"}</td><td>${h.continuous ? "<b>continuous</b>" : `<span class="bad">${(h.gaps || []).length} gap(s)</span>`}</td>
  <td>${(h.gaps || []).map(([a, b]) => `+${f(a)}…+${f(b)} s`).join("<br>") || "none"}</td><td>${f(h.slideDistM)} m</td><td>${f(h.peakNormalBW)} BW</td><td>${f(h.tangentialBrakingImpulseNs, 1)} N·s (${pct(r.handShares.braking)} of braking)</td><td>${pct(r.handShares.normal)}</td>
  <td class="sm">${(h.shoulderEvolution || []).filter(Boolean).map(([t, s, e]) => `+${f(t)} s: ${f(s, 0)}° / elbow ${f(e, 0)}°`).join("<br>")}</td></tr>`; };
const handTable = `<div class="tw"><table><tr><th></th><th>m/s</th><th>first hand contact</th><th>contact afterwards</th><th>periods off the turf</th><th>hand sliding distance on the turf</th><th>peak normal (8 ms)</th><th>tangential braking impulse</th><th>share of turf normal</th><th>shoulder elevation / elbow while in contact (start → ¼ → ½ → ¾ → end)</th></tr>${SP.map(sp => K.map(k => handRow(k, sp)).join("")).join("")}</table></div>`;
const qRow = (k, sp) => { const r = E.runs[k][sp], q = r.f.postLanding || {}, d = q.descent25to75, land = r.f.rows.filter(x => x[1] >= 0 && x[1] <= 0.15), lr = land.length ? Math.max(...land.map(x => Math.abs(x[3]))) : null;
  return `<tr><td><b>${k}</b></td><td>${sp}</td><td>${f(lr, 0)}°/s</td><td><b>${f(q.peakTrunkRateDegS, 0)}</b>°/s</td><td>${f(q.peakTipDegS, 0)}°/s</td><td>${f(q.peakTrunkAccDegS2, 0)}</td><td>${f(q.rmsTrunkAccDegS2, 0)}</td><td>${f(q.peakRollRateDegS, 0)}°/s</td>
  <td>${d ? `+${f(d.from)} → +${f(d.to)} s · mean ${f(d.meanRateDegS, 0)}°/s · peak/mean ${f(d.evenness)}` : "trunk does not reach 75° before the stop"}</td><td>${r.events.established == null ? "–" : "+" + f(r.events.established) + " s"}</td><td>${r.events.chestDown == null ? "never" : `<b class="bad">+${f(r.events.chestDown)} s</b>`}</td><td>${f(r.slidePathM)} m</td></tr>`; };
const qTable = `<div class="tw"><table><tr><th></th><th>m/s</th><th>landing transient: peak trunk rate 0…+0.15 s</th><th>after landing (+0.15 s → stop): peak trunk rate</th><th>peak tipping rate</th><th>peak trunk acc °/s²</th><th>RMS trunk acc °/s²</th><th>peak pelvis-roll rate</th><th>descent 25° → 75° (evenness = peak / mean rate)</th><th>established on side / back</th><th>chest-down</th><th>slide</th></tr>${SP.map(sp => K.map(k => qRow(k, sp)).join("")).join("")}</table></div>`;
const ser = (k) => { const x = E.runs[k]["5.0"].f; return { c: x.cols, r: x.rows.filter(r => r[1] >= -0.2 && r[1] <= 2.2).map(r => r.map(v => v == null ? null : +(+v).toFixed(3))) }; }, SER = JSON.stringify(Object.fromEntries(K.map(k => [k, ser(k)])));
const PLOTS = [["trunkDeg", "trunk angle from vertical (°)", 0, 120], ["trunkRate", "trunk angular velocity (°/s, d/dt of the angle, 25 ms window)", -200, 350], ["trunkAcc", "trunk angular acceleration (°/s²)", -7000, 7000],
  ["pelvisRoll", "pelvis roll (°, + onto the folded side)", -10, 110], ["pelvisW", "pelvis angular velocity magnitude (°/s)", 0, 700], ["rollRate", "pelvis roll rate about the travel axis (°/s)", -300, 300],
  ["shoulderL", "posting shoulder elevation (°)", 0, 180], ["elbowL", "posting elbow flexion (°)", -10, 60], ["handY", "posting hand / forearm lowest point above the turf (m)", 0, 0.8],
  ["handN", "posting hand / forearm turf normal force (BW)", 0, 2.2], ["handVt", "posting hand / forearm tangential sliding speed (m/s)", 0, 6], ["handOn", "posting hand / forearm turf contact state (1 = on the turf)", 0, 1.1], ["tipW", "thorax tipping rate (°/s)", 0, 450]];
const vid = (src, cls = "grid", cap = "") => `<figure><video class="${cls}" data-src="${src}" controls muted loop playsinline preload="none"></video>${cap ? `<figcaption class="mut">${cap}</figcaption>` : ""}</figure>`;
const cmp = (v, t, ref = true) => `<h3>${t}</h3>${ref ? vid(`local_reference/LREF4_${v}.mp4`, "grid local", "REFERENCE | SP2D | SP2E | SP2F — local only") : ""}${vid(`video/ROW3_${v}.mp4`, "grid", "SP2D | SP2E | SP2F")}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SP2F continuous recline</title>
<style>:root{--bg:#0f1512;--fg:#e6efe9;--mut:#9fb3a8;--acc:#ffcf4a;--card:#16201b;--line:#2c3d34}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1560px;margin:auto;padding:16px}
h1{font-size:23px;margin:8px 0}h2{font-size:19px;margin:30px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}.card{background:var(--card);border-radius:8px;padding:10px 12px;margin:10px 0}.verdict{border-left:4px solid var(--acc)}
video.grid{width:100%;background:#000;border-radius:4px}figure{margin:6px 0 14px}figcaption{font-size:13px}a{color:#8fd3ff}.bad{color:#ff8f7a}.sm{font-size:12px}ul li,ol li{margin:3px 0}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}td,th{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}.mut{color:var(--mut)}code{color:#cfe9ff}.miss{color:#ffb0a0;font-size:13px}
.plots{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,700px),1fr));gap:12px}canvas{width:100%;height:200px;background:#121a16;border-radius:6px}.tw{overflow-x:auto}.key span{display:inline-block;margin-right:14px}@media (max-width:800px){main{padding:10px 16px}}</style></head><body><main>
<h1>SP2F: one continuous controlled recline + a persistent sliding arm post</h1>
<p class="mut">14 Oct 2026 · friction <b>F37.5</b> unchanged (temporary) · tackle entry, folded leg, boot, slide architecture unchanged · 5.0 m/s run-in unless noted · report <a href="../SP2F_REPORT.md">SP2F_REPORT.md</a> · log <a href="../SP2F_LOG.md">SP2F_LOG.md</a></p>
<div class="card verdict"><table>${(ANS.checklist || []).map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join("")}</table><p><b>Stopped for your visual review.</b> ${ANS.reviewNote || ""}</p></div>
<h2>1. Why SP2E fell over (5.0 m/s)</h2><div class="card"><ul>${(ANS.diagnosis || []).map(x => `<li>${x}</li>`).join("")}</ul></div>
<h2>2. Videos</h2><p class="mut">Window: ≈ 0.12 s before first fold-side contact → ≈ +1.8 s. The reference slides at ≈ 7.5 m/s and starts getting up at ≈ +1.13 s.</p>
${cmp("FOCUS_SIDE_1x", "ONLY torso + pelvis + posting arm · side · 1× (legs hidden)")}${cmp("FOCUS_R34_025x", "ONLY torso + pelvis + posting arm · rear 3/4 · 0.25×")}${cmp("FOCUS_R34_1x", "ONLY torso + pelvis + posting arm · rear 3/4 · 1×", false)}${cmp("FOCUS_SIDE_025x", "ONLY torso + pelvis + posting arm · side · 0.25×", false)}
${cmp("CLEAN_1x", "clean · side · 1×")}${cmp("SIDE_025x", "side · 0.25×")}${cmp("R34_025x", "rear 3/4 · 0.25×")}${cmp("F34_025x", "front 3/4 · 0.25×")}${cmp("DIAG_025x", "diagnostic: colliders, skeleton, turf contact forces · rear 3/4 · 0.25×", false)}
${vid("video/SPEEDS_1x.mp4", "grid", "SP2F · 4.5 | 5.0 | 5.5 m/s · side · 1×")}
<h2>3. Continuous trajectories (5.0 m/s), from 0.2 s before first contact</h2><div class="card"><div class="key">${K.map(k => `<span style="color:${COL[k]}">■ ${k}</span>`).join("")}<span class="mut">vertical lines: first fold contact (0) and +0.10 / 0.20 / 0.25 / 0.30 / 0.50 / 1.00 s</span></div>
<div class="plots">${PLOTS.map(([c, l], i) => `<div><div class="sm"><b>${l}</b></div><canvas id="pl${i}" width="900" height="200"></canvas></div>`).join("")}</div></div>
<h2>4. Posting-hand contact record</h2>${handTable}
<h2>5. Trajectory quality</h2>${qTable}
<h2>6. Notes</h2><div class="card"><ul>${(ANS.notes || []).map(x => `<li>${x}</li>`).join("")}</ul></div>
<p class="mut">Determinism: SP2F 5.0 m/s re-run <code>${E.determinism.first}</code> = <code>${E.determinism.rerun}</code> (${E.determinism.identical ? "identical" : "DIFFERENT"}).</p>
</main><script>
const SER = ${SER}, COL = ${JSON.stringify(COL)}, K = ${JSON.stringify(K)}, PLOTS = ${JSON.stringify(PLOTS)};
const BL = new Map(), blob = (u) => BL.get(u) || (BL.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b))), BL.get(u));
const io = new IntersectionObserver((es) => es.forEach(async (e) => { if (!e.isIntersecting) return; const v = e.target; io.unobserve(v); try { v.src = await blob(v.dataset.src); } catch (err) { v.closest("figure").insertAdjacentHTML("beforeend", '<p class="miss">' + (v.classList.contains("local") ? "Local reference composite: not present on this machine (kept outside Git)." : "video missing") + "</p>"); v.remove(); } }), { rootMargin: "400px" });
document.querySelectorAll("video.grid").forEach(v => io.observe(v));
PLOTS.forEach(([col, lab, lo, hi], i) => { const cv = document.getElementById("pl" + i), g = cv.getContext("2d"), W = cv.width, H = cv.height, t0 = -0.2, t1 = 2.2, X = (t) => 46 + (t - t0) / (t1 - t0) * (W - 56), Y = (v) => H - 18 - (v - lo) / (hi - lo) * (H - 26);
  g.fillStyle = "#121a16"; g.fillRect(0, 0, W, H); g.font = "11px sans-serif"; g.strokeStyle = "#2c3d34"; g.fillStyle = "#9fb3a8";
  for (let t = 0; t <= 2; t += 0.5) { g.beginPath(); g.moveTo(X(t), 6); g.lineTo(X(t), H - 18); g.stroke(); g.fillText("+" + t + " s", X(t) - 9, H - 4); }
  for (let j = 0; j <= 4; j++) { const v = lo + (hi - lo) * j / 4; g.beginPath(); g.moveTo(46, Y(v)); g.lineTo(W - 8, Y(v)); g.stroke(); g.fillText(String(+v.toFixed(2)), 2, Y(v) + 4); }
  g.setLineDash([3, 4]); g.strokeStyle = "#556b5f"; for (const m of [0, 0.1, 0.2, 0.25, 0.3, 0.5, 1.0]) { g.beginPath(); g.moveTo(X(m), 6); g.lineTo(X(m), H - 18); g.stroke(); } g.setLineDash([]);
  for (const k of K) { const d = SER[k], ci = d.c.indexOf(col); g.strokeStyle = COL[k]; g.lineWidth = k === "SP2F" ? 2.4 : 1.4; g.beginPath(); let first = true;
    for (const r of d.r) { const v = r[ci]; if (v == null) { first = true; continue; } const y = Y(Math.max(lo, Math.min(hi, v))); if (first) { g.moveTo(X(r[1]), y); first = false; } else g.lineTo(X(r[1]), y); } g.stroke(); } });
</script></body></html>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, html); console.log("wrote", OUT, (html.length / 1024).toFixed(0), "KB");

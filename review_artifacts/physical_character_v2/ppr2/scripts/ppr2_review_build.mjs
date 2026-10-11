// PPR-2 review page builder (presentation only): reads ppr2/evidence/*.json, writes ppr2/review/PPR2_REVIEW.html with the data embedded and
// inline-SVG charts (no external libraries). Nothing is re-simulated.
// usage: node ppr2_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const D = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), EV = path.join(D, "evidence"), J = (f) => JSON.parse(fs.readFileSync(path.join(EV, f)));
const laws = [["SSTAR", "S* (candidate)"], ["SA", "S_A (reference)"], ["A", "CURRENT V2 (reference)"]];
const data = { laws: laws.map(([k, l]) => { const Q = J(`PPR2_Q_${k}.json`), V = J(`PPR2_VERDICT_${k}.json`);
    return { key: k, label: l, verdict: { pass: V.pass, nPass: V.nPass, n: V.n, failed: V.failed, results: V.results }, T1: { exit: Q.T1.exit, efold: Q.T1.efoldS, series: Q.T1.series, startup: Q.T1.startup },
      ankle: Q.T3.ankle.rows.map(r => ({ end: [r.endRamp.ankleDeg, r.endRamp.Kmgh], a71: [r.at71.ankleDeg, r.at71.Kmgh] })), joints: Q.T3.joints,
      T2: Object.fromEntries(Object.entries(Q.T2.runs).map(([k2, v]) => [k2, { J: v.J, dev: v.maxDev.deg, axis: v.maxDev.axis, drop: v.pelvisDropMm, comEnd: v.comRelEndMm, vPk: v.comRelVelPeak, vEnd: v.comRelVelEnd, margin: v.xcomMinMarginM, loss: v.loss, settle: v.settle.ratio }])),
      T4: Q.T4 }; }),
  reserve: J("PPR2_DIAG_RESERVE_SSTAR.json").rows, timeline: J("PPR2_DIAG_TIMELINE_SSTAR.json").runs };
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PPR-2 standing body</title>
<style>
:root { --bg: #0f1412; --panel: #18201c; --ink: #e6efe9; --dim: #9fb3a9; --acc: #ffd45e; --line: #2a3530; --bad: #ff6b5b; --ok: #3fd17a; --c0: #ffd45e; --c1: #6cc3ff; --c2: #ff8f6b; --hum: #b7f5c8; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 1320px; margin: 0 auto; padding: 16px; } h1 { font-size: 22px; margin: 6px 0 10px; } h2 { font-size: 18px; margin: 0 0 6px; } h3 { font-size: 15px; margin: 14px 0 4px; color: var(--acc); }
p, li { color: var(--dim); } b { color: var(--ink); } code { color: #cfe3d8; } a { color: var(--acc); }
.warn { background: #3a1512; border: 1px solid var(--bad); border-radius: 8px; padding: 10px 14px; margin: 10px 0; } .banner { background: #13261b; border: 1px solid #2f7a4c; border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin: 18px 0; } .tw { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 13px; } td, th { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: left; vertical-align: top; white-space: nowrap; } th { color: var(--dim); font-weight: 600; }
td.ok { color: var(--ok); font-weight: 600; } td.bad { color: var(--bad); font-weight: 600; } td.wrap { white-space: normal; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; } svg { width: 100%; height: auto; background: #111815; border-radius: 4px; }
video { width: 100%; height: auto; background: #000; border-radius: 4px; display: block; } .ctl { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 6px 0; }
button { background: #222c27; color: var(--ink); border: 1px solid #34413a; border-radius: 5px; padding: 4px 9px; font: inherit; font-size: 13px; cursor: pointer; } button.on { background: var(--acc); color: #1a1a10; border-color: var(--acc); font-weight: 600; }
.lg { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--dim); } .lg i { display: inline-block; width: 14px; height: 3px; margin-right: 5px; vertical-align: middle; }
@media (max-width: 600px) { main { padding: 12px 16px; } }
</style></head><body><main>
<h1>PPR-2 · the physiological standing body</h1>
<div class="warn"><b>The candidate substrate S* failed its frozen qualification (36 / 45). There was no PVP replay; PVP-1A-DX stays sealed.</b> <b>Decision C:</b> quiet standing needs a continuous, delayed, low-bandwidth controller on top of the substrate. The B (passive elasticity) and C (strain-based reserve) extensions are needed. The remaining substrate defect is the pre-disturbance <b>co-activation</b> at the hip and trunk. It is not architectural.</div>
<p>Frozen design, criteria and battery: commit <code>e454b068</code>, before any candidate run. Report: <code>ppr2/PPR2_REPORT.md</code>. PPR-1 is preserved unchanged. All tests use the runner alone (SOLO) in the PVP-1A-DX entry pose, with magnitudes independent of PVP.</p>
<div class="card"><h2>Clips: CURRENT V2 | S*, same recorded step, TRC-1 rendering, runner alone</h2>
<p><b>STAND:</b> undisturbed standing, 0–1.2 s from the entry, at half speed. S*'s envelope exit at 0.26 s is hip extension: the trunk tips back over the hips while the knees buckle, a sit-back squat in which the pelvis drops and the COM stays over the feet. <b>PUSHF:</b> the moderate forward push (11.6 N·s, 50 ms, at the pelvis) from t0, at quarter speed. The timeline is green inside τ ≈ 175 ms and red after it, where a human's delayed responses would act. The lateral pushes are not rendered, because CAMERA_V1 looks along the lateral axis.</p>
<div class="ctl" id="vctl"></div><video id="vid" controls loop muted playsinline></video><p id="vcap" style="font-size:12px"></p></div>
<div class="card"><h2>Qualification, criterion by criterion</h2><div class="tw" id="crit"></div></div>
<div class="grid">
<div class="card"><h2>Undisturbed standing</h2><p>The departure D is the larger of the pelvis drop and the COM horizontal displacement, measured from the post-settle state at t0 = 0.1 s. Dashed line: the 10 mm envelope.</p><div id="st"></div><div class="lg" id="lgst"></div></div>
<div class="card"><h2>Ankle stiffness against human data (I1)</h2><p>Both legs, K/mgh, plotted against the measured ankle angle. Lines: Vlutters 2015 (end of ramp) and Sakanaka 2021 (71 ms), with the ±50 % band. Points: end of ramp (●) and 71 ms (○). CURRENT V2 is off-scale (≈ 11 mgh).</p><div id="ank"></div><div class="lg" id="lgank"></div></div>
</div>
<div class="card"><h2>Why S* fails: the elastic reserve of each axis at entry</h2><p>The fixed excitation is the rest statics divided by capacity, plus 0.02 co-contraction. A side that carries only the co-contraction has a strain reserve (e − 1)·0.02·capIso of 0.15–1 N·m. The hip, lumbar lateral and knee therefore have sub-degree elastic ranges. The hip's 17 N·m/rad compares with a human 48–74 per side (Kiemel 2008), and the body sits back into a squat open-loop with e-folding 0.125 s (λτ = 1.4).</p><div class="tw" id="res"></div></div>
<div class="card"><h2>Pushes (T2): relative to each law's own unperturbed run, 300 ms window</h2><div class="tw" id="push"></div></div>
<div class="card"><h2>Inside the loop delay: S* push responses at 50 / 100 / 175 / 300 ms (post-hoc diagnostic; the verdict is unchanged)</h2><p>The frozen 300 ms window runs past the postural loop delay (τ ≈ 175 ms), after which a human's own delayed responses act. The forward and backward failures (S3, M2) fall after τ. The lateral trunk bend (10° by 175 ms) does not.</p><div class="tw" id="tl"></div></div>
<div class="card"><h2>Knee and hip, semi-isolated (T3), and release tests (T4)</h2><div class="tw" id="iso"></div></div>
<div class="card"><h2>Next steps (owner decision; nothing started)</h2><ol>
<li><b>A pre-disturbance co-activation spec for the hip, trunk (including lateral) and knee in the athletic stance</b>, from EMG literature (%MVC), then re-qualification. Settling and moderate-push loss should be judged inside τ, under a new preregistration.</li>
<li>Only then, the <b>continuous delayed controller</b>. It must pass the struck-vs-unstruck activation identity for t &lt; t_contact + τ.</li>
<li><b>B as a V2 body-spec parameter</b>, using V2's existing neutral-zone term.</li>
<li>The <b>PVP entry fixture</b> (0.5 mm hover, feet rolled 4.43° onto their edges, leg-line statics) needs a decision before any replay.</li></ol></div>
<script>
const DATA = ${JSON.stringify(data)};
(() => { const views = ["STAND", "PUSHF"], vars = ["mesh", "colliders", "overlay"]; let cv = "STAND", cvar = "mesh"; const el = document.getElementById("vctl"), v = document.getElementById("vid");
  const draw = () => { el.innerHTML = views.map(x => "<button class='" + (x === cv ? "on" : "") + "' data-v='" + x + "'>" + x + "</button>").join("") + "<span style='width:14px'></span>" + vars.map(x => "<button class='" + (x === cvar ? "on" : "") + "' data-r='" + x + "'>" + x + "</button>").join("") + "<span style='width:14px'></span>" + [0.25, 0.5, 1].map(r => "<button data-s='" + r + "'>" + r + "×</button>").join("");
    el.querySelectorAll("button").forEach(b => b.onclick = () => { if (b.dataset.v) cv = b.dataset.v; if (b.dataset.r) cvar = b.dataset.r; if (b.dataset.s) { v.playbackRate = +b.dataset.s; return; } draw(); load(); }); };
  const load = () => { v.src = "video/" + cv + "_" + cvar + ".mp4"; document.getElementById("vcap").textContent = "video/" + cv + "_" + cvar + ".mp4"; v.play().catch(() => {}); }; draw(); load(); })();
const C = ["var(--c0)", "var(--c1)", "var(--c2)"], f = (x, d = 2) => (x == null ? "–" : (+x).toFixed(d));
// criteria matrix
(() => { const ids = Object.keys(DATA.laws[0].verdict.results); let h = "<table><tr><th>criterion</th>" + DATA.laws.map(L => "<th>" + L.label + " · " + L.verdict.nPass + "/" + L.verdict.n + "</th>").join("") + "</tr>";
  for (const id of ids) { h += "<tr><td>" + id + "</td>" + DATA.laws.map(L => { const r = L.verdict.results[id]; const v = JSON.stringify(r.value); return "<td class='" + (r.pass ? "ok" : "bad") + " wrap'>" + (r.pass ? "✓ " : "✗ ") + "<span style='font-weight:400;color:var(--dim)'>" + (v || "").slice(0, 90).replace(/</g, "&lt;") + "</span></td>"; }).join("") + "</tr>"; }
  document.getElementById("crit").innerHTML = h + "</table>"; })();
// SVG helper
function chart(el, W, H, xr, yr, opts) { const p = { l: 46, r: 10, t: 10, b: 32 }, X = (x) => p.l + (opts.logx ? (Math.log(x) - Math.log(xr[0])) / (Math.log(xr[1]) - Math.log(xr[0])) : (x - xr[0]) / (xr[1] - xr[0])) * (W - p.l - p.r), Y = (y) => H - p.b - (y - yr[0]) / (yr[1] - yr[0]) * (H - p.t - p.b);
  let s = "<svg viewBox='0 0 " + W + " " + H + "'>"; for (const t of opts.xt) s += "<line x1='" + X(t) + "' x2='" + X(t) + "' y1='" + p.t + "' y2='" + (H - p.b) + "' stroke='#26302b'/><text x='" + X(t) + "' y='" + (H - p.b + 14) + "' fill='#9fb3a9' font-size='10' text-anchor='middle'>" + t + "</text>";
  for (const t of opts.yt) s += "<line x1='" + p.l + "' x2='" + (W - p.r) + "' y1='" + Y(t) + "' y2='" + Y(t) + "' stroke='#26302b'/><text x='" + (p.l - 4) + "' y='" + (Y(t) + 3) + "' fill='#9fb3a9' font-size='10' text-anchor='end'>" + t + "</text>";
  s += "<text x='" + (W / 2) + "' y='" + (H - 4) + "' fill='#9fb3a9' font-size='11' text-anchor='middle'>" + opts.xl + "</text><text x='12' y='" + (H / 2) + "' fill='#9fb3a9' font-size='11' transform='rotate(-90 12 " + (H / 2) + ")' text-anchor='middle'>" + opts.yl + "</text>";
  s += opts.body(X, Y) + "</svg>"; document.getElementById(el).innerHTML = s; }
const poly = (pts, X, Y, col, dash) => "<polyline fill='none' stroke='" + col + "' stroke-width='2' " + (dash ? "stroke-dasharray='5 4'" : "") + " points='" + pts.map(p => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ") + "'/>";
chart("st", 560, 300, [0, 1.2], [0, 60], { xt: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2], yt: [0, 10, 20, 30, 40, 50, 60], xl: "time from entry (s)", yl: "departure D (mm)",
  body: (X, Y) => poly([[0, 10], [1.2, 10]], X, Y, "#9fb3a9", true) + DATA.laws.map((L, i) => poly(L.T1.series.filter(s => s.t <= 1.2).map(s => [s.t, Math.min(60, s.Dmm)]), X, Y, C[i]) + (L.T1.exit ? "<circle cx='" + X(L.T1.exit.t) + "' cy='" + Y(Math.min(60, L.T1.exit.Dmm)) + "' r='4' fill='" + C[i] + "'/>" : "")).join("") });
document.getElementById("lgst").innerHTML = DATA.laws.map((L, i) => "<span><i style='background:" + C[i] + "'></i>" + L.label + ": exits " + f(L.T1.exit && L.T1.exit.t) + " s (" + (L.T1.exit ? L.T1.exit.cause : "") + "), e-fold " + f(L.T1.efold, 3) + " s</span>").join("");
const vl = (d) => 0.93 * Math.pow(d / 0.29, -0.271), sk = (d) => 0.94 * Math.pow(d / 0.2, -0.321), xs = []; for (let d = 0.08; d <= 5; d *= 1.08) xs.push(d);
chart("ank", 560, 300, [0.08, 5], [0, 2], { logx: true, xt: [0.1, 0.2, 0.5, 1, 2, 5], yt: [0, 0.5, 1, 1.5, 2], xl: "ankle rotation (°, log)", yl: "K / mgh",
  body: (X, Y) => "<polygon fill='rgba(183,245,200,0.08)' points='" + xs.map(d => X(d) + "," + Y(Math.min(2, 1.5 * vl(d)))).join(" ") + " " + xs.slice().reverse().map(d => X(d) + "," + Y(0.5 * vl(d))).join(" ") + "'/>" + poly(xs.map(d => [d, Math.min(2, vl(d))]), X, Y, "var(--hum)") + poly(xs.map(d => [d, Math.min(2, sk(d))]), X, Y, "var(--hum)", true) +
    DATA.laws.slice(0, 2).map((L, i) => L.ankle.map(r => "<circle cx='" + X(Math.max(0.08, r.end[0])) + "' cy='" + Y(Math.min(2, r.end[1])) + "' r='4' fill='" + C[i] + "'/><circle cx='" + X(Math.max(0.08, r.a71[0])) + "' cy='" + Y(Math.min(2, r.a71[1])) + "' r='4' fill='none' stroke='" + C[i] + "' stroke-width='1.5'/>").join("")).join("") });
document.getElementById("lgank").innerHTML = "<span><i style='background:var(--hum)'></i>human: Vlutters (solid), Sakanaka (dashed), band ±50 %</span>" + DATA.laws.slice(0, 2).map((L, i) => "<span><i style='background:" + C[i] + "'></i>" + L.label + "</span>").join("");
// reserve table (key axes)
(() => { const keep = /^(ankle_R\\.(df|inv)|knee_R\\.flex|hip_R\\.(flex|abd)|lumbar\\.(flex|lat)|thoracic\\.lat|neck\\.flex)$/; let h = "<table><tr><th>axis</th><th>fixed drive N·m</th><th>u+ / u−</th><th>K muscle N·m/rad</th><th>K passive (B)</th><th>reserve + / − N·m</th><th>elastic range + / −</th></tr>";
  for (const r of DATA.reserve.filter(r => keep.test(r.axis))) h += "<tr><td>" + r.axis + "</td><td>" + r.drive + "</td><td>" + r.uP + " / " + r.uM + "</td><td>" + r.Kmus + "</td><td>" + r.Kpassive + "</td><td>" + r.reserveP + " / " + r.reserveM + "</td><td class='" + (Math.min(r.elasticRangePdeg, r.elasticRangeMdeg) < 0.3 ? "bad" : "") + "'>" + r.elasticRangePdeg + "° / " + r.elasticRangeMdeg + "°</td></tr>";
  document.getElementById("res").innerHTML = h + "</table>"; })();
(() => { let h = "<table><tr><th>push</th><th>J N·s</th>" + DATA.laws.map(L => "<th>" + L.label + ": max deflection · pelvis drop · COM@300 ms · XcoM margin · loss</th>").join("") + "</tr>";
  for (const k of Object.keys(DATA.laws[0].T2)) h += "<tr><td>" + k + "</td><td>" + DATA.laws[0].T2[k].J + "</td>" + DATA.laws.map(L => { const v = L.T2[k]; return "<td>" + f(v.dev, 1) + "° " + (v.axis || "") + " · " + f(v.drop, 1) + " mm · " + f(v.comEnd, 0) + " mm · " + f(v.margin * 1000, 0) + " mm · " + (v.loss ? "<b style='color:var(--bad)'>loss " + f(v.loss.t * 1000, 0) + " ms</b>" : "–") + "</td>"; }).join("") + "</tr>";
  document.getElementById("push").innerHTML = h + "</table>"; })();
(() => { let h = "<table><tr><th>S* push</th><th>50 ms</th><th>100 ms</th><th>175 ms (≈ τ)</th><th>300 ms</th><th>settling inside τ</th></tr>";
  for (const [k, v] of Object.entries(DATA.timeline)) h += "<tr><td>" + k + "</td>" + v.t.map(x => "<td>" + x.maxDevDeg + "° " + x.axis + "<br>drop " + x.pelvisDropMm + " mm · COM " + x.comRelMm + " mm · XcoM " + x.xcomMarginMm + " mm</td>").join("") + "<td>" + v.settleInsideTau + "</td></tr>";
  document.getElementById("tl").innerHTML = h + "</table>"; })();
(() => { let h = "<table><tr><th>law</th><th>knee elastic K at 100 ms (±0.57°, ±2.29°)</th><th>hip elastic K at 100 ms</th><th>release: hold → final (°)</th></tr>";
  for (const L of DATA.laws) { const jj = (n) => L.joints[n].rows.map(r => (r.sign > 0 ? "+" : "−") + (r.ampRad * 57.3).toFixed(2) + "°: " + r.at100.Kel.toFixed(0)).join(" · ");
    h += "<tr><td>" + L.label + "</td><td class='wrap'>" + jj("knee") + "</td><td class='wrap'>" + jj("hip") + "</td><td class='wrap'>" + L.T4.map(p => p.probe + " " + p.holdDeg.toFixed(2) + "→" + p.finalDeg.toFixed(2)).join(" · ") + "</td></tr>"; }
  document.getElementById("iso").innerHTML = h + "</table>"; })();
</script></main></body></html>`;
fs.mkdirSync(path.join(D, "review"), { recursive: true }); fs.writeFileSync(path.join(D, "review", "PPR2_REVIEW.html"), html); console.log("wrote review/PPR2_REVIEW.html", html.length, "bytes");

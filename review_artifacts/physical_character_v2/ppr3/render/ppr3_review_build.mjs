// PPR-3 review page builder (presentation only): reads the committed evidence (S2 / S2+P2 verdicts and qualification files, P2b exploration)
// and writes review/PPR3_REVIEW.html with the data embedded. usage: node ppr3_review_build.mjs
import fs from "fs";
const R = new URL("../", import.meta.url), J = (p) => JSON.parse(fs.readFileSync(new URL(p, R)));
const S2V = J("evidence/PPR3_S2V_CANDIDATE.json"), S2Q = J("evidence/PPR3_S2Q_CANDIDATE.json"), P2V = J("evidence/PPR3_P2V_CANDIDATE.json"), P2Q = J("evidence/PPR3_P2Q_CANDIDATE.json"), P2B = J("explore/P2B_IMPULSE_RESULTS.json");
const ABL = ["CANDIDATE", "ABL_noT", "TONE_LOW", "TONE_HIGH", "ABL_noC_hill", "ABL_C_ppr2hold", "ABL_noB", "CURRENTV2"].map(k => { const v = J(`evidence/PPR3_S2V_${k}.json`), q = J(`evidence/PPR3_S2Q_${k}.json`), r = v.results, g = (id) => r[id] ? r[id].value : null;
  return { k, n: `${v.nPass} / ${v.n}`, pass: v.pass, failed: v.failed, exit: q.openLoop && q.openLoop.exit ? q.openLoop.exit.t : null, I1a: g("I1a") ? g("I1a").map(x => x.ratio) : null, I2: g("I2"), I3: g("I3"), I4: g("I4"), I5: g("I5"), I6: g("I6"), C1: g("C1") ? (g("C1").ankle || null) : null }; });
const runs = Object.fromEntries(Object.entries(P2Q.P.runs).map(([k, r]) => [k, { J: r.J, rec: { fall: r.recovery.fall, recovered: r.recovery.recovered, peak: +r.recovery.comPeakMm.toFixed(1), tPeak: +r.recovery.tPeakS.toFixed(3), settle: r.recovery.settleS == null ? null : +r.recovery.settleS.toFixed(3), tail: r.recovery.tailComMm == null ? null : +r.recovery.tailComMm.toFixed(1) },
  ch: r.chronology.ms, sensed: r.chronology.firstCommandSensed, nt: r.neuralTorqueOnsetMsByFamily, live: { peak: +r.window1s.comRelPeakMm.toFixed(1), loss: r.window1s.loss, feetMin: +r.window1s.feetMinN.toFixed(0) }, rep: { peak: +r.replayWindow1s.comRelPeakMm.toFixed(1), loss: r.replayWindow1s.loss, feetMin: +r.replayWindow1s.feetMinN.toFixed(0) }, trace: r.comTrace }]));
const D = { s2: { criteria: S2V.criteria, results: S2V.results, n: `${S2V.nPass} / ${S2V.n}` }, p2: { criteria: P2V.criteria, results: P2V.results, n: `${P2V.nPass} / ${P2V.n}` }, abl: ABL, runs, M: P2Q.M, T: P2Q.T, sway: P2Q.U.sway, drift: P2Q.U.postureDrift, p2b: P2B,
  torque: { src: "render/ppr3_torque_rate.mjs on the review-clip records (moderate / large forward push at t = 0.5 s; both ankles summed)", fwdModerate: { peak: 51.0, rate: 908, tMs: 146 }, fwdLarge: { peak: 188.3, rate: 3404, tMs: 146 }, human: "372 ± 267 N·m/s, peak 116 ± 32 N·m (Robinovitch 2002, lean-release)" },
  video: J("review/video/VIEWS.json").map(v => ({ id: v.id, note: v.note, panels: v.panels.map(p => p.l), camera: v.camera, every: v.every, from: v.from, to: v.to })) };
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PPR-3 standing foundation</title>
<style>
:root { --bg: #0f1412; --panel: #18201c; --ink: #e6efe9; --dim: #9fb3a9; --acc: #ffd45e; --line: #2a3530; --bad: #ff6b5b; --ok: #3fd17a; --c0: #ffd45e; --c1: #6cc3ff; --c2: #ff8f6b; --hum: #b7f5c8; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 1320px; margin: 0 auto; padding: 16px; } h1 { font-size: 22px; margin: 6px 0 10px; } h2 { font-size: 18px; margin: 0 0 6px; } h3 { font-size: 15px; margin: 14px 0 4px; color: var(--acc); }
p, li { color: var(--dim); } b { color: var(--ink); } code { color: #cfe3d8; } a { color: var(--acc); }
.warn { background: #3a1512; border: 1px solid var(--bad); border-radius: 8px; padding: 10px 14px; margin: 10px 0; } .banner { background: #13261b; border: 1px solid #2f7a4c; border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin: 18px 0; } .tw { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 13px; } td, th { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: left; vertical-align: top; } th { color: var(--dim); font-weight: 600; white-space: nowrap; }
td.ok { color: var(--ok); font-weight: 600; } td.bad { color: var(--bad); font-weight: 600; } td.nw { white-space: nowrap; } td.small { font-size: 12px; color: var(--dim); } td.crit { min-width: 300px; max-width: 460px; } td.code { min-width: 280px; } td.code code { white-space: pre-wrap; word-break: break-all; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr)); gap: 14px; } svg { width: 100%; height: auto; background: #111815; border-radius: 4px; display: block; }
video { width: 100%; height: auto; background: #000; border-radius: 4px; display: block; } .ctl { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 6px 0; } .ctl span { color: var(--dim); font-size: 12px; margin: 0 4px 0 10px; }
button { background: #222c27; color: var(--ink); border: 1px solid #34413a; border-radius: 5px; padding: 4px 9px; font: inherit; font-size: 13px; cursor: pointer; } button.on { background: var(--acc); color: #1a1a10; border-color: var(--acc); font-weight: 600; }
.lg { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--dim); } .lg i { display: inline-block; width: 14px; height: 3px; margin-right: 5px; vertical-align: middle; }
ol.tl { margin: 0; padding-left: 0; list-style: none; } ol.tl li { display: grid; grid-template-columns: 92px 1fr; gap: 10px; padding: 4px 0; border-bottom: 1px solid var(--line); } ol.tl li b.t { color: var(--acc); font-variant-numeric: tabular-nums; }
@media (max-width: 600px) { main { padding: 12px 16px; } ol.tl li { grid-template-columns: 72px 1fr; } }
</style></head><body><main>
<h1>PPR-3 · the physiological standing foundation</h1>
<div class="warn"><b>Stop condition B: an architectural decision is needed.</b> <b>S2</b>, the physiological substrate, <b>qualified 18 / 18</b>. <b>S2 + P2</b>, S2 plus continuous delayed postural control, <b>failed 10 / 14</b>. It stands for 60 s, starts cleanly, is provably causal, recovers forward and backward pushes and loses balance to large pushes. It fails lateral recovery, human-matched recovery and the human no-step thresholds. The labelled successor <b>P2b</b> restored physiological torque dynamics and became <b>unstable before any push</b>. The decision is set out below and in <code>ppr3/PPR3_REPORT.md</code> §5.</div>
<p>PPR-1 and PPR-2 are preserved unchanged. <b>PVP stayed sealed:</b> no PVP-1A-DX, ABI or tackle was run or viewed. The canonical V2 spec is unchanged. Runner alone, from the flat-footed PPR-3 standing entry. Commits: instruction <code>f7cef6b3</code> · S2 frozen <code>594a6d37</code>, results <code>ca7674b5</code> · P2 frozen <code>932cd113</code>, results <code>f53b7917</code>.</p>

<div class="card"><h2>Clips: CURRENT V2 | S2 | S2 + P2, same recorded step, TRC-1 rendering</h2>
<p>The visual question: <b>does it look like a living athlete keeping balance, rather than a statue or a ragdoll?</b> Pushes are a 50 ms pelvis pulse at <b>t = 0.5 s</b>, chosen because CURRENT V2 and S2 alone fall by themselves at about 2–3.5 s. In the push scenarios the middle panel is <b>S2 with P2's own undisturbed commands replayed</b>: identical body and tone, but no feedback. In STAND it is S2 alone, with constant tone. "Slow" is 4× slow motion. The clips are presentation only; the battery's pushes are at t = 2 s.</p>
<div class="ctl" id="vctl"></div><video id="vid" controls loop muted playsinline></video><p id="vcap" style="font-size:12px"></p></div>

<div class="card"><h2>Causal chronology: moderate forward push (9.7 N·s at t = 2 s, battery run)</h2>
<p>Two identical worlds; one is pushed. P2's control function only ever receives a frozen view of delayed samples, and each command is logged with the sample index each channel used. <b>On all 12 pushes</b>, P2's commands are bit-identical to the twin's until 29.17 ms, the neck's 25 ms delay applied to the first post-push state (criterion P5).</p>
<ol class="tl" id="chron"></ol></div>

<div class="grid">
<div class="card"><h2>What P2 adds: live vs no-feedback twin</h2><p>COM displacement in the push direction relative to the undisturbed twin, over the first second. <b>Solid:</b> S2 + P2. <b>Dashed:</b> the S2-replay twin (P2's undisturbed commands, no feedback).</p><div class="ctl" id="pctl"></div><div id="ptr"></div><div class="lg"><span><i style="background:var(--c1)"></i>S2 + P2</span><span><i style="background:var(--c2)"></i>S2 replay (no feedback)</span><span><i style="background:#56645d"></i>human pelvis-push peak 56–70 mm (Rietdyk 1999, 20–23 N·s)</span></div></div>
<div class="card"><h2>Human capability</h2><div class="tw" id="hum"></div></div>
</div>

<div class="card"><h2>S2 + P2 qualification, criterion by criterion (${D.p2.n})</h2><div class="tw" id="p2crit"></div></div>
<div class="card"><h2>Pushes: recovery, latency and the no-feedback twin (S2 + P2 battery, onset t = 2 s, 4 s window)</h2><div class="tw" id="push"></div></div>
<div class="card"><h2>S2 qualification, criterion by criterion (${D.s2.n}); judged inside the literature intrinsic windows</h2><div class="tw" id="s2crit"></div></div>
<div class="card"><h2>B, C, T: ablations and tone sensitivity on the S2 battery</h2><p><b>T</b> is bounded on both sides: no-T, low-tone and high-tone variants all fail. <b>C</b> is supported in its relaxing form: neither no persistence nor PPR-2's indefinite hold passes. <b>B</b> is literature-supported but <b>not shown necessary</b>: no-B passes 18 / 18. The "exit" column is S2 alone leaving a 10 mm envelope with no feedback.</p><div class="tw" id="abl"></div></div>

<div class="card"><h2>Why PPR-3 stops: the P2b exploration</h2>
<p>Diagnosis of P2's failures: <b>(1)</b> its torque develops faster than human torque, because the explicit EMG → torque filter had to be removed in design to stabilise the loop; <b>(2)</b> it has no COM acceleration feedback, and the lateral four-bar mode (1.70 × mg/h) is underdamped behind a 100 ms delay. P2b restored the physiological torque path and added acceleration feedback, with three literature variants. Undisturbed and noise-free, <b>all three diverge from the entry</b>. Battery pushes were not run on them. This controller class (independent delayed PID loops through a static Jacobian transpose) is stable on this body only while its torque is superhuman.</p><div class="tw" id="p2b"></div></div>

<div class="card"><h2>The decision needed (yours)</h2>
<ol><li><b>Where do muscle contraction (EMG → force) dynamics belong?</b> <b>(a) Recommended:</b> in the V2 body spec, as an actuator stage, so no controller can produce superhuman torque development. <b>(b)</b> In P2, which leaves V2 unchanged.</li>
<li><b>Which controller class does P2 become?</b> <b>(a) Recommended:</b> a model-based delayed multi-joint controller: delayed multisensory state estimation with an internal-model predictor bridging the delay, and coordinated output on the sway modes (ankle / hip / four-bar). It is still causal. <b>(b)</b> Independent PID loops plus acceleration feedback, which is P2's class and is shown unstable here once torque is physiological.</li></ol>
<p>Either choice is re-qualified on the <b>same frozen S2 + P2 battery</b>. S2 does not change, except that option 1(a) adds an actuator stage, which re-qualifies S2 on its battery.</p>
<p><b>Spec recommendation (nothing changed):</b> adopt C (Maxwell strain arms + bidirectional short-range-stiffness cap; body), T (ready-stance tone; neural / feed-forward setting) and A2 (minimum-effort rest statics; feed-forward law). B is optional, through V2's existing neutral-zone term. For P, adopt the architecture but not the current controller.</p></div>

<p style="font-size:12px">Files: <code>ppr3/PPR3_REPORT.md</code> (fifteen answers) · <code>PPR3_DESIGN.md</code> · <code>PPR3_CRITERIA_AUDIT.md</code> · <code>PPR3_S2_PREREGISTRATION.md</code> · <code>PPR3_P2_DESIGN.md</code> · <code>PPR3_P2_PREREGISTRATION.md</code> · <code>explore/P2B_EXPLORATION.md</code> · <code>research/</code> · <code>evidence/</code>. Records and clip data are outside Git (<code>review/OUTSIDE_GIT.md</code>). Page built by <code>render/ppr3_review_build.mjs</code>.</p>
</main>
<script>
const D = ${JSON.stringify(D)};
const $ = (id) => document.getElementById(id), esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const tbl = (head, rows) => "<table><thead><tr>" + head.map(h => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.join("") + "</tr>").join("") + "</tbody></table>";
const td = (x, cls) => "<td" + (cls ? " class=\\"" + cls + "\\"" : "") + ">" + x + "</td>", pf = (p) => td(p ? "✓" : "✗", p ? "ok" : "bad");
// ── video ──
const SC = { STAND: "Undisturbed standing", PUSHF: "Moderate forward push · 9.7 N·s", PUSHL: "Moderate lateral (left) push · 24.9 N·s", PUSHX: "Unrecoverable forward push · 36.4 N·s" };
const CAP = { STAND: "Undisturbed, from the entry. CURRENT V2 (SnapshotTone) leaves standing at 0.34 s and is down by ≈ 2.5 s. S2 alone (constant tone, no feedback) is compliant, departs at 1.43 s and folds by ≈ 3–3.5 s. S2 + P2 stands, with small continuous sway (60 s in the battery).",
  PUSHF: "Moderate forward push. S2 + P2 recovers: COM peak ≈ 26 mm at 0.5 s, settled within 10 mm by ≈ 0.9 s (battery). The no-feedback twin loses balance at ≈ 0.44 s. CURRENT V2 falls by itself during the clip.",
  PUSHL: "Moderate lateral push. S2 + P2 <b>fails</b>: the far foot unloads at ≈ 0.4 s (criterion P2). The lateral mode is underdamped. The no-feedback twin falls sideways earlier.",
  PUSHX: "1.5 × the zero-delay no-step limit. All three lose no-step balance; S2 + P2 goes down to its knees. A controller that saved this would be a failure." };
let vs = { s: "STAND", sp: "normal", va: "clean" };
function vbtn() { const b = (grp, k, l) => "<button data-g=\\"" + grp + "\\" data-k=\\"" + k + "\\" class=\\"" + (vs[grp] === k ? "on" : "") + "\\">" + l + "</button>";
  $("vctl").innerHTML = Object.keys(SC).map(k => b("s", k, SC[k])).join("") + "<span>speed</span>" + b("sp", "normal", "normal") + b("sp", "slow", "4× slow") + "<span>view</span>" + b("va", "clean", "clean") + b("va", "overlay", "overlay");
  $("vctl").querySelectorAll("button").forEach(x => x.onclick = () => { vs[x.dataset.g] = x.dataset.k; vbtn(); vload(); }); }
function vload() { const id = vs.s + "_" + vs.sp, v = D.video.find(x => x.id === id), t = $("vid").currentTime; $("vid").src = "video/" + id + "_" + vs.va + ".mp4"; $("vid").play().catch(() => {});
  $("vcap").innerHTML = CAP[vs.s] + " <br>Panels: " + v.panels.map(esc).join(" | ") + " · camera: " + v.camera + " · steps " + v.from + "–" + v.to + (vs.va === "overlay" ? " · overlay: skeleton, COM + its ground projection (green), support polygon + contacts (blue), ground reaction per foot" : ""); }
vbtn(); vload();
// ── chronology ──
const fm = D.runs["fwd.moderate"], ch = fm.ch, nt = fm.nt;
const ev = [[0, "the 50 ms pelvis pulse begins"], [ch.stateDiff, "body state differs from the twin; first joint ≥ 0.01°: the mechanical response"], [ch.joint01, "first joint ≥ 0.1°. <b>P2 has sensed nothing yet</b>; S2's intrinsic mechanics resist"],
  [ch.command, "<b>first P2 command difference.</b> Sensed sample per channel: COM " + fm.sensed[0] + " · hip / lumbar / thoracic " + fm.sensed.slice(1, 4).join(" / ") + " · <b>neck " + fm.sensed[4] + "</b> · knee " + fm.sensed[5] + " · joint " + fm.sensed[6] + ". The push begins at step 480 (first state with it: 481), so only the 25 ms neck channel has seen it. The first activation difference is at the same step"],
  [ch.command01, "first command difference > 0.1 N·m"], [nt.neck, "first neural torque > 0.1 N·m: neck"], [nt.lumbar, "lumbar, knee (segmental 75 ms loops)"], [nt.ankle, "ankle (COM loop, 100 ms)"], [nt.hip, "hip"],
  [146, "ankle torque rising fastest: <b>" + D.torque.fwdModerate.rate + " N·m/s</b> (human " + D.torque.human + ")"], [fm.rec.tPeak * 1000, "COM peak " + fm.rec.peak + " mm"], [fm.rec.settle * 1000, "settled within 10 mm of the twin"]];
$("chron").innerHTML = ev.map(([t, s]) => "<li><b class=\\"t\\">" + (t < 1000 ? (+t).toFixed(t % 1 ? 2 : 0) + " ms" : (t / 1000).toFixed(2) + " s") + "</b><span>" + s + "</span></li>").join("");
// ── live vs replay traces ──
let pd = "fwd.moderate";
function ptr() { const keys = ["fwd.small", "fwd.moderate", "back.small", "back.moderate", "left.small", "left.moderate", "right.small"];
  $("pctl").innerHTML = keys.map(k => "<button data-k=\\"" + k + "\\" class=\\"" + (k === pd ? "on" : "") + "\\">" + k.replace(".", " ") + " " + D.runs[k].J + "</button>").join("");
  $("pctl").querySelectorAll("button").forEach(x => x.onclick = () => { pd = x.dataset.k; ptr(); });
  const tr = D.runs[pd].trace, W = 640, H = 310, L = 46, B = 30, T = 26, Rr = 34, ymax = 300, sx = (t) => L + (W - L - Rr) * t / 1000, sy = (v) => T + (H - T - B) * (1 - Math.max(-60, Math.min(ymax, Math.abs(v) * Math.sign(v))) / ymax);
  const path = (i) => tr.map((p, j) => (j ? "L" : "M") + sx(p[0]).toFixed(1) + "," + sy(p[i]).toFixed(1)).join("");
  let g = ""; for (let y = 0; y <= ymax; y += 50) g += "<line x1=" + L + " x2=" + (W - Rr) + " y1=" + sy(y) + " y2=" + sy(y) + " stroke=#24302a /><text x=" + (L - 6) + " y=" + (sy(y) + 4) + " fill=#9fb3a9 font-size=11 text-anchor=end>" + y + "</text>";
  for (let t = 0; t <= 1000; t += 200) g += "<text x=" + sx(t) + " y=" + (H - 10) + " fill=#9fb3a9 font-size=11 text-anchor=middle>" + t + " ms</text>";
  g += "<rect x=" + L + " width=" + (W - L - Rr) + " y=" + sy(70) + " height=" + (sy(56) - sy(70)) + " fill=#56645d opacity=0.45 />";
  $("ptr").innerHTML = "<svg viewBox=\\"0 0 " + W + " " + H + "\\" role=img aria-label=\\"COM displacement, live vs replay\\">" + g + "<text x=6 y=13 fill=#9fb3a9 font-size=11>ΔCOM mm, push direction</text><path d=\\"" + path(2) + "\\" fill=none stroke=#ff8f6b stroke-width=2 stroke-dasharray=\\"6 4\\" /><path d=\\"" + path(1) + "\\" fill=none stroke=#6cc3ff stroke-width=2.4 /></svg>"; }
ptr();
// ── human capability ──
const sw = D.sway, hu = [["COM sway RMS", sw.comAPmm.rms.toFixed(2) + " AP / " + sw.comMLmm.rms.toFixed(2) + " ML mm", "4.1–4.3 / 1.7–2.0 mm (Foulger 2025)", "alive, ≈ 0.4 × human", "ok"],
  ["COM sway frequency", sw.comAPfreqHz.toFixed(2) + " Hz", "COP median ≈ 0.3 Hz (Yamamoto 2015)", "≈ 4 × too fast", "bad"],
  ["COP RMS", sw.copAPmm.rms.toFixed(1) + " AP / " + sw.copMLmm.rms.toFixed(1) + " ML mm", "5.1 / 3.3 mm (soccer, wide stance; Thompson 2017)", "AP human; ML 1.7 ×", ""],
  ["COP velocity", sw.copMeanVelMmS.toFixed(0) + " mm/s", "6–10 mm/s", "contact-solver jitter; reported, not judged", ""],
  ["Intrinsic stiffness", "ankle 0.78–1.21 × Vlutters; hip 108 per side; knee 99; lumbar 151 / 77 N·m/rad", "§ S2 table", "inside (hip at the top edge)", "ok"],
  ["Latency (body joints)", "neural torque 79 ms (lumbar, knee), 104 ms (ankle)", "EMG 100 ± 20 ms; ankle active torque 99 ± 13 ms", "ankle human; trunk / knee ≈ 20 ms early", ""],
  ["Ankle torque rise", D.torque.fwdModerate.rate + " N·m/s (moderate); " + D.torque.fwdLarge.rate + " (large)", D.torque.human, "superhuman", "bad"],
  ["Load transfer", "small lateral push: far foot down to 21–26 N", "a 0.25 × limit push is inside the human feet-in-place range", "fragile", "bad"],
  ["Recovery (20 N·s / 350 ms)", "fwd " + D.M.fwd.recovery.comPeakMm.toFixed(0) + " mm at " + D.M.fwd.recovery.tPeakS.toFixed(2) + " s; unsettled at 4 s", "56–70 mm at 0.5–0.6 s; done in 2–3 s (Rietdyk 1999)", "slow, underdamped", "bad"],
  ["No-step threshold", "fwd " + D.T.fwd.fracOfJlim.toFixed(2) + " ×, lateral " + D.T.left.fracOfJlim.toFixed(2) + " × the zero-delay limit", "≈ 0.44–0.56 ×", "over-robust fwd, fragile lateral", "bad"]];
$("hum").innerHTML = tbl(["Measure", "S2 + P2", "Human", "Verdict"], hu.map(r => [td(r[0], "nw"), td(r[1]), td(r[2], "small"), td(r[3], r[4])]));
// ── criteria tables ──
const crit = (C) => tbl(["ID", "Pass", "Criterion", "Value"], Object.entries(C.results).map(([k, r]) => [td("<b>" + k + "</b>", "nw"), pf(r.pass), td(esc(C.criteria[k] || ""), "small crit"), td("<code>" + esc(JSON.stringify(r.value)).slice(0, 420) + "</code>", "small code")]));
$("p2crit").innerHTML = crit(D.p2); $("s2crit").innerHTML = crit(D.s2);
// ── pushes ──
const order = ["fwd", "back", "left", "right"].flatMap(d => ["small", "moderate", "large"].map(m => d + "." + m));
$("push").innerHTML = tbl(["Push", "N·s", "Outcome (4 s)", "COM peak", "t peak", "Settled", "First command", "Neural torque (ankle / knee / hip / lumbar / neck)", "No-feedback twin (1 s)"], order.map(k => { const r = D.runs[k], o = r.rec;
  return [td(k.replace(".", " "), "nw"), td(r.J), td(o.fall ? "falls: " + o.fall.cause + " @ " + o.fall.t.toFixed(2) + " s" : o.recovered ? "recovered" : "not settled (" + o.tail + " mm at 4 s)", o.fall ? (k.endsWith("large") ? "ok" : "bad") : o.recovered ? "ok" : "bad"),
    td(o.peak + " mm", "nw"), td(o.tPeak.toFixed(2) + " s", "nw"), td(o.settle != null && o.recovered ? o.settle.toFixed(2) + " s" : "—", "nw"), td(r.ch.command + " ms", "nw"), td(["ankle", "knee", "hip", "lumbar", "neck"].map(f => r.nt[f] ?? "—").join(" / ") + " ms", "nw"),
    td(r.rep.loss ? "loss " + r.rep.loss.t.toFixed(2) + " s (peak " + r.rep.peak + " mm)" : "peak " + r.rep.peak + " mm", "nw")]; }));
// ── ablations ──
const AL = { CANDIDATE: "S2 candidate", ABL_noT: "no T (2 % floors)", TONE_LOW: "T low (range ends)", TONE_HIGH: "T high (range ends)", ABL_noC_hill: "no C (Hill only)", ABL_C_ppr2hold: "C = PPR-2 indefinite hold", ABL_noB: "no B", CURRENTV2: "CURRENT V2" };
const f2 = (v) => v == null ? "—" : Array.isArray(v) ? v.map(x => +(+x).toFixed(2)).join(", ") : typeof v === "object" ? Object.values(v).map(x => (+x).toFixed(2)).join(" / ") : v;
$("abl").innerHTML = tbl(["Variant", "Score", "Failed", "Exit (s)", "I1a ankle × human", "I2 mgh", "I3 hip", "I4 knee", "I5 / I6 lumbar", "C1 ankle 100 / 300 / 1000 ms"], D.abl.map(a => [td("<b>" + AL[a.k] + "</b>", "nw"), td(a.n, a.pass ? "ok" : "bad"), td(a.failed.join(", ") || "—", "nw"), td(a.exit != null ? a.exit.toFixed(2) : "—"), td(f2(a.I1a), "nw"), td(f2(a.I2)), td(f2(a.I3)), td(f2(a.I4)), td((a.I5 ? a.I5[0] : "—") + " / " + (a.I6 ? a.I6[0] : "—"), "nw"), td(f2(a.C1), "nw")]));
// ── P2b ──
const VD = { C1: "P2 + K_A 0.13 s² + 2nd-order filter 15 rad/s", C2: "C1 + K_D 0.87 s", C3: "Pasma 2017 as fitted: K_D 0.87, K_A 0.13, filter 9.3 rad/s ζ 1.3" }, BASE = (v) => [4, 6, 8].map(t => v.undisturbed.find(p => p[0] === t)[2].toFixed(1)).join(" / ");
$("p2b").innerHTML = tbl(["Variant", "Change (literature values)", "Undisturbed, noise-free: COM shift at 4 / 6 / 8 s (mm)", "2 N·s fwd: ΔCOM at 1 / 3 / 6 s", "4 N·s lateral: ΔCOM at 1 / 3 / 6 s"], Object.entries(D.p2b).map(([k, v]) => { const at = (d, ts) => ts.map(t => (d.dComMm.find(p => p[0] === t) || [0, NaN])[1].toFixed(1)).join(" / ");
  return [td("<b>" + k + "</b>"), td(VD[k], "small"), td(BASE(v), "bad"), td(at(v.fwd, [1, 3, 6]), "nw"), td(at(v.left, [1, 3, 6]), "nw")]; }));
</script></body></html>
`;
fs.mkdirSync(new URL("review/", R), { recursive: true }); fs.writeFileSync(new URL("review/PPR3_REVIEW.html", R), html); console.log("review/PPR3_REVIEW.html", html.length, "bytes");

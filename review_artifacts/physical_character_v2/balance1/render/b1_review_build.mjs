// BALANCE-1 review page builder (presentation only): reads the committed evidence and writes review/BALANCE1_REVIEW.html with the data embedded.
// usage: node b1_review_build.mjs
import fs from "fs";
const R = new URL("../", import.meta.url), J = (p) => JSON.parse(fs.readFileSync(new URL(p, R)));
const { MUSCLE_GROUPS } = await import(new URL("../../../../sandbox/visual/physchar2/spec/v2_muscles.js", import.meta.url).href);
const tags = ["A", "B", "A_SENS_LOW", "B_SENS_LOW", "A_SENS_HIGH", "B_SENS_HIGH"], V = Object.fromEntries(tags.map(t => [t, J(`evidence/B1_V_${t}.json`)])), Q = Object.fromEntries(tags.map(t => [t, J(`evidence/B1_Q_${t}.json`)]));
const runs = (q) => Object.fromEntries(Object.entries(q.P.runs).map(([k, r]) => [k, { J: r.J, fall: r.recovery.fall ? r.recovery.fall.cause : null, rec: r.recovery.recovered, peak: +r.recovery.comPeakMm.toFixed(1), tPeak: +r.recovery.tPeakS.toFixed(2), settle: r.recovery.settleS == null ? null : +r.recovery.settleS.toFixed(2),
  slew: Math.round(r.human.torqueSlew.ankleAP), hipML: +r.human.torquePeak.hipML.toFixed(1), ankML: +r.human.torquePeak.ankleML.toFixed(1), ankAP: +r.human.torquePeak.ankleAP.toFixed(1), onset: r.neuralTorqueOnsetMsByFamily, cmd: r.chronology.ms ? r.chronology.ms.command : null, trace: r.comTrace }]));
const D = { crit: V.A.criteria, verdict: Object.fromEntries(tags.map(t => [t, { n: `${V[t].nPass} / ${V[t].n}`, failed: V[t].failed, results: Object.fromEntries(Object.entries(V[t].results).map(([k, r]) => [k, r.pass])) }])),
  value: { A: V.A.results, B: V.B.results }, runsB: runs(Q.B), runsA: runs(Q.A), M: { A: Q.A.M, B: Q.B.M }, T: { A: Q.A.T, B: Q.B.T }, U: Object.fromEntries(["A", "B"].map(t => [t, { sway: Q[t].U.sway, copLP: Q[t].U.copLowpassRmsMm, drift: Q[t].U.postureDrift }])),
  decision: J("evidence/B1_DECISION.json"), compare: J("evidence/B1_COMPARE_B.json"), perf: J("evidence/B1_PERF_B.json"), battery: Q.B.battery,
  groups: Object.entries(MUSCLE_GROUPS).map(([k, g]) => ({ k, rise: g.tauRiseMs, fall: g.tauFallMs, label: g.label, t: g.targets, range: g.range, src: g.src })), videos: JSON.parse(fs.readFileSync(new URL("review/video/VIEWS.json", R))).map(v => ({ id: v.id, note: v.note })) };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BALANCE-1 Review</title>
<style>
:root{--bg:#f6f5f1;--fg:#1d1d1b;--mut:#5f5e57;--card:#fff;--line:#dedcd3;--ok:#1f7a3f;--bad:#b3261e;--acc:#2a5db0;--warn:#9a6700}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151513;--fg:#ecebe6;--mut:#a3a197;--card:#1f1f1c;--line:#34332e;--ok:#5cc583;--bad:#ff8a80;--acc:#8ab4ff;--warn:#e0b44c}}
:root[data-theme="dark"]{--bg:#151513;--fg:#ecebe6;--mut:#a3a197;--card:#1f1f1c;--line:#34332e;--ok:#5cc583;--bad:#ff8a80;--acc:#8ab4ff;--warn:#e0b44c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 80px}h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:34px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}h3{font-size:15px;margin:18px 0 6px}
.mut{color:var(--mut)}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}
.status{font-weight:700;font-size:17px;color:var(--warn)}.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid var(--line);padding:5px 7px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}
.scroll{overflow-x:auto}.scroll table{min-width:760px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.kpi{font-size:22px;font-weight:700}.kpi small{font-size:12px;color:var(--mut);font-weight:400;display:block}
video{width:100%;border-radius:8px;background:#000}select,button{font:inherit;padding:5px 8px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--fg)}
svg text{fill:var(--mut);font-size:11px}code{font-size:12.5px}
</style></head><body><main>
<h1>BALANCE-1 — M1b adoption + human balance system</h1>
<div class="mut">Physical Character V2 · overnight 12 Oct 2026 · runner alone (PVP sealed, no tackle) · frozen at 01653ab4 before any battery run</div>
<div class="card"><div class="status">RECIPIENT STATUS: B. PROMISING BUT BALANCE NOT YET QUALIFIED</div>
<p>The canonical M1b body stands quietly under continuous, delayed, excitation-only whole-body control, recovers every small push and the moderate backward and lateral pushes, fails genuinely beyond human limits, and has a human-range corrective-torque rise (the superhuman S2 + P2 rise is gone). It does <b>not</b> recover the moderate <b>forward</b> push within the 4 s window (it hangs near the toes, then overshoots back), and the Rietdyk-form 20 N·s forward push falls. Adopted variant: <b>B</b> (preregistered rule).</p></div>
<div class="grid" id="kpis"></div>
<h2>Videos</h2><div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="vsel"></select><select id="vvar"><option value="clean">clean</option><option value="overlay">overlay (skeleton · COM · support)</option></select><span class="mut" id="vnote"></span></div>
<p class="mut" style="margin:6px 0">Panels: CURRENT V2 | S2 + old P2 (PPR-3) | M1b + BALANCE-1 (B). Same recorded step in every panel. "slow" = 0.25×. Push magnitudes are the BALANCE-1 battery's human levels. Nothing visually tuned.</p>
<video id="vid" controls loop muted playsinline></video></div>
<h2>Criteria (frozen, b1_eval.mjs)</h2><div class="card scroll"><table id="crit"></table></div>
<h2>Pushes (B, central body) vs human</h2><div class="card scroll"><table id="push"></table>
<p class="mut">Human: COM peak ≈ (0.24–0.34 s)·Δv at 0.4–0.6 s; return ≈ 1 s, settle 2–3 s; ML moment ≈ 85–90 % hips; first postural EMG 70–110 ms; torque onset 100–160 ms; ankle torque rate 372 ± 267 N·m/s (Robinovitch 2002). Limit level: ≈ half of young adults step. Over-limit: humans step or fall.</p></div>
<h3>COM trace relative to the undisturbed twin (first 2 s; mm)</h3><div class="card"><div id="traces" class="grid"></div></div>
<h2>Torque rise: S2 + old P2 vs M1b + BALANCE-1 (same pushes)</h2><div class="card scroll"><table id="cmp"></table></div>
<h2>Quiet standing (60 s, motor noise)</h2><div class="card scroll"><table id="quiet"></table></div>
<h2>Thresholds and Rietdyk-form pushes</h2><div class="card scroll"><table id="thr"></table></div>
<h2>A vs B (preregistered adoption rule)</h2><div class="card"><pre id="dec" style="white-space:pre-wrap;font-size:12.5px;margin:0"></pre></div>
<h2>Canonical muscle groups (spec/v2_muscles.js)</h2><div class="card scroll"><table id="grp"></table></div>
<h2>Performance</h2><div class="card scroll"><table id="perf"></table></div>
<h2>Documents</h2><div class="card"><ul>
<li><a href="../BALANCE1_REPORT.md">BALANCE1_REPORT.md</a> — 22 answers + status</li><li><a href="../BALANCE1_PREREGISTRATION.md">BALANCE1_PREREGISTRATION.md</a> · <a href="../BALANCE1_FREEZE.json">BALANCE1_FREEZE.json</a></li>
<li><a href="../BALANCE1_DESIGN_LOG.md">BALANCE1_DESIGN_LOG.md</a> (D0–D12, design-stage disclosure)</li><li><a href="../research/BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md">Literature review</a></li></ul></div>
</main><script>
const D=${JSON.stringify(D)};
const $=s=>document.querySelector(s), f=(v,d=1)=>v==null?"–":(typeof v==="number"?v.toFixed(d):v), pf=b=>b?'<span class="ok">✓</span>':'<span class="bad">✗</span>';
// KPIs
const B=D.runsB, sw=D.U.B.sway;
$("#kpis").innerHTML=[["Adopted",D.decision.adopted,"preregistered A/B rule"],["Central verdict",D.verdict.B.n,"failed: "+D.verdict.B.failed.join(", ")],["Ankle torque rate, moderate fwd",D.compare.runs.M1B_B1["fwd.moderate"].ankleAPslewNms.toFixed(0)+" N·m/s","S2 + old P2: "+D.compare.runs.S2P2["fwd.moderate"].ankleAPslewNms.toFixed(0)+" · human 372 ± 267"],["Quiet COM RMS AP / ML",sw.comAPmm.rms.toFixed(2)+" / "+sw.comMLmm.rms.toFixed(2)+" mm","human 4.1–4.3 / 1.7–2.0"],["Thresholds fwd / lateral",D.T.B.fwd.thresholdNs.toFixed(1)+" / "+D.T.B.left.thresholdNs.toFixed(1)+" N·s","human 16–23 / 20–26 (hip width)"],["First command change","29.2 ms","vestibulocollic channel (22 ms + 1 step)"]].map(([a,b,c])=>'<div class="card"><div class="mut">'+a+'</div><div class="kpi">'+b+'<small>'+c+'</small></div></div>').join("");
// videos
const vs=$("#vsel"); D.videos.forEach(v=>{const o=document.createElement("option");o.value=v.id;o.textContent=v.id.replace("_"," · ");vs.appendChild(o)});
const setV=()=>{const id=vs.value, v=D.videos.find(x=>x.id===id); $("#vid").src="video/"+id+"_"+$("#vvar").value+".mp4"; $("#vnote").textContent=v.note; try{localStorage.setItem("b1v",id)}catch(e){}};
try{const s=localStorage.getItem("b1v"); if(s&&D.videos.some(v=>v.id===s)) vs.value=s; else vs.value="PUSHF_slow"}catch(e){vs.value="PUSHF_slow"} vs.onchange=setV; $("#vvar").onchange=setV; setV();
// criteria
const T=["A","B","A_SENS_LOW","B_SENS_LOW","A_SENS_HIGH","B_SENS_HIGH"];
$("#crit").innerHTML="<tr><th>ID</th><th>Criterion</th>"+T.map(t=>"<th>"+t.replace("_SENS_"," sens ")+"</th>").join("")+"</tr>"+Object.entries(D.crit).map(([k,c])=>"<tr><td><b>"+k+"</b></td><td>"+c+"</td>"+T.map(t=>"<td>"+pf(D.verdict[t].results[k])+"</td>").join("")+"</tr>").join("")+"<tr><td></td><td><b>Total</b></td>"+T.map(t=>"<td><b>"+D.verdict[t].n+"</b></td>").join("")+"</tr>";
// pushes
const dirs=["fwd","back","left","right"], lv=["small","moderate","limit","over"];
$("#push").innerHTML="<tr><th>Push</th><th>N·s</th><th>Outcome</th><th>COM peak mm</th><th>t peak s</th><th>settle s</th><th>ankle AP rate N·m/s</th><th>hip / ankle ML peak N·m</th><th>neural onset ms (ankle · knee · hip · lumbar · thoracic)</th></tr>"+dirs.flatMap(d=>lv.map(m=>{const r=B[d+"."+m],o=r.onset;return "<tr><td>"+d+" "+m+"</td><td>"+r.J+"</td><td>"+(r.fall?'<span class="bad">fall</span> <span class="mut">'+r.fall+'</span>':(r.rec?'<span class="ok">recovered</span>':'<span class="bad">not settled in 4 s</span>'))+"</td><td>"+f(r.peak)+"</td><td>"+f(r.tPeak,2)+"</td><td>"+f(r.settle,2)+"</td><td>"+r.slew+"</td><td>"+(d==="left"||d==="right"?f(r.hipML)+" / "+f(r.ankML):"–")+"</td><td>"+["ankle","knee","hip","lumbar","thoracic"].map(x=>f(o[x],0)).join(" · ")+"</td></tr>"})).join("");
// traces (SVG)
const svgT=(d)=>{const W=260,H=140,ser=lv.slice(0,3).map(m=>B[d+"."+m].trace),all=ser.flat().map(p=>p[1]),mx=Math.max(20,...all.map(Math.abs).filter(v=>v<200)),cols=["var(--ok)","var(--acc)","var(--warn)"];
 const y=v=>H/2-Math.max(-H/2,Math.min(H/2,v/mx*(H/2-8))),x=t=>t/2000*W;
 return '<div><div class="mut">'+d+' (small · moderate · limit)</div><svg viewBox="0 0 '+W+' '+H+'" width="100%"><line x1="0" x2="'+W+'" y1="'+H/2+'" y2="'+H/2+'" stroke="var(--line)"/>'+ser.map((s,i)=>'<polyline fill="none" stroke="'+cols[i]+'" stroke-width="1.6" points="'+s.map(p=>x(p[0]).toFixed(1)+","+y(p[1]).toFixed(1)).join(" ")+'"/>').join("")+'<text x="4" y="12">±'+mx.toFixed(0)+' mm</text><text x="'+(W-30)+'" y="'+(H-4)+'">2 s</text></svg></div>';};
$("#traces").innerHTML=dirs.map(svgT).join("");
// compare
const C=D.compare.runs;$("#cmp").innerHTML="<tr><th>Push</th><th>N·s</th><th>S2 + old P2: rate N·m/s</th><th>peak N·m</th><th>M1b + BALANCE-1: rate N·m/s</th><th>peak N·m</th></tr>"+Object.keys(C.S2P2).map(k=>"<tr><td>"+k+"</td><td>"+C.S2P2[k].J+"</td><td>"+C.S2P2[k].ankleAPslewNms.toFixed(0)+"</td><td>"+C.S2P2[k].ankleAPpeakNm.toFixed(1)+"</td><td><b>"+C.M1B_B1[k].ankleAPslewNms.toFixed(0)+"</b></td><td>"+C.M1B_B1[k].ankleAPpeakNm.toFixed(1)+"</td></tr>").join("")+'<tr><td colspan="6" class="mut">Human: lean-release 372 ± 267 N·m/s (P7 limit 906 = mean + 2 SD); platform ≈ 250 N·m/s.</td></tr>';
// quiet
const q=(t)=>D.U[t];$("#quiet").innerHTML="<tr><th>Measure</th><th>A</th><th>B</th><th>Human</th></tr>"+[["COM RMS AP / ML (mm)",t=>f(q(t).sway.comAPmm.rms,2)+" / "+f(q(t).sway.comMLmm.rms,2),"4.1–4.3 / 1.7–2.0"],["COP RMS raw AP / ML (mm)",t=>f(q(t).sway.copAPmm.rms,1)+" / "+f(q(t).sway.copMLmm.rms,1),"4.6 ± 2.2 / 3.1 ± 0.9 (SD)"],["COP RMS 100 ms MA AP / ML (mm)",t=>f(q(t).copLP.AP,1)+" / "+f(q(t).copLP.ML,1),"4.6 ± 2.2 / 3.1 ± 0.9"],["COM AP zero-crossing frequency (Hz)",t=>f(q(t).sway.comAPfreqHz,2),"COP median ≈ 0.3"],["Joint SD ankle / knee / hip / neck (°)",t=>["ankle_L.df","knee_L.flex","hip_L.flex","neck.flex"].map(k=>f(q(t).sway.jointRmsDeg[k],2)).join(" / "),"0.21 / 0.18 / 0.30 / 0.31"],["Posture drift: max joint mean (°)",t=>f(q(t).drift.maxJointMeanDeg,2),"criterion ≤ 3"]].map(([a,g,h])=>"<tr><td>"+a+"</td><td>"+g("A")+"</td><td>"+g("B")+"</td><td class='mut'>"+h+"</td></tr>").join("");
// thresholds
$("#thr").innerHTML="<tr><th></th><th>A</th><th>B</th><th>Human / criterion</th></tr><tr><td>No-step threshold forward (N·s; fraction of the zero-delay limit)</td><td>"+f(D.T.A.fwd.thresholdNs,2)+" ("+f(D.T.A.fwd.fracOfJlim,3)+")</td><td>"+f(D.T.B.fwd.thresholdNs,2)+" ("+f(D.T.B.fwd.fracOfJlim,3)+")</td><td class='mut'>16–23 N·s; ≈ 0.40–0.61 · criterion [0.35, 0.80]</td></tr><tr><td>No-step threshold lateral</td><td>"+f(D.T.A.left.thresholdNs,2)+" ("+f(D.T.A.left.fracOfJlim,3)+")</td><td>"+f(D.T.B.left.thresholdNs,2)+" ("+f(D.T.B.left.fracOfJlim,3)+")</td><td class='mut'>20–26 N·s at hip width (low confidence; stance here 0.42 m)</td></tr>"+["fwd","left"].map(d=>"<tr><td>Rietdyk-form 20 N·s / 350 ms "+d+"</td>"+["A","B"].map(t=>{const m=D.M[t][d].recovery;return "<td>"+(m.fall?'<span class="bad">fall</span>':(m.recovered?'<span class="ok">recovered</span>':'<span class="bad">not settled</span>'))+" · peak "+f(m.comPeakMm)+" mm @ "+f(m.tPeakS,2)+" s</td>"}).join("")+"<td class='mut'>recovered; peak 24–120 mm at 0.25–1.0 s; settle ≤ 3.5 s (Rietdyk 56–70 mm at 0.5–0.6 s)</td></tr>").join("");
$("#dec").textContent=JSON.stringify(D.decision,null,1);
$("#grp").innerHTML="<tr><th>Group</th><th>τc rise / fall ms</th><th>targets 10–90 / 90–10 ms</th><th>sensitivity τc range</th><th>label</th><th>source</th></tr>"+D.groups.map(g=>"<tr><td>"+g.k+"</td><td>"+g.rise+" / "+g.fall+"</td><td>"+g.t.rise10_90ms+" / "+g.t.fall90_10ms+"</td><td>"+(g.range?g.range.tauRiseMs.join("–")+" / "+g.range.tauFallMs.join("–"):"–")+"</td><td>"+g.label+"</td><td class='mut'>"+g.src+"</td></tr>").join("");
const P=D.perf;$("#perf").innerHTML="<tr><th>Item</th><th>Value</th></tr>"+[["M1b muscle layer (compute + after)",P.usPerStep.muscle+" µs / step"],["BALANCE-1 controller",P.usPerStep.controller+" µs / step"],["Solver (Jolt, 1 character)",P.usPerStep.solver+" µs / step"],["V2 passive model",P.usPerStep.passiveV2+" µs / step"],["Instrumentation + measurement",P.usPerStep.instrumentAndMeasure+" µs / step"],["Muscle state",P.stateFloats.muscle+" floats"],["Controller state (approx.)",P.stateFloats.controllerApprox+" floats (sensor ring dominates)"],["Muscle snapshot / restore",P.snapshotUs.toFixed(1)+" / "+P.restoreUs.toFixed(1)+" µs"],["22 players: muscle + controller",P.estimate22.bodyControlMsPerStep+" ms of the 4.17 ms step (solver / passive model not included)"],["Timing changed nothing","final hash "+P.finalHash+" = reference "+P.refHash],["CPU",P.cpu+" · node "+P.node]].map(([a,b])=>"<tr><td>"+a+"</td><td>"+b+"</td></tr>").join("");
</script></body></html>`;
fs.writeFileSync(new URL("review/BALANCE1_REVIEW.html", R), html); console.log("written", html.length);

// BALANCE-2 flat-sole criterion + P8 review page builder (presentation only): reads the committed evidence and writes
// p8/review/BALANCE2_B2F_P8_REVIEW.html with the data embedded. usage: node p8_review_build.mjs
import fs from "fs";
const R = new URL("../", import.meta.url), J = (p) => JSON.parse(fs.readFileSync(new URL(p, R)));
const VF = J("evidence/B2F_V_BALANCE2_C3.json"), VM = J("evidence/B2M_V_BALANCE2_C3.json"), D = J("p8/evidence/P8_DIAGNOSTICS.json"), L3 = J("evidence/C3_LEGIT_BALANCE2_C3.json");
const DEV = { R0: J("c4/dev/DEV_R0_C3.json"), H1: J("c4/dev/DEV_H1.json"), Href: J("c4/dev/DEV_Href.json") };
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const cell = (v) => (v ? '<td class="ok">✓</td>' : '<td class="bad">✗</td>');
const crit = ["U1", "U2", "U3", "U4", "U5", "U6", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "M1", "T1", "DET"];
const vRows = crit.map(c => `<tr><th>${c}</th>${cell(VM.results[c].pass)}${cell(VF.results[c].pass)}<td class="txt">${c === "T1" ? `fwd ${VF.results.T1.value.fwd} N·s · B2M band 13.01–18.22 → B2F band 10.15–14.21` : c === "P8" ? `back small ${VF.results.P8.value["back.small"].frac} (≤ 0.26)` : ""}</td></tr>`).join("");
const ab = (k) => D.ablations[k] ? D.ablations[k].overshoot.frac : "–";
const abl = [["C3", "C3 as frozen", "noGovernor_C2"], ["noNoise", "motor noise off"], ["holdAPI", "AP COM integral held from onset"], ["holdAllI", "every controller integral held from onset"], ["noNoise_holdAllI", "noise off + every integral held (memoryless controller)"], ["noPredAP", "AP prediction off"], ["noDirMuscle", "direction-specific muscle constants off"], ["armR0", "body diagnostic: M1b persistent strain arm removed"], ["armR0_noNoise_holdAllI", "body diagnostic + noise off + integrals held"], ["B1", "BALANCE-1 B"]];
const ablRows = abl.map(([k, l, alt]) => { const g = (c) => ab(`${c}|${k}`) !== "–" ? ab(`${c}|${k}`) : (alt ? ab(`${c}|${alt}`) : "–"); return `<tr><th class="txt">${esc(l)}</th><td>${g("back.small")}</td><td>${g("back.moderate")}</td><td>${g("fwd.small")}</td></tr>`; }).join("");
const lt = (k) => D.long12s[`back.small|${k}`].trace.filter(([t]) => [0.3, 1, 2, 3, 4, 5, 6, 7.5, 9, 10.5, 11.5].includes(t)), ltHead = lt("C3").map(([t]) => `<th>${t}</th>`).join("");
const ltRows = [["C3", "C3"], ["noNoise", "noise off"], ["noNoise_holdAllI", "noise off, integrals held"]].map(([k, l]) => `<tr><th class="txt">${l}</th>${lt(k).map(([, x]) => `<td>${x}</td>`).join("")}</tr>`).join("");
const seg = D.segments.noNoise_holdAllI.find(s => s.t === 3.99), segRow = Object.entries(seg.contribMm).map(([k, v]) => `<td>${k}<br>${v}</td>`).join("");
const dc = (k, c) => { const x = DEV[k].cases[c]; return x.fall ? "fall" : `${x.recovered ? "" : "not settled · "}os ${x.overshoot ? x.overshoot.frac.toFixed(3) : "–"}`; };
const devRows = ["fwd.5@24", "fwd.10@24", "back.6@24", "back.12@24", "left.12@24", "fwd.12@12"].map(c => `<tr><th>${c}</th>${["R0", "H1", "Href"].map(k => `<td>${dc(k, c)}</td>`).join("")}</tr>`).join("") + `<tr><th>thr fwd / back (100 ms)</th>${["R0", "H1", "Href"].map(k => `<td>${DEV[k].thrFwd100ms.thresholdNs.toFixed(2)} / ${DEV[k].thrBack100ms.thresholdNs.toFixed(2)}</td>`).join("")}</tr>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flat-Sole Criterion Review</title>
<style>:root{--bg:#0d1110;--fg:#e6ece9;--mut:#9aa7a1;--ok:#3fbf7f;--bad:#e5534b;--warn:#d9a33f;--card:#151b19;--line:#24302c}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f8f7;--fg:#17201c;--mut:#5b6b63;--ok:#1d8a55;--bad:#c23b33;--warn:#a86f12;--card:#ffffff;--line:#d5ddd9}}
:root[data-theme="dark"]{--bg:#0d1110;--fg:#e6ece9;--mut:#9aa7a1;--ok:#3fbf7f;--bad:#e5534b;--warn:#d9a33f;--card:#151b19;--line:#24302c}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0 auto;padding:16px;max-width:1400px}h1{font-size:24px}h2{margin-top:32px;border-bottom:1px solid var(--line);padding-bottom:4px}
table{border-collapse:collapse;margin:8px 0;font-size:13px;display:block;overflow-x:auto}td,th{border:1px solid var(--line);padding:4px 8px;text-align:center}th{background:var(--card)}.txt{text-align:left;color:var(--mut);font-size:12px;max-width:560px}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin:12px 0}.status{font-size:20px;font-weight:700;color:var(--warn)}
.note{color:var(--mut);font-size:12px;margin:2px 0}img{max-width:100%;border:1px solid var(--line);border-radius:6px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));gap:12px}</style></head><body>
<h1>Flat-sole forward criterion (B2F) and the P8 backward-small overshoot</h1>
<div class="card"><div class="status">RECIPIENT STATUS: B. PROMISING — SPECIFIC BALANCE GAP REMAINS (frozen rule). Not qualified.</div>
<ul><li><b>Criterion correction:</b> the T1′ forward band was normalised to the 102.95 mm boot-rocker edge. Re-derived at the loadable flat-sole edge (80.29 mm) it is <b>10.15–14.21 N·s</b>. Frozen before use; B2M and C3's 15 / 17 preserved.</li>
<li><b>Unchanged C3 on B2F: ${VF.nPass} / ${VF.n}</b>, failing ${VF.failed.join(", ")} only. Forward threshold ${VF.results.T1.value.fwd} N·s. Every run bit-identical to the original. Legitimacy (L1, L2) and causality unchanged: pass.</li>
<li><b>P8 cause:</b> controller-side. After a backward push the upper body stays ≈ 1.2° forward about the hips, because BALANCE-1's trunk-lean objective does not act at the hips front-to-back. The integrals turn the slow decay into a ≈ 9 s oscillation. Not noise, not body memory, not the test.</li>
<li><b>Successor:</b> the one declared candidate (repair the hip map; declared P/D; no new integrator) made overshoot worse on the development set (back 6: 0.311 → 0.455). Rejected by the frozen rule. C3 unchanged. A fix needs coordinated ankle–hip control: an architecture decision.</li></ul></div>
<h2>1. Three capabilities, kept apart (forward, 50 ms push)</h2>
<table><tr><th></th><th>support distance d</th><th>zero-delay limit</th><th>human-fraction band (0.50–0.70)</th></tr>
<tr><th class="txt">Human anatomy (toes load; dynamic COP reach)</th><td>≈ 150 mm (CoPmax 153; toe tip 145–185)</td><td>≈ 37–47 N·s</td><td>≈ 19–27 N·s (Robert extrapolation 20.5 ± 3.3)</td></tr>
<tr><th class="txt">V2 rigid flat foot (body: loadable sole edge)</th><td>80.29 mm</td><td>20.30 N·s</td><td><b>10.15–14.21</b></td></tr>
<tr><th class="txt">V2 boot rocker (ruled not legitimate)</th><td>102.95 mm</td><td>26.03 N·s</td><td>13.01–18.22 (old B2M band)</td></tr>
<tr><th class="txt">Controller C3 (measured)</th><td>envelope 64.8 mm (conservative)</td><td>—</td><td><b>12.09 N·s</b> = 0.595 of the body's flat-sole limit; physical limit 12.13; never loads the tip</td></tr></table>
<h2>2. C3 on B2M (historical) vs the corrected B2F</h2><table><tr><th></th><th>B2M</th><th>B2F</th><th></th></tr>${vRows}</table>
<h2>3. P8: what the 0.287 is (12 s, mm; + = backward)</h2><table><tr><th>t (s)</th>${ltHead}</tr>${ltRows}</table>
<p class="note">Human response: complete in 2–3 s (Rietdyk 1999). C3: a ≈ 9 s slow oscillation. With every integral held and noise off, a slow decay (τ ≈ 9 s).</p>
<h2>4. Single-factor ablations (overshoot fraction; both twin and push)</h2><table><tr><th>variant</th><th>back small</th><th>back moderate</th><th>fwd small</th></tr>${ablRows}</table>
<p class="note">Feet move &lt; 0.1 mm versus the twin. Where the 5.7 mm lives (memoryless controller, t = 4 s, contribution to the COM offset, mm):</p><table><tr>${segRow}</tr></table>
<h2>5. The one declared successor candidate (development set only)</h2><table><tr><th>DEV case</th><th>C3</th><th>H1: hip map repaired, P/D only</th><th>Href: full repair, existing gains (reference)</th></tr>${devRows}</table>
<h2>6. Visual check</h2><div class="grid"><div><img src="frames/P8BACKS_t300ms.png" alt="back small push, 0.3 s"><p class="note">+0.3 s: peak backward excursion</p></div><div><img src="frames/P8BACKS_t2900ms.png" alt="back small push, 2.9 s"><p class="note">+2.9 s: the scored trough (4.8 mm forward, ≈ 1° trunk lean): not visible at viewing scale</p></div><div><img src="frames/P8BACKS_t7500ms.png" alt="back small push, 7.5 s"><p class="note">+7.5 s: the opposite swing of the slow oscillation</p></div></div>
<video controls preload="none" src="video/P8BACKS_normal_overlay.mp4" width="100%"></video><video controls preload="none" src="video/P8BACKS_normal_clean.mp4" width="100%"></video>
<p class="note">Report: balance2/BALANCE2_B2F_P8_REPORT.md · criterion: balance2/BALANCE2_FLAT_SOLE_CRITERION.md · diagnosis: balance2/p8/P8_DIAGNOSIS.md · successor log: balance2/c4/C4_DESIGN_LOG.md · L1 ${L3.L1.pass ? "pass" : "fail"}, L2 ${L3.L2.pass ? "pass" : "fail"}</p></body></html>`;
fs.writeFileSync(new URL("p8/review/BALANCE2_B2F_P8_REVIEW.html", R), html); console.log("wrote", html.length);

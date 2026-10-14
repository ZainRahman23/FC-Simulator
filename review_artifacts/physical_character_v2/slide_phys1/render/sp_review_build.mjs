// SLIDE-PHYS-1 review page builder: reads the committed evidence (evidence/sp1, stage2, stage3) and writes review/SLIDE_PHYS1_REVIEW.html.
// Videos: review/video/ (own renders, in Git) and review/local_reference/ (composites with the third-party reference: local only, gitignored —
// the page says so where a file is missing). usage (worktree root): node .../render/sp_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), R = path.join(D, ".."), EV = path.join(R, "evidence"), OUT = path.join(R, "review", "SLIDE_PHYS1_REVIEW.html");
const J = (p) => JSON.parse(fs.readFileSync(path.join(EV, p)));
const f2 = (x, d = 2) => x == null ? "–" : (+x).toFixed(d), esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const RATES = [["1x", "1×"], ["05x", "0.5×"], ["025x", "0.25×"]];
const vid = (title, srcs, cap, opts = {}) => { const first = srcs[0][1]; return `<figure class="vid${opts.local ? " local" : ""}"><figcaption><b>${title}</b> <span class="tog">${srcs.map(([l, s], i) => `<button data-src="${s}"${i ? "" : ' class="on"'}>${l}</button>`).join("")}</span></figcaption>
<video controls loop muted playsinline preload="metadata" src="${first}"></video>${opts.local ? '<p class="miss">This composite contains the third-party reference video. It is kept outside Git, in <code>review/local_reference/</code>; it plays only on the machine that built it.</p>' : ""}<p class="cap">${cap}</p></figure>`; };
const rates = (pre, local) => RATES.map(([k, l]) => [l, `${local ? "local_reference" : "video"}/${pre}_${k}.mp4`]);
const sp = ["4.5", "4.75", "5", "5.25", "5.5"].map(v => ({ v, r: J(`sp1/SP1_A5_${v}_report.json`) })), s2 = J("stage2/stage2_summary.json"), s3 = J("stage3/stage3_summary.json");
const r5 = sp.find(x => x.v === "5").r, gb = r5.ground.byBody;
const spRows = sp.map(({ v, r }) => { const e = r.entry.atEntry; return `<tr><td>${v}</td><td><code>${r.rec.hash}</code></td><td>${f2(r.entry.groundEntryT, 3)}</td><td>${f2(e.vh)}</td><td>${f2(e.vy)}</td><td>${f2(Math.abs(e.vy) / e.vh)}</td><td>${f2(r.slide.slideDistM)}</td><td>${f2(r.slide.stopT)}</td><td>${f2(r.ground.peakTotalBW, 1)}</td><td>${f2(r.integrity.maxHardExcDeg, 1)}</td><td>${f2(r.integrity.maxTurfPenMm, 1)}</td><td>${f2(r.slide.minBellyY)}</td><td>${f2(r.cpu.perStepMs)}</td></tr>`; }).join("");
const gRows = Object.entries(gb).filter(([, e]) => e.JyNs > 1).map(([k, e]) => `<tr><td>${k}</td><td>${f2(e.peakT, 3)}</td><td>${f2(e.peakBW, 1)}</td><td>${f2(e.JyNs, 0)}</td><td>${f2(e.JtanNs, 0)}</td><td>${f2(e.hOverVAtPeak)}</td><td>${f2(e.hOverVMaxLoaded)}</td><td>${f2(e.slipMax)}</td></tr>`).join("");
const vRows = r5.comVelocity.map(x => `<tr><td>${f2(x.t, 3)}</td><td>${f2(x.vh)}</td><td>${f2(x.vy)}</td><td>${f2(x.vyOverVh)}</td><td>${f2(x.comY)}</td></tr>`).join("");
const s2Rows = Object.entries(s2.cases).map(([k, c]) => `<tr><td>${k}</td><td>${c.obstacles.length ? (c.obstacles[0].mass ? c.obstacles[0].mass + " kg box" : "static " + (k === "O5" ? "wall" : "box")) : "none"}</td><td><code>${c.hash}</code></td><td>${c.firstHit ? f2(c.firstHit.t, 3) + " " + c.firstHit.body : "–"}</td><td>${f2(Math.hypot(...c.obstImpulseNs), 1)}</td><td>${f2(c.maxObstDepthMm, 1)}</td><td>${c.maxDeflDeg.knee_R} / ${c.maxDeflDeg.hip_R} / ${c.maxDeflDeg.ankle_R}</td><td>${f2(c.errMaxPostHitDeg, 1)}</td><td>${c.ragdollAt ?? "never"}</td><td>${f2(c.measures.slideDist)}</td><td>${c.measures.headT != null ? f2(c.measures.headT) + " s" : "–"}</td><td>${f2(c.measures.minBelly)}</td></tr>`).join("");
const s3Rows = Object.entries(s3.cases).map(([k, c]) => { const r = c.recipient; return `<tr><td>${k}</td><td>${c.cond.speed} m/s, line ${c.cond.lateral >= 0 ? "+" : ""}${c.cond.lateral} m</td><td><code>${c.hash}</code></td><td>${f2(c.firstContactS, 3)} ${esc(c.firstPair.join(", "))}</td><td>${f2(c.crossImpulseHorizNs, 0)} (${f2(c.horizWithin02sNs, 0)})</td><td>${f2(c.crossImpulseVertNs, 0)}</td><td><b>${r.cls}</b></td><td>${r.fallAfterContactS != null ? f2(r.fallAfterContactS) + " s" : "–"}</td><td>${f2(r.footDispPkM.L)} / ${f2(r.footDispPkM.R)}</td><td>${r.footOffTurfS.L != null ? f2(r.footOffTurfS.L) : "–"} / ${r.footOffTurfS.R != null ? f2(r.footOffTurfS.R) : "–"}</td><td>${r.fallDirAlongSweep != null ? f2(r.fallDirAlongSweep) : "–"}</td><td>${r.slicedOutSignature ? "<b>yes</b>" : "no"}</td><td>${f2(c.integrity.maxHardExcDeg, 1)} / ${f2(c.integrity.maxTurfPenMm, 1)}</td></tr>`; }).join("");
const css = `:root{--bg:#0d1210;--fg:#e6eee9;--mut:#9fb3a9;--card:#151d19;--line:#26332d;--acc:#7fe0a6;--warn:#ffcf7a;--bad:#ff8f80}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f8f7;--fg:#13201a;--mut:#4d6157;--card:#fff;--line:#d6e0db;--acc:#16794a;--warn:#8a5a00;--bad:#b3261e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:20px 16px 80px}h1{font-size:26px;margin:4px 0 6px}h2{font-size:20px;margin:38px 0 10px;border-top:1px solid var(--line);padding-top:22px}h3{font-size:16px;margin:22px 0 6px}
p,li{max-width:1100px}.mut{color:var(--mut)}.verdict{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 18px;font:600 14px/1.8 ui-monospace,Menlo,monospace;white-space:pre;overflow-x:auto}
.tw{overflow-x:auto;margin:10px 0}table{border-collapse:collapse;font-size:13px;min-width:640px}th,td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}th{background:var(--card)}
.vid{margin:14px 0 22px}.vid video{width:100%;max-width:1500px;background:#000;border-radius:6px;display:block}.vid figcaption{margin-bottom:6px}.cap{color:var(--mut);font-size:13px;margin:6px 0 0}
.tog button{font:600 12px -apple-system,Helvetica;margin-left:6px;padding:3px 9px;border-radius:5px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.tog button.on{background:var(--acc);color:#06140c;border-color:var(--acc)}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:12px 0}.ok{color:var(--acc)}.warn{color:var(--warn)}.bad{color:var(--bad)}code{font-size:12.5px}
nav a{color:var(--acc);margin-right:12px;font-size:13px}.miss{display:none;color:var(--warn);font-size:13px;margin:6px 0 0}.vid.nofile .miss{display:block}.vid.nofile video{display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:12px}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SLIDE-PHYS-1 Review</title><style>${css}</style></head><body><main>
<h1>SLIDE-PHYS-1: a physical slide tackle</h1>
<p class="mut">14 Oct 2026, worktree <code>physical-character-v2</code>. The full answers to the 40 questions are in <code>slide_phys1/SLIDE_PHYS1_REPORT.md</code>; every generation, search and variant is in <code>SLIDE_PHYS1_LOG.md</code>. All character videos are rendered from recorded simulation states: nothing is re-simulated, interpolated or posed. They use the frozen RUN-1 viewer, its gameplay camera and pitch, and the MC-1P "gabriel" mesh on the V2 joints.</p>
<nav><a href="#verdict">Verdict</a><a href="#watch">Watch first</a><a href="#s1">Stage 1</a><a href="#s2">Stage 2</a><a href="#s3">Stage 3</a><a href="#failed">Failed evidence</a><a href="#next">Decisions</a><a href="#files">Files</a></nav>
<h2 id="verdict">Verdict</h2>
<div class="verdict">REFERENCE MOTION UNDERSTOOD:                    YES
SINGLE-PLAYER PHYSICAL SLIDE:                   PARTIAL
GROUND ENTRY AND SLIDE:                         PARTIAL
PHYSICAL INTERRUPTIBILITY:                      PARTIAL
TWO-PLAYER CONTACT (IF RUN):                    PARTIAL
SLICED-OUT RESPONSE EMERGES WITHOUT SCRIPTING:  PARTIAL
READY FOR NEXT INTEGRATION MILESTONE:           NO
RECOMMEND FOR CANONICAL V2:                     NOT YET</div>
<div class="box"><p><b>In one paragraph.</b> K is replaced by SP1, a tackler driven only through its own muscles (M1c on the tackler; C3 stays on M1b) and real contacts.</p>
<p><b>What works:</b></p>
<ul><li>It starts from a joint-consistent running plant-foot touchdown at 4.5–5.5 m/s.</li>
<li>It keeps the run's momentum (4.9 m/s) through the plant and a short ballistic flight, then lands on the fold thigh at ≈ 3.7 m/s horizontal and −1.7 m/s vertical.</li>
<li>It sits back onto a posting forearm, with no belly-flop, no hover and no phasing.</li>
<li>Ledgers close; runs are deterministic.</li>
<li>Obstacles fold its tackling leg (up to 131° at the knee) without ever being penetrated (≤ 1.2 mm).</li>
<li>Against unchanged C3, the STRONG line produced a <b>sliced-out fall that was not scripted</b>: the near foot was swept 1.5 m along the sweep and left the turf before the pelvis dropped, and the recipient fell along the sweep over the slider.</li></ul>
<p><b>What doesn't:</b></p>
<ul><li class="warn">The tackling heel lands first, as a strut. The tackling ankle inverts 13.5° past its hard limit, and the slide brakes to a stop within ≈ 0.5 m.</li>
<li class="warn">The slide's pitch balance depends on that leg pressing the turf. Lifting the leg fixes the ankle but the body falls back.</li>
<li class="warn">A5's whole-body fallback never fired.</li>
<li class="warn">There is no graded spectrum. LIGHT still delivered 263 N·s, and GRAZE was absorbed only because the slider's boots pressed the recipient's boots down (the PVP-0 statue mechanism).</li></ul></div>

<h2 id="watch">1 · Watch first: reference beside our result</h2>
<p>Left: the reference, from the commit (segment 2, the R1 bent-leg slide). Middle: <b>INTENT</b>, the authored joint targets drawn by V2 forward kinematics on the recorded pelvis; not simulated, so it may penetrate the turf. Right: <b>PHYSICAL</b> SP1 at 5.0 m/s. Turf contacts are marked: boot yellow, body red, forearm blue.</p>
${vid("REFERENCE | INTENT | PHYSICAL", rates("CMP_SOLO", true), "Real time is 1×. The reference approaches far slower (≈ 1–2.5 m/s, INFERRED) than SP1 (5 m/s, the literature / sim speed), and its slide is equally short (≈ 0.4–0.8 m). Look for: the plant and fold, the tackling thigh driving through, the sit-back, and the posting hand. The difference: SP1's tackling heel lands first and the stop is abrupt.", { local: true })}
${vid("REFERENCE RESPONSE | BEST TWO-PLAYER (STRONG): subject crop ×5 · close front ¾", rates("CMP_TWO_STRONG", true), "The reference's segment 1 (the dribbler swept, pitching forward onto his hands) beside STRONG. Our recipient is unchanged C3. The fall emerges from the contact; nothing scripts it. Ours is slower: pelvis 0.15 m down 1.14 s after contact.", { local: true })}
<p class="mut">If the two composites above don't play, they are missing on this machine (they contain third-party footage and are not in Git). The same SP1 and STRONG renders without the reference are in sections 2 and 4.</p>

<h2 id="s1">2 · Stage 1: the tackler alone (SP1, A5 authority, M1c tackler, TCF-1 sole rule)</h2>
${vid("INTENT | PHYSICAL, close side", rates("SP1_IP"), "SP1 at 5.0 m/s. The intent's tackling knee follows the actual hip angle (proprioceptive coupling), so the ghost shows what was commanded at each moment.")}
${vid("Touchline gameplay camera · same camera ×5 · close front ¾ with contacts", rates("SP1_GAME"), "Our actual Touchline camera and field. The crop is the same camera (zoomed), not a new viewpoint.")}
${vid("Robustness: 4.5 · 5.0 · 5.5 m/s", [["1×", "video/SP1_SPEEDS_1x.mp4"], ["0.25×", "video/SP1_SPEEDS_025x.mp4"]], "The same parameters and the same controller; only the run speed of the committed entry changes.")}
<h3>Measured, all five speeds (A5)</h3>
<div class="tw"><table><thead><tr><th>run m/s</th><th>hash</th><th>ground entry s</th><th>v<sub>h</sub> at entry</th><th>v<sub>y</sub> at entry</th><th>|v<sub>y</sub>|/v<sub>h</sub></th><th>slide m</th><th>stop s</th><th>peak GRF BW</th><th>hard-limit excess ° (constraint)</th><th>turf pen. mm</th><th>min belly-normal y</th><th>CPU ms/step</th></tr></thead><tbody>${spRows}</tbody></table></div>
<p class="mut">Ground entry = first non-foot turf contact (fold thigh at every speed). The hard-limit excess is the tackling ankle's inversion at the heel strike (Q23). At 5.25 m/s the slider lies back until the head rests on the turf at 1.31 s (0.6 m/s at contact). Determinism: 5.0 rerun → <code>8f2fbbf0bed38c95</code> twice.</p>
<h3>COM velocity through the action (5.0 m/s)</h3>
<div class="tw"><table><thead><tr><th>t s</th><th>v<sub>h</sub> m/s</th><th>v<sub>y</sub> m/s</th><th>|v<sub>y</sub>|/v<sub>h</sub></th><th>COM height m</th></tr></thead><tbody>${vRows}</tbody></table></div>
<h3>Ground contact per body (5.0 m/s)</h3>
<div class="tw"><table><thead><tr><th>body</th><th>peak at s</th><th>peak BW</th><th>vertical impulse N·s</th><th>tangential impulse N·s</th><th>horiz/vert at peak</th><th>max horiz/vert (loaded)</th><th>max slip m/s</th></tr></thead><tbody>${gRows}</tbody></table></div>
<p class="mut">The contact sequence is: plant boot 0 → tackling heel 0.367 → fold thigh 0.462 → fold shank 0.525 → pelvis 0.746 → forearm 0.821. The reference and the literature put the fold knee/shin first. Contact normals are within 0° of vertical. Ledgers after the activation write (398 N·s, the documented entry): linear residual 0, angular ≤ 0.1 N·m·s per step, turf work ${f2(r5.ledger.turfWorkJ, 0)} J, solver energy created ${f2(r5.ledger.energyCreatedSumJ)} J in total.</p>

<h2 id="s2">3 · Stage 2: obstacles in the tackling leg's path</h2>
${vid("O1 light 3 kg · O2 moderate 15 kg · O4 immovable · O5 static wall", [["1×", "video/ST2_1x.mp4"], ["0.25×", "video/ST2_025x.mp4"]], "SP1 at 5.0 m/s; the box sits 0.35 m ahead of the boot's touchdown point. The obstacle is drawn as an overlay hull (orange = dynamic, grey = static).")}
<div class="tw"><table><thead><tr><th>case</th><th>obstacle</th><th>hash</th><th>first hit</th><th>|J| N·s</th><th>max depth mm</th><th>knee / hip / ankle deflection °</th><th>post-hit rms error °</th><th>fallback</th><th>slide m</th><th>head</th><th>min belly</th></tr></thead><tbody>${s2Rows}</tbody></table></div>
<p class="mut">Contacts always win: obstacle depth ≤ 1.2 mm. The tackling leg yields: the knee is folded 128–131° by the 60 kg and immovable boxes. The whole-body fallback never fired, because post-hit rms error peaked at 28.5° against a 30° threshold. The local yield is active on some tackling-leg axis in every step of the normal slide. Both need regional, disturbance-relative triggers. After a light or moderate hit the body falls back or rolls: the slide's balance margin is thin.</p>

<h2 id="s3">4 · Stage 3: unchanged C3 × SP1</h2>
<p>The tackler crosses from the recipient's left (travelling −z); its boot meets the line 0.08 s after its own touchdown, i.e. while sliding, not stamping. Placement uses the tackler-alone reference. Nothing about the outcome is scripted.</p>
${["STRONG", "MODERATE", "LIGHT", "GRAZE"].map(c => vid(`${c}: touchline camera · ×5 · close front ¾`, rates(`ST3_${c}`), { STRONG: "Near foot swept 1.52 m along the sweep and off the turf before the pelvis drops: the sliced-out signature. The recipient falls over the slider, along the sweep.", MODERATE: "The slider is stopped by the near boot and rolls forward onto its hands (as the reference slider does). The recipient stands over its legs ≈ 1.3 s, then trips and lands across its back.", LIGHT: "Grazing line, but the boot still stops on the boot: 263 N·s horizontal. The recipient is displaced, stands ≈ 1.2 s, then falls against the sweep.", GRAZE: "Added after LIGHT. Only the boot tips can meet. ABSORBED — but because the slider stops against the boots with its boots pressing them down (−182 N·s vertical on the recipient): PVP-0's statue mechanism." }[c])).join("\n")}
<div class="grid">${["MODERATE", "LIGHT", "GRAZE"].map(c => vid(`REFERENCE RESPONSE | ${c}`, rates(`CMP_TWO_${c}`, true), "Composite with the reference (local only).", { local: true })).join("")}</div>
<div class="tw"><table><thead><tr><th>case</th><th>line</th><th>hash</th><th>first contact (s after activation)</th><th>horizontal impulse on recipient N·s (first 0.2 s)</th><th>vertical N·s</th><th>recipient</th><th>fall after contact</th><th>foot disp. L / R m</th><th>foot off turf L / R s</th><th>fall direction along sweep</th><th>sliced-out signature</th><th>max hard-excess ° / turf pen. mm</th></tr></thead><tbody>${s3Rows}</tbody></table></div>
<p class="mut">The CALIB twin (tackler 10 m clear) keeps the recipient standing (pelvis 0.912 → 0.913 m). SUPPORT-1's recipient falls from ≈ 48–80 N·s of horizontal momentum, so LIGHT, MODERATE and STRONG were all far past that threshold: a slider stopped by a boot hands over its momentum. Equal-and-opposite is exact (dJ = dH = 0). System residual after activation ≤ 0.0003 N·s / 0.085 N·m·s. Each 1300-step two-character run takes 3.0 s wall time.</p>

<h2 id="failed">5 · Failed evidence (preserved)</h2>
${vid("G25 (rejected): hold the tackling thigh up · 5.0 · 5.5; and SP1 at 5.25", [["1×", "video/G25_REJECTED_1x.mp4"], ["0.25×", "video/G25_REJECTED_025x.mp4"]], "Holding the leg up fixes the ankle overload, but removes the slide's only pitch control, the leading-leg press. At 5.0 the body falls back (head 1.25 s); at 5.5 it rolls face-down. Trunk counter-flexion and a new seat objective through the fold hip did not rescue it, because the fold hip is already at its limit. All variants are in <code>evidence/G25_variants_log.txt</code>.")}
<div class="grid">${[["G20", "G20: predictive coupling → kneeling lunge, chest dive, prone"], ["G22", "G22: ahead-gated press → knee slide, then tip-over"], ["G23", "G23: roll to the fold side → the first slide-like entry, then over-roll"], ["G24", "G24: less roll → worse (chaotic sensitivity)"], ["S1_5", "Search 1 best → the first credible bent-leg slide"], ["S2_5", "Search 2 best → SP1"]].map(([k, t]) => vid(t, [["1×", `video/generations/${k}.mp4`]], "Close side + front ¾ (generation test render).")).join("")}</div>
<p>All the rest are recorded with their lessons in the log: G1–G19, the S3–S5 searches (logs in <code>evidence/</code>), authority models A1–A3, and the K/L audit. Their records are outside Git, with SHA-256 sums.</p>

<h2 id="next">6 · What needs your decision (stop condition B), and what remains</h2>
<ol><li><b>Slide pitch control.</b> A whole-body (centroidal / seated-balance) controller that does not need the tackling leg to press the turf. This is the same class of problem as BALANCE-3's coordination: a new controller class, not a parameter.</li>
<li><b>Adopt M1c</b> (athletic shortening force; M1b gives ≈ 0 N·m above 4–5 rad/s) and <b>TCF-1</b> (studs only when the sole faces the turf) for V2, or not.</li>
<li><b>Regional, disturbance-relative</b> yield and fallback triggers.</li></ol>
<p class="mut">Then: fold knee/thigh before the tackling heel (no strut, no ankle overload); a glide; robustness above 5.25 m/s and at the reference's slower approach; the mirrored side; get-up. Integration: a RUN-1 hand-over module (Q7, Q37); a sim → physics placement and timing layer; recipient protective stepping; resolving the sim/physics slide-length mismatch (≈ 2.3 m vs 0.4–1.1 m); cost at scale. CPU is ≈ 0.75 ms per 240 Hz step per character at runtime, plus 0.21 ms of development-only ledgers.</p>

<h2 id="files">7 · Files</h2>
<ul><li><b>Scripts:</b> <code>slide_phys1/scripts/</code>. The final tackler is <code>sp_param.makeCand(toPhys(evidence/sp1/SP1_u.json))</code> + <code>sp_authority</code> A5. Also <code>sp_stage2.mjs</code>, <code>sp_stage3.mjs</code>, <code>sp_stage3_analyze.mjs</code>, <code>sp_report1.mjs</code>, <code>sp_climits.mjs</code>.</li>
<li><b>Evidence:</b> <code>slide_phys1/evidence/</code>: <code>sp1/</code> (parameters, entry, per-speed reports, limit audits), <code>stage2/</code>, <code>stage3/</code>, search logs, M1b/M1c force–velocity, generations.</li>
<li><b>Outside Git:</b> <code>_preserved_2026-10-13_evidence_outside_git/slide_phys1/</code> (reference video, pose data, all records + <code>SHA256SUMS_final.txt</code>), and <code>review/local_reference/</code> (composites).</li></ul>
<p class="mut">Built by <code>slide_phys1/render/sp_review_build.mjs</code> from the committed evidence.</p>
</main><script>
document.querySelectorAll(".tog").forEach(t=>t.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const f=t.closest("figure"),v=f.querySelector("video"),tm=v.currentTime,pl=!v.paused;f.classList.remove("nofile");v.src=b.dataset.src;v.addEventListener("loadedmetadata",()=>{v.currentTime=Math.min(tm,v.duration||tm);if(pl)v.play();},{once:true});t.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));}));
document.querySelectorAll("figure.local video").forEach(v=>v.addEventListener("error",()=>v.closest("figure").classList.add("nofile")));
</script></body></html>`;
fs.writeFileSync(OUT, html); console.log("wrote", OUT, html.length, "bytes");

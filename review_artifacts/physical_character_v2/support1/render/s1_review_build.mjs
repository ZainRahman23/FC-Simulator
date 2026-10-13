// SUPPORT-1 review page builder: writes support1/review/S1_REVIEW.html from the committed evidence (S1_SUMMARY.json, S1_COMPARE.json, S1_CPU.json)
// and the rendered videos / stills in support1/review/{video,frames}. Presentation only.
// usage (worktree root): node .../s1_review_build.mjs
import fs from "fs"; import path from "path";
const RA = decodeURIComponent(new URL("../../", import.meta.url).pathname), D = path.join(RA, "support1"), J = (f) => JSON.parse(fs.readFileSync(path.join(D, "evidence", f)));
const SUM = J("S1_SUMMARY.json"), CMP = J("S1_COMPARE.json").cands, CPU = J("S1_CPU.json"), VID = new Set(fs.readdirSync(path.join(D, "review/video"))), FR = new Set(fs.readdirSync(path.join(D, "review/frames")));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const vid = (id, title, cap, alt = ["clean", "diag"]) => { const a = alt.map(v => `${id}_${v}.mp4`).filter(f => VID.has(f)); if (!a.length) return `<p class="miss">missing video ${esc(id)}</p>`;
  return `<figure class="vid"><figcaption><b>${esc(title)}</b>${a.length > 1 ? ` <span class="tog">${a.map((f, i) => `<button data-src="video/${f}"${i ? "" : ' class="on"'}>${i ? "diagnostic" : "clean"}</button>`).join("")}</span>` : ""}</figcaption><video controls loop muted playsinline preload="metadata" src="video/${a[0]}"></video>${cap ? `<p class="cap">${cap}</p>` : ""}</figure>`; };
const img = (f, cap) => (f.startsWith("../") ? fs.existsSync(path.join(D, "review", f)) : FR.has(f)) ? `<figure class="still"><img loading="lazy" src="${f.startsWith("../") ? f : "frames/" + f}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>` : "";
const tbl = (head, rows) => `<div class="tw"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const cls = (c) => Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · "), tr = (t) => Object.entries(t).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
const P = SUM.pvp0, pin = (c) => (P[c].downwardPins || []).map(p => `${p.pair.replace("<", " ← tackler ")}: ${p.downNs} N·s down`).join("<br>") || "–";
const cands = ["V2", "C3SC", "C3UR", "LDG", "LDG_C3UR"], R = SUM.regress;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUPPORT-1 Review</title>
<style>
:root{--bg:#0d1210;--fg:#e6eee9;--mut:#9fb3a9;--card:#151d19;--line:#26332d;--acc:#7fe0a6;--warn:#ffcf7a;--bad:#ff8f80}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f8f7;--fg:#13201a;--mut:#4d6157;--card:#fff;--line:#d6e0db;--acc:#16794a;--warn:#8a5a00;--bad:#b3261e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:20px 16px 80px}h1{font-size:26px;margin:4px 0 6px}h2{font-size:20px;margin:38px 0 10px;border-top:1px solid var(--line);padding-top:22px}h3{font-size:16px;margin:22px 0 8px}
p,li{max-width:1100px}.mut{color:var(--mut)}.verdict{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 18px;font:600 14px/1.8 ui-monospace,Menlo,monospace;white-space:pre;overflow-x:auto}
.tw{overflow-x:auto;margin:10px 0}table{border-collapse:collapse;font-size:13px;min-width:640px}th,td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}th{background:var(--card)}
.vid{margin:14px 0 22px}.vid video{width:100%;max-width:1500px;background:#000;border-radius:6px;display:block}.vid figcaption{margin-bottom:6px}.cap{color:var(--mut);font-size:13px;margin:6px 0 0}
.tog button{font:600 12px -apple-system,Helvetica;margin-left:6px;padding:3px 9px;border-radius:5px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.tog button.on{background:var(--acc);color:#04130b;border-color:var(--acc)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}.still img{width:100%;border-radius:6px}.still figcaption{font-size:12px;color:var(--mut)}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:12px 0}.ok{color:var(--acc)}.warn{color:var(--warn)}.bad{color:var(--bad)}code{font-size:12.5px}
nav a{color:var(--acc);margin-right:12px;font-size:13px}
</style></head><body><main>
<h1>SUPPORT-1: receiver support release</h1>
<p class="mut">Overnight research run, 13 Oct 2026. Worktree <code>physical-character-v2</code>. The full answers are in <code>support1/S1_REPORT.md</code>. Every video is a matched, synchronised record: one recorded 1/240 s step per frame at 0.25×, every 4th at 1×. Each has a clean view and a diagnostic view (button above it). The reference video could not be opened (it is in a protected macOS temporary folder), so the visual target here is taken from your written description and the literature.</p>
<nav><a href="#verdict">Verdict</a><a href="#audit">PVP-0 audit</a><a href="#lit">Evidence</a><a href="#lab">Lab: spectrum</a><a href="#dirs">Directions and loading</a><a href="#replay">PVP-0 replays</a><a href="#cands">Candidates</a><a href="#regress">Regression</a><a href="#slider">Exploratory two-body</a><a href="#upper">Upper body</a><a href="#det">Determinism, CPU and limits</a></nav>
<h2 id="verdict">Verdict</h2>
<div class="verdict">SUPPORT-RELEASE MECHANICS UNDERSTOOD:          YES
BEST RECIPIENT RESPONSE PHYSICALLY PLAUSIBLE:  PARTIAL
ORDINARY STANDING/TRACTION REGRESSIONS:        PASS
MATERIAL VISUAL IMPROVEMENT OVER PVP-0:        NO
RECOMMEND FOR CANONICAL V2:                    NOT YET</div>
<p class="mut">On the fourth line: no recipient successor is materially better than the current V2 under matched disturbances. The large visual difference from PVP-0 (sections 3 and 8) is produced by the same unchanged recipient once the disturbance sweeps along the ground instead of pinning from above.</p>
<div class="box"><b>In one paragraph.</b> The PVP-0 recipient looked anchored mainly because the PVP-0 tackler <b>pinned the feet from above</b>. It also delivered little ground-level sweeping momentum.
<ul><li><b>LIGHT:</b> its boot pressed down on the struck foot, 334 N·s downward over 2 s. The far foot never needed friction: its demand peaked at 0.17 of its load, against 1.2 available.</li><li><b>NOMINAL:</b> the struck foot was swept 0.52 m, then crushed under the tackler at 7.2 kN.</li><li><b>HEAVY:</b> the tackler's thigh landed on the far foot, with 2.4 kN downward during a 4.6 kN hit.</li></ul>
<p>Turf friction was not too high. Measured studded-boot traction is higher than V2's μ 1.2 at standing loads, about 1.9–2.7, and rotational traction and ankle compliance are realistic.</p>
<p>Under clean ground-level sweeps the <b>unchanged V2 recipient</b> already produces the whole spectrum: absorbed, displaced and recovered, and fast "sliced-out" falls with both feet swept out from under the centre of mass. An exploratory articulated sliding body at 6.7 m/s reproduces that sliced-out fall in the two-body world.</p>
<p>Four successors were tested. None improved the reaction without a cost:</p>
<ul><li><b>C3-SC and C3-UR</b> (controllers) make the struck leg yield more, but turn recoveries into slow falls, because the body cannot step.</li><li><b>LDG</b> (evidence-fitted traction) makes planted feet harder to sweep.</li></ul>
<p>The deeper missing pieces:</p>
<ul><li>a tackler that physically slides and carries its momentum along the ground;</li><li>dynamic, single-support recipients (running players);</li><li>stepping and protective responses for the moderate band, where V2 now topples slowly like a mannequin.</li></ul></div>

<h2 id="audit">1 · Why PVP-0 looked anchored (audit of the PVP-0 records)</h2>
<p>Every recipient foot was reconstructed per step from the Jolt manifolds in the existing LIGHT, NOMINAL and HEAVY records: normal load, shear, friction demand against μN, centre of pressure, slip velocity, roll/pitch/yaw, joint torques and the tackler's contact forces. Evidence: <code>S1_PVP0_FEET.json</code>, <code>S1_PVP0_CROSS.json</code>.</p>
${tbl(["case", "struck (left) foot", "far (right) foot", "tackler pressing DOWN on the recipient's feet (integrated, 0.125–2 s)"], ["LIGHT", "NOMINAL", "HEAVY"].map(c => [c,
  `slip ${P[c].struck.slipMm} mm · peak load ${P[c].struck.peakN} N · max roll ${P[c].struck.maxRollDeg}° · unload ${P[c].struck.unloadS ?? "never"} s`,
  `slip ${P[c].far.slipMm} mm · <b>peak friction demand ${P[c].far.peakRatio}</b> of μ 1.2 · peak load ${P[c].far.peakN} N · roll ${P[c].far.maxRollDeg}° · unload ${P[c].far.unloadS ?? "never"} s`, pin(c)]))}
<ul><li><b>LIGHT statue.</b> The far foot was never asked to move: its demand peaked at 0.17 of the 1.2 available. The struck foot was held under the tackler's boot. A friction coefficient as low as 0.2 would still have held the far foot, so friction is not the cause.</li>
<li><b>NOMINAL sit-down.</b> Support release did happen: the struck foot was swept 0.52 m, across and past the far foot. It was then crushed under the belly-flopped tackler, peaking at 7.2 kN, while the far foot carried the body. With no step available, the recipient sat down onto the tackler.</li>
<li><b>HEAVY flip.</b> The struck foot was swept 1.04 m. The tackler's thigh then landed on the far foot (2.4 kN of the 4.6 kN contact was downward), which rolled 44° onto its edge and was pinned. The recipient pivoted over it and was flipped by the tackler's raised leg.</li>
<li><b>Owners, in order:</b> TACKLER CONTACT GEOMETRY (pinning from above, no sweep along the ground); BODY MASS and INERTIA plus legitimately loaded far-foot traction (correct physics); C3 BALANCE CONTROL (cannot step); FOOT/TURF TRACTION only at the margin (the far foot saturated briefly at 1.84 kN / 3.8 kN loads, both inflated by the tackler); not COLLIDER GEOMETRY, not the SOLVER, not ANKLE PASSIVE MECHANICS.</li></ul>
<div class="grid">${img("../../pvp0/review/frames/KL_NOMINAL_k186.png", "PVP-0 NOMINAL (existing still): the struck foot trapped under the tackler")}${img("../../pvp0/review/frames/KL_HEAVY_k186.png", "PVP-0 HEAVY (existing still)")}</div>

<h2 id="lit">2 · What football and human evidence says</h2>
<p>The full review, with sources and verification status, is in <code>support1/research/S1_LITERATURE.md</code>. Three numbers were spot-checked against the saved source texts.</p>
${tbl(["quantity", "evidence", "V2 today", "conclusion"], [
  ["translational traction (studded boot)", "≈ 1.9–2.7 at 0.2–0.45 kN; 0.91–0.94 at ≈ 2 kN (Blackburn 2012; verified)", "μ 1.2 flat", "V2 is <b>lower</b> than reality at standing loads, so lowering it is not supported"],
  ["rotational traction", "FIFA 25–50 N·m at 450 N; natural grass 28–59 N·m at 580 N", "flat 10-piece boot ≈ 42 N·m at 725 N (μ 1)", "realistic"],
  ["ankle inversion stiffness", "0.99 ± 0.41 N·m/deg passive (Jain 2016; verified)", "0.51–0.86 N·m/deg (M1b short-range stiffness in standing)", "realistic; V2's struck foot rolls about 30° in about 60 ms (≈ 500°/s; real sprains 400–1260°/s)"],
  ["reflex and balance latencies", "peroneal 54–69 ms; automatic postural 73–110 ms; step ≥ 300 ms", "C3: 100 / 75 / 30 ms channels", "release happens passively before C3 can act"],
  ["support state in real tackles", "78 % one foot down, 87 % loading the struck leg (140 elite sprains)", "PVP-0: standing, both feet loaded", "PVP-0 tested the least sweepable configuration"],
  ["one vs two supports lost", "0 / 28 falls for a one-foot slip, 6 / 28 for a two-foot slip", "–", "sliced-out = both supports gone (struck foot swept while the other is unloaded or also swept)"]])}

<h2 id="lab">3 · The support-release laboratory: the current recipient under controlled sweeps</h2>
<p>This is the PVP-0 recipient exactly (frozen C3 on canonical M1b, frozen contact model), alone in the frozen PVP-1A world (solo mode). It is struck by a recorded dynamic impactor of stated mass, speed, height and direction, parked until launch, with ordinary Jolt contact. Its impulse is ledgered as external. There are 341 runs per candidate, in six families:</p>
<ul><li>floating bars: 6 directions × 4 heights × 4 masses × 3 speeds;</li><li>ground-sliding bodies;</li><li>force pulses: impulse × duration × height;</li><li>support-loading preloads of ±40 N;</li><li>PVP-0 force replays.</li></ul>
<p>Twin hash 8ef0ed97f8abe751, identical on rerun.</p>
${vid("SPEC_1x", "Spectrum at 1×: LOW · MODERATE · MODERATE+ · HEAVY (lateral, shin height)", "LOW (16 N·s): absorbed. MODERATE (80 N·s): the struck foot slides about 14 cm and he recovers. MODERATE+ (80 N·s at a higher speed): the struck foot is swept 37 cm under the body, the far foot is struck and lifts, and he topples slowly over the swept foot (fall at 0.88 s). HEAVY (160 N·s): both feet swept 0.9 and 0.5 m within 0.25 s while the COM moves 8 cm, a sliced-out fall at 0.32 s.")}
${vid("SPEC_q", "Spectrum at 0.25×", "")}
<div class="grid">${vid("CLOSE_HEAVY_q", "Close-up, HEAVY, 0.25×", "")}${vid("CLOSE_MODF_q", "Close-up, MODERATE+, 0.25×", "")}</div>
<h3>Where falls begin (current V2, floating-bar grid)</h3>
${tbl(["direction · contact height", "lowest momentum that falls (N·s)", "lowest momentum that falls in < 0.5 s (N·s)"], Object.entries(SUM.labV2.fallOnset).map(([k, v]) => [k.replace("_h", " · ") + " cm", v.lowestFallingMomentumNs ?? "–", v.lowestFastFallMomentumNs ?? "–"]))}
<p class="mut">The classes are measured, not imposed. ABS: no foot moved more than 2 cm and the COM moved less than 5 cm. DISP: displaced and recovered. FAST: fall in under 0.5 s. SLOW: fall at 0.5 s or later. Of the current V2's falls, ${CMP.V2.fallsSlicedMidHinged.sliced} are <b>sliced</b> (the feet move more than the COM along the disturbance by the time the pelvis has dropped 10 cm), ${CMP.V2.fallsSlicedMidHinged.mid} intermediate and ${CMP.V2.fallsSlicedMidHinged.hinged} <b>hinged</b> (the feet stay while the COM goes).</p>

<h2 id="dirs">4 · Other directions, a sliding body, support loading</h2>
${vid("DIR_1x", "PVP-0 direction · from the right · from behind (side view) · ground-sliding body", "")}
${vid("DIR_q", "The same at 0.25×", "")}
<div class="box"><b>Support loading</b> (±40 N pelvis preload; a larger ±60 N preload toppled the twin by itself, a C3 lateral-lean limit). <b>Weight on the far foot</b> (struck foot at about 26 %): even a 32 N·s sweep carries the struck foot about 1.1 m, and the body topples slowly (1.4–1.9 s) over the loaded far foot, which barely moves. That is the hinge. <b>Weight on the struck foot</b> (74 %): a 66 N·s sweep takes both feet and he falls in 0.59 s, sliced out. This is the evidence pattern: tackles usually land on the loaded stance leg.</div>

<h2 id="replay">5 · PVP-0's recorded tackler forces replayed on the lab recipient</h2>
<p>The per-step cross-contact force on each recipient body is applied at the recorded point, open-loop, without the tackler body. It is valid while the recipient stays close to PVP-0's motion. FULL replays the forces as recorded. STRIKE keeps only the first 100 ms. HORIZONTAL removes the downward component only.</p>
${vid("REPL_1x", "LIGHT: FULL · STRIKE · HORIZONTAL", "FULL reproduces the statue: the struck foot moves 7 cm and he recovers. Removing only the downward part releases the foot and he falls. The open-loop push then exaggerates the sweep, but the sign of the effect is unambiguous.")}
${vid("REPN_1x", "NOMINAL: FULL · STRIKE · HORIZONTAL", "")}
${vid("REPH_1x", "HEAVY: FULL · STRIKE", "")}
<div class="grid">${vid("REPL_q", "LIGHT at 0.25×", "")}${vid("REPN_q", "NOMINAL at 0.25×", "")}${vid("REPH_q", "HEAVY at 0.25×", "")}</div>

<h2 id="cands">6 · Experimental successors (baseline → hypothesis → change → result → conclusion)</h2>
${tbl(["id", "diagnosed mechanism / hypothesis", "change (generic, evidence)", "result over the matched sweep", "conclusion"], [
  ["V2 (baseline)", "–", "the PVP-0 recipient unchanged", `${cls(CMP.V2.classes)}`, "baseline"],
  ["DIAG_TONIC (diagnostic)", "Does C3 artificially preserve support?", "M1b tonic intent only, no controller", "Large sweeps release support and fall within 10–30 ms of C3's timing. The twin cannot stand, so only the fast cases are valid", "<span class=ok>No.</span> Support release is passive and complete within about 150 ms, before C3's 100 ms channels act"],
  ["C3-SC", "C3 commands an unloaded, sliding or rolled leg as a support (a manufactured pivot)", "each leg's stance intent scaled by its own sensed loadability (load, slip, tilt; 50 ms) — load feedback, Dietz & Duysens 2000", `${cls(CMP.C3SC.classes)}<br>changes vs V2: ${tr(CMP.C3SC.transitionsFromV2)}<br>struck knee yield ${CMP.C3SC.meanStruckKneeYield05Deg}° (V2 ${CMP.C3SC.meanStruckKneeYieldV2}°)`, "<span class=warn>Rejected.</span> Slightly more yield and faster falls, but it loses recoveries"],
  ["C3-UR", "humans unload a suddenly inverted or everted foot; V2 lacks that response", "unloading response to sudden ankle rotation (Konradsen & Ravn 1990): 67 ms channel, graded 85–300°/s, stance intent withdrawn, peroneal 30 %", `${cls(CMP.C3UR.classes)}<br>changes vs V2: ${tr(CMP.C3UR.transitionsFromV2)}`, "<span class=warn>Rejected for now.</span> Identical to C3 in ordinary balance (bit-identical standing). In sweeps it mostly turns recoveries into slow falls: unloading needs a step to follow"],
  ["LDG", "the contact model lacks load dependence and turf failure", "μ(N) = 0.718 + 445/N (Blackburn fit, cap 2.7) + a 3 kN natural-grass divot cap", `${cls(CMP.LDG.classes)}<br>changes vs V2: ${tr(CMP.LDG.transitionsFromV2)}`, "<span class=ok>More realistic</span>, and planted loaded feet become <b>harder</b> to sweep (boot-height sweeps mostly held). Not a release mechanism"],
  ["LDG + C3-UR", "combined", "both", `${cls(CMP.LDG_C3UR.classes)}`, "no added benefit"]])}
<h3>Matched comparisons: CURRENT V2 · C3-UR · LDG (identical impactor, start and timing)</h3>
${["LT", "MD", "MP", "HV", "BT"].map(k => vid(`CMP_${k}_1x`, { LT: "LIGHT", MD: "MODERATE", MP: "MODERATE+", HV: "HEAVY", BT: "BOOT-HEIGHT" }[k] + " · 1×", "") + vid(`CMP_${k}_q`, { LT: "LIGHT", MD: "MODERATE", MP: "MODERATE+", HV: "HEAVY", BT: "BOOT-HEIGHT" }[k] + " · 0.25×", "")).join("")}

<h2 id="regress">7 · Regression gates: the frozen BALANCE-2 B2M battery, scored by the frozen B2F criteria</h2>
${tbl(["candidate", "B2F", "failed", "no-step thresholds fwd / back / left / right (N·s)", "60 s standing hash", "determinism"], Object.entries(R).map(([c, r]) => [c, `${r.nPass}/${r.n}`, r.failed.join(", "), `${r.thresholds.fwd} / ${r.thresholds.back} / ${r.thresholds.left} / ${r.thresholds.right}`, `<code>${r.uHash}</code>${r.uHash === "bf92ac5126c188af" ? " = frozen C3" : ""}`, r.det ? "identical" : "<span class=bad>differs</span>"]))}
<p>C3's frozen result is 16/17 (P8 only), with thresholds 12.09 / 20.23 / 25.88 / 26.61 and standing hash bf92ac5126c188af. Every candidate keeps 16/17 with P8 its only failure. The lateral thresholds of C3-SC and LDG move but stay inside the band [21.8, 49.8]. Planted-foot traction for ordinary play is not reduced by any candidate; LDG raises it at standing loads.</p>

<h2 id="slider">8 · Exploratory two-body run (clearly labelled; nothing depends on it)</h2>
<p>This uses the frozen PVP-0 two-character world with the recipient unchanged. The second body is a <b>passive sliding articulated body</b>: the V2 tackler spec in K's authored slide pose (K t 0.85 s; K's slide floats 85 mm above the turf, so it was lowered onto the turf). It holds the pose only with the frozen PVP-1A SnapshotTone and gets one launch velocity. This is not Astra's tackle.</p>
${vid("X_NOM_SL_1x", "PVP-0 NOMINAL (K tracker) vs sliding body at the same 6.74 m/s · 1×", "Left: the K tracker belly-flops and pins the struck foot, so he stays standing over it. Right: the sliding body sweeps both feet, the left 1.0 m and the right 0.75 m, both airborne by 0.2–0.3 s. The pelvis drops 0.92 → 0.55 m by 0.4 s while the COM moves 0.19 m: sliced out, unscripted.", ["mesh", "colliders"])}
${vid("X_NOM_SL_q", "The same at 0.25×", "", ["mesh", "colliders"])}
${vid("X_CLOSE_q", "Close-up from 12 steps before each first contact, 0.25×", "", ["mesh", "colliders"])}
${vid("X_SL5_1x", "Sliding body at 5 m/s, 1×", "It decelerates quickly on its own boot and body friction, so the sweep becomes a slow topple at 0.73 s.", ["mesh", "colliders"])}

<h2 id="upper">9 · Does the upper body follow? (finding, not changed)</h2>
<p>In the HEAVY lateral sweep the pelvis turns 64° in space within 0.6 s, but the thorax only 13°. The spine bends about 64° and the elbows stay almost rigid (3°). With no controller (diagnostic), the thorax turns 35°, so most of the lag is passive inertia, and C3's trunk-orientation-in-space objective holds the upper body nearer vertical. This contributes to the "upper body not carried" look, and it is a controller design question (righting and protective responses), so it was not changed.</p>

<h2 id="det">10 · Determinism, CPU, integrity</h2>
<ul><li><b>Determinism:</b> every candidate's twin and one disturbed run were rerun bit-identically. All regression determinism checks are identical. Clip re-runs reproduce the sweep hashes.</li>
<li><b>CPU</b> (recipient alone, instrumented lab plant, ms per 240 Hz step): ${Object.entries(CPU).map(([c, v]) => `${c} ${v.twin.msPerStep}`).join(" · ")}. Of that, about 0.2 ms is measurement and about 0.35 ms is the Jolt step.</li>
<li><b>Joint limits:</b> the largest anatomical-limit excess is at the swept foot's ankle in inversion, during violent sweeps: about 21° in the lab, 22.5° in the exploratory slider (≈ 57° inversion). That is sprain-range kinematics: football inversion sprains reach a median 70°. PVP-0's maximum was 8.9°. Turf penetration ≤ 11 mm and joint separation ≤ 14 mm (V2). LDG peaks at 39 mm separation in one violent run (flagged).</li>
<li><b>No phasing:</b> impactor and slider contacts are ordinary Jolt contacts. Equal-and-opposite is exact in the slider run.</li></ul>
<p class="mut">Built by <code>support1/render/s1_review_build.mjs</code> from the committed evidence.</p>
</main><script>
document.querySelectorAll(".tog").forEach(t=>t.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const v=t.closest("figure").querySelector("video"),tm=v.currentTime,pl=!v.paused;v.src=b.dataset.src;v.addEventListener("loadedmetadata",()=>{v.currentTime=tm;if(pl)v.play();},{once:true});t.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));}));
</script></body></html>`;
fs.writeFileSync(path.join(D, "review/S1_REVIEW.html"), html); console.log("wrote", path.join(D, "review/S1_REVIEW.html"), html.length, "bytes");

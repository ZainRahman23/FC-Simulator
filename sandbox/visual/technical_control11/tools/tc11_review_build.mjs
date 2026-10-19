// technical_control11/tools/tc11_review_build.mjs — builds review_artifacts/technical_control11/review/TECHNICAL_CONTROL11_REVIEW.html (LOCAL ONLY: the character
// is a real player's model — never published) from the evidence, the clips and the contact strips.   node tc11_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { FEET_SET, labQuery } from "../tc11_cases.js"; import { ROM, SPLIT } from "../tc11_leg.js"; import { LB } from "../tc11_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RA = path.resolve(HERE, "../../../../review_artifacts/technical_control11"), EVP = (f) => path.join(RA, "evidence", f);
const EV = (f) => JSON.parse(fs.readFileSync(EVP(f), "utf8")), OPT = (f) => (fs.existsSync(EVP(f)) ? EV(f) : null);
const SUM = EV("tc11_summary.json"), NEU = OPT("tc11_neutral.json"), CPU = OPT("tc11_cpu.json"), FROZ = fs.existsSync(EVP("frozen_check.txt")) ? fs.readFileSync(EVP("frozen_check.txt"), "utf8").trim().split("\n").pop() : "—";
const has = (rel) => fs.existsSync(path.join(RA, rel)), LAB = "http://127.0.0.1:8361/sandbox/visual/technical_control11.html";
const vid = (rel, cap) => has("clips/" + rel) ? `<figure class="v"><video src="../clips/${rel}" muted loop playsinline preload="metadata" controls></video><figcaption>${cap}</figcaption></figure>` : `<figure class="v miss"><div>not captured: ${rel}</div><figcaption>${cap}</figcaption></figure>`;
const strip = (rel, cap) => has("strips/" + rel) ? `<figure class="s"><a href="../strips/${rel}"><img src="../strips/${rel}" loading="lazy" alt="${cap}"></a><figcaption>${cap}</figcaption></figure>` : "";
const B = SUM.by, R1 = SUM.run1, f0 = (x) => (x == null ? "—" : Math.round(x)), f1 = (x) => (x == null ? "—" : (+x).toFixed(1));
const row = (lab, k, fmt, ref) => `<tr><td>${lab}</td>${["99/99/99", "80/80/80", "50/50/50"].map((rt) => `<td>${fmt(B[rt + " tc1"][k])}</td><td><b>${fmt(B[rt + " tc11"][k])}</b></td>`).join("")}<td class="dim">${ref || ""}</td></tr>`;
const T = `<div class="tw"><table class="m"><tr><th rowspan="2">all 16 review cases (median / worst over the runs)</th>${["99 / 99 / 99", "80 / 80 / 80", "50 / 50 / 50"].map((r) => `<th colspan="2">${r}</th>`).join("")}<th rowspan="2">RUN-1 (the approved running gait), 5.5 · 8 m/s</th></tr>
<tr>${[0, 1, 2].map(() => "<th>TC1 body</th><th>TC1.1 body</th>").join("")}</tr>
${row("ankle angular velocity, p99 (median of runs) °/s", "ankW_p99_median", f0, `${f0(R1[0].ankW.p99)} · ${f0(R1[1].ankW.p99)}`)}
${row("ankle angular velocity, worst frame °/s", "ankW_max", f0, `${f0(R1[0].ankW.max)} · ${f0(R1[1].ankW.max)}`)}
${row("ankle angular acceleration, p99 (median) °/s²", "ankA_p99_median", f0, `${f0(R1[0].ankA.p99)} · ${f0(R1[1].ankA.p99)}`)}
${row("foot yaw relative to the shin, worst °", "footYawShin_max", f1, `${f1(R1[0].yawShin.max)} · ${f1(R1[1].yawShin.max)}`)}
${row("ankle dorsiflexion, worst ° (folding)", "df_max", f1, `${f1(R1[0].df.max)} · ${f1(R1[1].df.max)}`)}
${row("ankle plantarflexion, worst ° (negative)", "df_min", f1, `${f1(R1[0].df.min)} · ${f1(R1[1].df.min)}`)}
${row("inversion, worst °", "inv_max", f1, `${f1(R1[0].inv.max)} · ${f1(R1[1].inv.max)}`)}
${row("eversion, worst ° (negative)", "inv_min", f1, `${f1(R1[0].inv.min)} · ${f1(R1[1].inv.min)}`)}
${row("knee flexion, minimum ° (straight / locked)", "knee_min", f1, `${f1(R1[0].knee.min)} · ${f1(R1[1].knee.min)}`)}
${row("frames with a knee locked straight (< 4°), worst run %", "kneeLock_pct_max", f1)}
${row("hip rotation, range ° (internal −, external +)", "hip_min", (x) => f1(x))}
${row("… maximum °", "hip_max", f1, `${f1(R1[0].hip.min)}…${f1(R1[0].hip.max)}`)}
${row("joint-frames beyond the HARD range, % (summed over joints, median run)", "overHard_pct_median", f1)}
${row("… worst run %", "overHard_pct_max", f1)}
${row("boot inside the ball: swinging-foot frames (all runs)", "ballPen_swing_frames", f0)}
${row("… planted-foot frames (all runs)", "ballPen_planted_frames", f0)}
${row("… deepest, cm", "ballPen_maxCm", f1)}
${row("planted-foot slip at its support point, worst run mm", "slip_mm_max", f1)}
${row("contacts", "contacts", f0)}
${row("boot – ball gap at the contact, worst |cm| (0 = the boot just touches)", "gap_cm_absmax", f1)}
${row("contacts the body could prepare (late decisions excluded)", "prepared", f0)}
${row("… the labelled surface is the boot face that meets the ball", "face_ok", f0)}
${row("… the surface's working direction within its cone of the impulse", "within_tol", f0)}
${row("… surface vs impulse, median °", "oriErr_median", f1)}
${row("… worst °", "oriErr_max", f1)}
${row("the ankle's own rotation in the 50 ms BEFORE a contact, median °", "pre50Ank_median", f1)}
${row("… worst ° (the ankle snapping into the ball)", "pre50Ank_max", f1)}
${row("the ankle's own rotation in the 50 ms AFTER a contact, median °", "post50Ank_median", f1)}
${row("… worst °", "post50Ank_max", f1)}
${row("the toe swinging toward the ball: foot yaw in the 50 ms before, worst °", "pre50Yaw_max", f1)}
${row("… away after: the 50 ms after, worst °", "post50Yaw_max", f1)}
${row("ankle angular velocity within ±100 ms of a contact, worst °/s", "ankWpk_contact_max", f0)}
${row("touching leg's reach at the contact (hip – ankle / leg length), worst", "reach_max", (x) => (+x).toFixed(3))}
${row("support knee at the contact, minimum °", "supKnee_min", f1)}
${row("late decisions (the simulation decided the contact at the contact itself)", "late_decisions", f0)}
</table></div>`;
const caseRows = (k) => SUM.cases.filter((c) => c.key === k).sort((a, b) => b.ratings.localeCompare(a.ratings));
const caseT = (k) => `<table class="m sm"><tr><th>ratings</th><th>ankle ω p99 · worst °/s<br>TC1 → TC1.1</th><th>worst DF °</th><th>min knee °</th><th>beyond hard range %</th><th>boot in ball frames</th><th>slip mm</th><th>late decisions</th><th>worst surface error ° (prepared)</th></tr>
${caseRows(k).map((c) => `<tr><td>${c.ratings}</td><td>${f0(c.tc1.ankW_p99)} · ${f0(c.tc1.ankW_max)} → <b>${f0(c.tc11.ankW_p99)} · ${f0(c.tc11.ankW_max)}</b></td><td>${f0(c.tc1.dfMax)} → <b>${f0(c.tc11.dfMax)}</b></td><td>${f1(c.tc1.kneeMin)} → <b>${f1(c.tc11.kneeMin)}</b></td><td>${f1(c.tc1.overHard)} → <b>${c.tc11.overHard}</b></td><td>${c.tc1.pen} → <b>${c.tc11.pen}</b></td><td>${c.tc1.slip} → <b>${c.tc11.slip}</b></td><td>${c.tc11.late}</td><td>${f1(c.tc11.oriMax)}</td></tr>`).join("")}</table>`;
const flagsOf = (k) => SUM.flags.filter((f) => f.key === k);
const sections = FEET_SET.map((e, i) => `<h3 id="${e.key}">${i + 1} · ${e.label} <span class="dim sm">— ${e.sec}${e.style !== "NEUTRAL" ? " · style " + e.style.toLowerCase().replace(/_/g, " ") : ""} · seed ${e.seed}${e.foot !== "R" ? " · left-footed" : ""} · window ${e.win[0]}–${e.win[1]} s · <a href="${LAB}?${labQuery(e, [99, 99, 99])}&single=quad">open in the lab</a> · <a href="${LAB}?${labQuery(e, [99, 99, 99])}&cmp=body&single=fFoot&rate=0.25">TC1 vs TC1.1</a></span></h3>
<div class="grid">${vid(`${e.key}_99_quad_1x.mp4`, "99 / 99 / 99 · normal speed · front 3/4 · rear 3/4 · side · foot level")}${vid(`${e.key}_99_quad_025x.mp4`, "99 / 99 / 99 · 0.25× (slow motion)")}${vid(`${e.key}_99_cmp_foot_05x.mp4`, "99 · 0.5× · foot level · TECHNICAL-CONTROL-1's body (left) | TECHNICAL-CONTROL-1.1's (right), the same simulation")}${vid(`${e.key}_99_cmp_34_05x.mp4`, "99 · 0.5× · front 3/4 · TC1 body | TC1.1 body")}${vid(`${e.key}_80_quad_05x.mp4`, "80 / 80 / 80 · 0.5×")}${vid(`${e.key}_50_quad_05x.mp4`, "50 / 50 / 50 · 0.5×")}</div>
<div class="grid">${strip(`${e.key}_99_foot.jpg`, "every contact in the window · −83 / −42 / 0 / +42 / +83 ms · foot level (one row per contact)")}${strip(`${e.key}_99_34.jpg`, "… front 3/4")}${strip(`${e.key}_99_cmp.jpg`, "… TC1 body | TC1.1 body, foot level")}</div>
${caseT(e.key)}${flagsOf(e.key).length ? `<p class="sm"><b>Flagged contacts</b> (visually infeasible as scheduled, or at a limit): ${flagsOf(e.key).map((f) => `${f.ratings.split("/")[0]} · ${f.t} s ${f.F} ${f.surface.toLowerCase()}: ${f.why.join("; ")}`).join(" · ")}</p>` : `<p class="sm dim">No flagged contacts.</p>`}`).join("\n");
const romT = `<table class="m sm"><tr><th>joint (anatomical sign)</th><th>hard (never past; soft saturation)</th><th>comfort (where the planner aims)</th></tr>
<tr><td>hip rotation (external +)</td><td>${ROM.hard.hip.join(" … ")}°</td><td>${ROM.comfort.hip.join(" … ")}°</td></tr>
<tr><td>knee flexion</td><td>${ROM.hard.knee.join(" … ")}° (soft extension limit at ${(LB.kMin * 180 / Math.PI).toFixed(0)}°)</td><td>${ROM.comfort.knee.join(" … ")}°</td></tr>
<tr><td>tibial axial rotation (external +), grows with knee flexion</td><td>${ROM.tib(0, false).map((x) => x.toFixed(0)).join(" … ")}° straight → ${ROM.tib(90, false).map((x) => x.toFixed(0)).join(" … ")}° at 90°</td><td>${ROM.tib(0, true).map((x) => x.toFixed(0)).join(" … ")}° → ${ROM.tib(90, true).map((x) => x.toFixed(0)).join(" … ")}°</td></tr>
<tr><td>ankle dorsiflexion (+) / plantarflexion (−)</td><td>${ROM.hard.df.join(" … ")}°</td><td>${ROM.comfort.df.join(" … ")}°</td></tr>
<tr><td>inversion (+) / eversion (−)</td><td>${ROM.hard.inv.join(" … ")}°</td><td>${ROM.comfort.inv.join(" … ")}°</td></tr>
<tr><td>forefoot abduction (toe-out +)</td><td>${ROM.hard.abd.join(" … ")}°</td><td>${ROM.comfort.abd.join(" … ")}°</td></tr></table>
<p class="sm dim">The hard box contains the approved running gait (RUN-1 reaches 31° dorsiflexion in late stance and 18° eversion). Of a foot's yaw relative to the pelvis the hip takes ${Math.round((1 - SPLIT.tib - SPLIT.abd) * 100)} %, the tibia ${Math.round(SPLIT.tib * 100)} %, the forefoot ${Math.round(SPLIT.abd * 100)} % — each saturating in its range, what is left becomes an orientation error (measured).</p>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feet and Ankles Review</title>
<style>:root{--bg:#0e1210;--fg:#e8efe9;--dim:#9fb0a5;--card:#161c18;--line:#2a332d;--acc:#ffd45e;--bad:#ff8a7a}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f7f4;--fg:#18201a;--dim:#5b6a60;--card:#fff;--line:#d9dfd9;--acc:#9a6b00;--bad:#b3261e}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1500px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:8px 0}h2{font-size:18px;margin:28px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:15px;margin:22px 0 6px}
.dim{color:var(--dim)}.bad{color:var(--bad)}.sm{font-size:12px}p,li{max-width:1100px}
.tw{overflow-x:auto}table.m{border-collapse:collapse;margin:8px 0;font-size:12.5px}table.m th,table.m td{border:1px solid var(--line);padding:4px 6px;vertical-align:top;text-align:left}table.m th{background:var(--card)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:10px;margin:6px 0}figure{margin:0}figure.v video{width:100%;background:#000;border-radius:4px}figcaption{font-size:12px;color:var(--dim)}
figure.s img{width:100%;border-radius:4px}.miss div{padding:30px;border:1px dashed var(--line);color:var(--dim)}.note{background:var(--card);border:1px solid var(--line);padding:8px 12px;border-radius:6px}a{color:var(--acc)}</style></head><body><main>
<h1>TECHNICAL-CONTROL-1.1 — feet, ankles and lower-leg IK (focused visual fix; candidate, not frozen)</h1>
<p class="note">LOCAL review page — the character is a real player's model: never published. Feet lab: <a href="${LAB}?case=CUT90&single=quad">${LAB}</a> — views <i>feet: quad · front 3/4 · rear 3/4 · side · foot level</i>, 1× · 0.5× · 0.25× · 0.1×, Body <i>TC1.1 · TC1 · TC1 vs TC1.1</i> (the same simulation side by side), the live joint angles of both legs at the bottom of each view (amber beyond the comfort range, red beyond the hard range). <b>Gameplay is untouched</b>: Ball Control, Dribbling, Agility, touch timing, ball separation, action selection, styles and every authoritative contact are TECHNICAL-CONTROL-1's — with animation off, with TECHNICAL-CONTROL-1's body and with this body the ball every tick, the player's path and every contact are bit-identical (${NEU ? NEU.identical : "—"} runs; the sweep's own fingerprints ${SUM.gameplay_identical}). Protected and frozen files: ${FROZ}.</p>
<h2>1 · What was wrong, what changed</h2>
<p>TECHNICAL-CONTROL-1's body put each foot where the contact needed it (a few cm) but keyed the foot's ORIENTATION in the world and let the ankle absorb whatever the shin's IK left. Measured on the posed skeleton: the ankle folded to ~90° dorsiflexion through every swing's heel recovery (the foot kept level while the shin swung back), the foot twisted up to 180° under the shin, the knee locked straight in ~10 % of frames, the hip rotated up to 94°, the ankle reached 4 000 – 21 000 °/s around contacts, and the boot passed up to 15 cm into the ball (thousands of frames).</p>
<p>This body keeps the contacts and foot paths and rebuilds the leg as a chain, in your order: <b>1 the pelvis</b> (turns up to 24° toward the touching leg when the leg is pressed, the trunk counter-rotating; lowers into the touch; moves toward a leg out of reach), <b>2 the hip</b> (its swivel turns the whole leg toward the foot — the knee follows the foot), <b>3 the knee</b> (two-bone IK with a soft extension limit), <b>4 the tibia and ankle</b> (only the remainder, each inside its range), <b>5 the contact surface</b> (searched per contact: the foot's yaw, pitch and roll and the boot's placement such that the labelled face of DRIBBLE-1's boot collider is the one that meets the ball, gap 0, within a cone of the impulse, with the leg in its comfort ranges and the rotation affordable in the time the swing gives). Orientation is planned in joint space: a swing follows RUN-1's own swing channels, winds up into the contact's orientation as early as the swing allows, holds the surface through the ball and follows through; only the contact (≈ 20 ms) and the landing (40 ms) lock the foot in the world. A swinging foot goes round or over the ball. The support foot is planted clear of the ball for its whole stance (moved up to 28 cm to its own side or back), stays flat with the knee over it, lifts its heel about the ball of the foot as soon as the ankle would dorsiflex past 20° or the leg nears its length (push-off), rolls onto its edge for what the subtalar joint cannot take, and leaves the turf a little earlier when the body has left it behind (presentation only: the gait the simulation uses is unchanged).</p>
<h2>2 · The numbers — TECHNICAL-CONTROL-1's body vs this body, on the same simulations</h2>${T}
<p class="sm dim">Ankle angular velocity and acceleration: the foot relative to the shin. RUN-1's p99 is reached during its push-off. "Boot inside the ball": the hull of DRIBBLE-1's boot collider overlapping the ball by more than 5 mm. A contact's surface error: the angle between the labelled surface's working direction (inside / outside normal, the laces along the foot, the sole down) and the impulse. Late decisions: the episode chose the contact's surface or direction at the contact itself (the intent changed after its last re-plan) — the leg met the ball prepared for the planned touch and is not snapped to the new one; listed below as visually infeasible as scheduled. CPU: ${CPU ? `simulation alone ${CPU.summary.off.msPerSimS.median} ms per simulated second; with TECHNICAL-CONTROL-1's body ${CPU.summary.tc1.msPerSimS.median}; with this body ${CPU.summary.tc11.msPerSimS.median} (worst single 240 Hz step ${CPU.summary.tc11.worstStepMs.max} ms — a re-plan runs the contact searches)` : "—"}.</p>
<h2>3 · The priority list — 99 / 99 / 99 first, then 80 / 80 / 80 and 50 / 50 / 50</h2>
<p class="sm">${FEET_SET.map((e, i) => `<a href="#${e.key}">${i + 1} ${e.label}</a>`).join(" · ")}</p>
${sections}
<h2>4 · Contacts flagged as visually infeasible as scheduled (or at a limit)</h2>
<p>${SUM.flags.length} of ${["99/99/99", "80/80/80", "50/50/50"].reduce((s, rt) => s + B[rt + " tc11"].contacts, 0)} contacts. Most are <b>late decisions</b>: the first touch after an intent change — the simulation decides it at the contact (its preview is the planned carry until then), so no body can prepare it without changing gameplay. The others: a touching leg at ≥ 98.5 % of its length (the reach the contact needs at that moment), and the Cruyff-like contacts behind the standing leg whose surface sits at the edge of its cone.</p>
<div class="tw"><table class="m sm"><tr><th>case</th><th>ratings</th><th>t (s from the first contact)</th><th>foot</th><th>surface</th><th>why</th></tr>${SUM.flags.map((f) => `<tr><td>${f.key}</td><td>${f.ratings}</td><td>${f.t}</td><td>${f.F}</td><td>${f.surface.toLowerCase()}</td><td>${f.why.join("; ")}</td></tr>`).join("")}</table></div>
<h2>5 · Ranges of motion</h2>${romT}
<h2>6 · Diagnostics (tools/tc11_diag.mjs)</h2>
<ul class="sm"><li>ankle angular velocity and acceleration (the foot relative to the shin), the foot's world angular velocity</li><li>foot yaw relative to the shin (tibial rotation + forefoot abduction), ankle dorsi / plantarflexion, inversion / eversion, knee flexion, hip rotation (swing – twist about the femur), each against the hard and comfort ranges</li><li>at every contact: the boot – ball gap and the boot face that meets the ball, the surface's orientation against the impulse, the ankle's own rotation and the toe's yaw in the 50 ms before and after, the touching leg's reach, the support knee</li><li>every frame: a boot inside the ball (swinging or planted); a planted foot's slip at its support point</li><li>RUN-1 (the approved running gait) measured the same way as the human reference</li></ul>
<p class="dim sm">I cannot play video in real time: everything above was judged from stills, contact strips and per-frame measurements. The motion at full speed and in slow motion is yours to judge.</p>
</main></body></html>`;
fs.mkdirSync(path.join(RA, "review"), { recursive: true }); fs.writeFileSync(path.join(RA, "review", "TECHNICAL_CONTROL11_REVIEW.html"), html); console.log("review", html.length);

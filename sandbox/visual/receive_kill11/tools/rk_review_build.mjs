// receive_kill1/tools/rk_review_build.mjs — the RECEIVE-KILL-1 review page (LOCAL ONLY: the character is a real player's model) from the evidence,
// the matrix screenshots, the clips and their still strips.   FFMPEG=<bin> node rk_review_build.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import cp from "child_process";
import { RK, SURFACES, BC_STEPS } from "../rk_model.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), R = path.resolve(HERE, "../../../../review_artifacts/receive_kill1"), EV = path.join(R, "evidence"), J = (f) => JSON.parse(fs.readFileSync(path.join(EV, f), "utf8"));
const D = J("rk_distribution.json"), DET = J("rk_determinism.json"), CH = J("rk_chrome_node.json"), CPU = J("rk_cpu.json"), SC = J("rk_scaling.json"), REG = J("rk_regression.json"), RX = J("receive11_rx_regress_dribble_v1.json"), RC = J("receive11_matrix_714_rerun_compare.json");
const sha = fs.readFileSync(path.join(EV, "frozen_sha256_end_check.txt"), "utf8"), FF = process.env.FFMPEG || "ffmpeg";
const f = (x, n = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(n)), esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const STATE = (d) => (d <= 0.5 ? "#3fbf7f" : d <= 1.2 ? "#9fd65a" : d <= 2.5 ? "#ffc640" : d <= 4.5 ? "#ff8a3d" : "#ff4d4d");
// still strips: 8 stills per clip → one 4×2 sheet
const ORDER = ["-0.30", "-0.10", "+0.00", "+0.12", "+0.30", "+0.60", "+1.00", "+2.00"];
const clips = fs.readFileSync(path.join(HERE, "rk_videos.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => { const [id, q] = l.split("|"); return { id, q }; });
fs.mkdirSync(path.join(R, "review"), { recursive: true }); fs.mkdirSync(path.join(R, "sheets"), { recursive: true });
for (const c of clips) { const dir = path.join(R, "stills", c.id), out = path.join(R, "sheets", c.id + ".jpg"); if (!fs.existsSync(dir)) continue; const ins = ORDER.map((t) => path.join(dir, `t${t}.jpg`)).filter((p) => fs.existsSync(p)); if (ins.length < 8) continue;
  const args = ["-loglevel", "error", "-y"]; for (const p of ins) args.push("-i", p); args.push("-filter_complex", ins.map((_, i) => `[${i}:v]crop=1440:640:0:62,scale=480:-1[v${i}]`).join(";") + ";" + ins.map((_, i) => `[v${i}]`).join("") + "xstack=inputs=8:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0[o]", "-map", "[o]", "-frames:v", "1", out); cp.execFileSync(FF, args); }
// the overview: the benchmark balls × BC (median distance over the seeds; the TYPICAL draw in small)
const bench = D.matrices.BENCH, ground = D.matrices.GROUND;
const heat = (rows, title) => `<table class="heat"><tr><th>${title}</th><th>surface</th><th>D</th>${BC_STEPS.map((b) => `<th>BC ${b}</th>`).join("")}</tr>` + rows.filter((r) => !r.none).map((r) => `<tr><td class="l">${esc(r.label)}</td><td>${r.surface}</td><td>${f(r.D)}</td>${r.dist.map((d, j) => `<td style="background:${STATE(d.med)}22;border-bottom:3px solid ${STATE(d.med)}"><b>${f(d.med)}</b><br><span class="s">p90 ${f(d.p90, d.p90 < 1 ? 2 : 1)} · heavy ${(100 * d.heavy).toFixed(0)}%<br>typical ${f(r.typical[j].d2)}</span></td>`).join("")}</tr>`).join("") + "</table>";
// the compression chart: median distance vs difficulty for the ground matrix, one line per rating
function chart(rows, w = 760, h = 300) { const pts = rows.filter((r) => !r.none), xs = pts.map((r) => r.D), x0 = 0, x1 = Math.max(...xs) * 1.05, ymax = 8, X = (x) => 50 + (x - x0) / (x1 - x0) * (w - 70), Y = (y) => h - 30 - Math.min(y, ymax) / ymax * (h - 50);
  const col = (bc) => `hsl(${((bc - 10) / 89 * 130).toFixed(0)},80%,55%)`; let s = `<svg viewBox="0 0 ${w} ${h}" class="chart"><rect x="0" y="0" width="${w}" height="${h}" fill="#121916"/>`;
  for (let y = 0; y <= ymax; y += 2) s += `<line x1="50" x2="${w - 20}" y1="${Y(y)}" y2="${Y(y)}" stroke="#26322c"/><text x="44" y="${Y(y) + 4}" text-anchor="end" class="ax">${y} m</text>`;
  for (const r of pts) s += `<text x="${X(r.D)}" y="${h - 12}" text-anchor="middle" class="ax">${r.cond.v}</text>`;
  s += `<text x="${w - 20}" y="${h - 12}" text-anchor="end" class="ax">m/s (x = difficulty D)</text>`;
  for (const [j, bc] of BC_STEPS.entries()) if ([10, 30, 50, 70, 80, 90, 99].includes(bc)) { const p = pts.map((r) => `${X(r.D).toFixed(1)},${Y(r.dist[j].med).toFixed(1)}`).join(" "); s += `<polyline points="${p}" fill="none" stroke="${col(bc)}" stroke-width="2"/><text x="${X(pts[pts.length - 1].D) + 4}" y="${Y(pts[pts.length - 1].dist[j].med) + 4}" class="ax" fill="${col(bc)}">BC ${bc}</text>`; }
  return s + "</svg>"; }
// the surface map
const SCOL = { FOOT: "#5ec8ff", THIGH: "#c39bff", CHEST: "#ff8fb8", HEAD: "#ffe066" }, grp = (k) => (k.startsWith("FOOT") ? "FOOT" : k.startsWith("THIGH") ? "THIGH" : k === "none" ? null : k);
const smap = (v) => `<table class="smap"><tr><th>height \\ descent</th>${SC.map[v][0].cells.map((c) => `<th>${c.d}°</th>`).join("")}</tr>` + SC.map[v].slice().reverse().map((r) => `<tr><td>${f(r.h)} m</td>${r.cells.map((c) => `<td style="background:${grp(c.s) ? SCOL[grp(c.s)] + "55" : "#331"}">${c.s.replace("FOOT_", "").replace("_R", "").replace("_L", " L")}</td>`).join("")}</tr>`).join("") + "</table>";
const surfRows = Object.entries(SURFACES).map(([k, S]) => `<tr><td><b>${k}</b></td><td>${S.env.z[0]}–${S.env.z[1]}</td><td>${S.zNom.toFixed(2)} / ${S.zHalf}</td><td>${S.env.vMax}</td><td>${S.w[0]} / ${S.w[1]}</td><td>${S.m}</td><td>${S.ideal.kind} → (${S.ideal.set.join(", ")}) · vz ${S.ideal.vz}</td><td>${S.cap.vAbs} m/s · κ ${S.cap.kappa} · e ${S.cap.e}</td><td>${S.k.join(" / ")} · run ×${S.run}</td><td>${S.prep}</td></tr>`).join("");
const vids = (pre, title) => `<div class="vg"><h4>${title}</h4>${["bc10", "bc50", "bc99"].map((b) => { const id = pre + "_" + b; return `<figure><video controls preload="none" poster="../videos/${id}.jpg" src="../videos/${id}.mp4"></video><figcaption>${b.toUpperCase().replace("BC", "BC ")} · <a href="../sheets/${id}.jpg" target="_blank">still strip</a></figcaption></figure>`; }).join("")}</div>`;
const shots = ["GROUND", "BOUNCE", "LOW", "THIGH", "CHEST", "HEAD", "HEIGHT", "DROP", "ENERGY", "SIDE", "BENCH"].filter((m) => fs.existsSync(path.join(R, "screens", `matrix_${m}.png`)));
const cpuRows = Object.entries(CPU.groups).map(([g, c]) => `<tr><td>${g}</td><td><b>${f(c.runtimeMsPerKill, 3)}</b></td><td>${f(c.worstRuntimeMs, 3)}</td><td>${f(c.planMs, 3)}</td><td>${f(c.idealMs, 4)}</td><td>${f(c.execMs, 5)}</td><td>${f(c.launchMs, 3)}</td><td>${f(c.candidatesEvaluated, 0)}</td><td>${f(c.sharedPredictorMs)}</td><td>${f(c.harnessIncomingSolveMs, 1)}</td></tr>`).join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kill Calibration Review</title>
<style>:root{--bg:#0f1412;--panel:#18201c;--ink:#e6efe9;--dim:#8fa49a;--acc:#ffd45e;--line:#2a3530}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif}main{max-width:1500px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0}h2{font-size:17px;margin:28px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h4{margin:8px 0 4px}a{color:var(--acc)}
.note{background:var(--panel);border-left:3px solid var(--acc);padding:8px 12px;margin:8px 0}.dim{color:var(--dim)}code,pre{font:12px Menlo,monospace}pre{background:var(--panel);padding:10px;overflow:auto}
table{border-collapse:collapse;margin:6px 0}td,th{border:1px solid var(--line);padding:3px 6px;font-size:12px;vertical-align:top}th{color:var(--dim);font-weight:600}
table.heat td{text-align:center;min-width:74px}table.heat td.l{text-align:left;max-width:240px}.s{font-size:10px;color:#b7c7bf}
.vg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 16px}.vg h4{grid-column:1/-1}figure{margin:0}video{width:100%;border-radius:6px;background:#000}figcaption{font-size:12px;color:var(--dim)}
.shot{width:100%;border:1px solid var(--line);border-radius:6px}.chart{width:100%;max-width:820px}.ax{font:11px Menlo,monospace;fill:#8fa49a}table.smap td{font-size:10px;padding:1px 4px}
.kv td:first-child{color:var(--dim);white-space:nowrap}@media(max-width:800px){.vg{grid-template-columns:1fr}}</style></head><body><main>
<h1>RECEIVE-KILL-1 — kill / deaden the ball: Ball Control calibration</h1>
<div class="note"><b>Presented for review — not frozen.</b> The Ball Control constants are calibration values, not locked. Local only (the character is a real player's model). <b>I cannot play video in real time:</b> my visual judgements come from the still strips and stills, not from watching the clips.</div>
<p><a href="../../../sandbox/visual/receive_kill1.html">Live calibration matrix ↗</a> · <a href="../../../sandbox/visual/receive_kill1_lab.html">Live control lab ↗</a> (needs the local server on :8361) · <a href="../RECEIVE_KILL1_REPORT.md">Report</a> · <a href="../RECEIVE_KILL1_ANIMATION_CONTRACT.md">Animation contract</a> · <a href="../evidence/rk_tables.md">All tables</a></p>
<h2>1 · Same ball, Ball Control 10 → 99</h2>
<p>Each cell: the <b>median distance from the intended point 2.0 s after the touch</b> over ${D.nSeeds} keyed seeds (the same draws at every rating), with its 90th percentile, the heavy-touch share (beyond 1.2 m) and the TYPICAL standardised draw. Colour: ≤ 0.5 m set · ≤ 1.2 controlled · ≤ 2.5 loose · ≤ 4.5 contestable · beyond, lost.</p>
${heat(bench, "benchmark")}
<h4>Easy balls compress the ratings, difficult balls expose them (ground matrix: median distance vs difficulty)</h4>${chart(ground)}
${heat(ground, "ground ball")}
<h2>2 · The model</h2>
<pre>EXECUTION (per axis a of the surface's frame: rebound / lateral / third)
  v_out = v_ideal + Σ_a  σ_a · N_a            N_a ~ N(0,1), keyed: seed | RECEIVE | receiver | receive event | receive-kill-v1 | axis | 0   (no Ball Control in the key)
  σ_a   = k_a,surface · vRef · D · E(BC, D)    vRef = ${RK.diff.vRef} m/s
  E     = eFloor + eSkill · q(BC) · c(D)       eFloor ${RK.exec.eFloor} · eSkill ${RK.exec.eSkill}
  q(BC) = ((100 − BC) / 90)^${RK.exec.gamma}            1 at BC 10 … ${f(SC.q[9].q, 4)} at BC 99
  c(D)  = D / (D + ${RK.exec.Dc})                     Ball Control's share of the error: ${f(SC.c[1].c)} at D 0.2, ${f(SC.c[5].c)} at D 1, ${f(SC.c[9].c)} at D 3
  rebound N &lt; 0 (under-cushioned, the ball runs through) is scaled by the surface's run factor; a foot on the turf can only lift the ball (|N_third|)
  caps: rebound along n ≤ max(ideal, e · v_in,n) (an uncushioned bounce off that surface); run-through ≥ −${RK.exec.runCap} · v_in,n
DIFFICULTY
  vEff = sqrt((w_h · v_h)² + (w_z · v_z)²)    the square root of the weighted incoming kinetic energy per unit mass
  D    = m · (vEff / vRef) · (1 + ${RK.diff.aH}·H² + ${RK.diff.aJump}·J + ${RK.diff.aBear}·B + ${RK.diff.aShift}·shift)
  H = (z − zNom)/zHalf (±1.5) · J = (z − 1.92)/0.3 for a header above 1.92 m · B = (1 − cos bearing)/2 · shift = repositioning (m)</pre>
<table><tr><th>surface</th><th>ball-centre band m</th><th>natural / half</th><th>v max</th><th>w_h / w_z</th><th>m</th><th>ideal (settle point fwd, side)</th><th>capability</th><th>error shape</th><th>prep s</th></tr>${surfRows}</table>
<h2>3 · The calibration matrices (the live page computes them; these are its screenshots, TYPICAL draw + ${D.nSeeds}-seed distribution)</h2>
${shots.map((m) => `<h4>${m}</h4><a href="../screens/matrix_${m}.png" target="_blank"><img class="shot" loading="lazy" src="../screens/matrix_${m}.png"></a>`).join("")}
<h2>4 · Benchmarks in the lab (BC 10 · 50 · 99, the TYPICAL draw, 0.5×)</h2>
<p class="dim">The ghost green ball is the IDEAL result, the white ball the ACTUAL one; the coloured dots are BC 10 … 99 with the same draw (the ladder). Still strips: −0.30, −0.10, CONTACT, +0.12, +0.30, +0.60, +1.00, +2.00 s.</p>
${vids("easy", "EASY — 2 m/s ground roller")}${vids("hard", "HARD — 22 m/s ground pass")}${vids("thighM", "THIGH — 6 m/s, 35°, 0.95 m")}${vids("thighH", "THIGH — 16 m/s, 35°")}${vids("chestM", "CHEST — 8 m/s, 20°, 1.32 m")}${vids("chestH", "CHEST — 20 m/s, 20°")}${vids("headM", "HEAD — 6 m/s, 15°, 1.78 m")}${vids("headH", "HEAD — 15 m/s, 25°")}
<h2>5 · AUTO surface selection (arrival height × descent at the reach plane)</h2><div style="display:flex;gap:16px;flex-wrap:wrap">${[5, 10, 16].map((v) => `<div><h4>${v} m/s</h4>${smap(v)}</div>`).join("")}</div>
<h2>6 · Verification</h2><table class="kv">
<tr><td>Matched counterfactuals</td><td>draw keys identical for BC 10…99 (${DET.matched.keyIdentical}/${DET.matched.seeds} seed sets); executed error = the same vector × E(BC, D): ${DET.matched.proportional}/${DET.matched.proportionalChecked} exact (max deviation ${DET.matched.maxRelDev.toExponential(1)}); ${DET.matched.capped} executions hit a physical cap</td></tr>
<tr><td>Replay · seeds</td><td>replay ${DET.replay.identical}/${DET.replay.runs} · seeds differ ${DET.seedsDiffer.differ}/${DET.seedsDiffer.pairs}</td></tr>
<tr><td>Authoritative path</td><td>fresh world + one schedule() = the matrices' snapshot path, bit for bit: ${DET.schedulePath.identical}/${DET.schedulePath.runs}</td></tr>
<tr><td>Animation on / off</td><td>${DET.anim.identical}/${DET.anim.runs} identical</td></tr>
<tr><td>Chrome = Node</td><td>${CH.identical}/${CH.total} bit-identical (decisions ${CH.decisions}/${CH.total})</td></tr>
<tr><td>DRIBBLE-V1</td><td>${REG.dribbleBeforeEqualsAfter}/${REG.dribbleRuns} identical before / after ${REG.killsRunBetween} kills in the same process; frozen evidence ${REG.dribbleEvidenceMatch}/${REG.dribbleEvidenceCompared}; RECEIVE-CONTROL-1.1's own regression ${RX.beforeEqualsAfter}/${RX.runs} + ${RX.evidenceMatch}/${RX.evidenceCompared}</td></tr>
<tr><td>RECEIVE-CONTROL-1.1</td><td>matrix of record rerun ${RC.identical}/${RC.runs} identical · review cases before / after kills ${REG.receive11BeforeEqualsAfter}/${REG.receive11Cases} · D1 / RX / RXE unchanged ${REG.frozenParamsUnchanged}</td></tr>
<tr><td>Frozen files</td><td>${sha.includes("IDENTICAL") ? "IDENTICAL" : "CHANGED"} (${(sha.match(/OK/g) || []).length} files: DRIBBLE-V1, TURN-1.2, RUN-1, ball physics, RECEIVE-CONTROL-1 / 1.1)</td></tr></table>
<h4>CPU (ms, Node, one process)</h4><table><tr><th>surface</th><th>runtime per kill</th><th>worst</th><th>plan</th><th>ideal</th><th>execution</th><th>launch tick</th><th>candidates</th><th>shared predictor</th><th>harness pass solve</th></tr>${cpuRows}</table>
<p class="dim">Runtime = plan + ideal + execution + the one launch. The free-ball prediction is the match's shared predictor; the pass solve only builds test balls. Exit-speed table: ${CPU.exitTable.columns} columns, ${f(CPU.exitTable.msPerColumn, 0)} ms each, built once. Ground matrix (80 cells): ${f(CPU.matrixGround.ms, 0)} ms; all ${Object.values(D.matrices).reduce((s, r) => s + r.length, 0)} rows × 10 ratings × ${D.nSeeds} seeds: ${f(D.ms / 1000, 0)} s wall (11 processes).</p>
<h2>7 · Limitations and decisions</h2><ul>
<li>The body is a procedural placeholder (the contract: RECEIVE_KILL1_ANIMATION_CONTRACT.md); it is not in the ball's world, so a run-through ball passes through the legs.</li>
<li>The receiver is stationary in clean conditions: no opponent, pressure, fatigue, weak foot, Agility or Dribbling (the owner's isolation). Both feet are allowed with no weak-foot term; AUTO prefers the right foot only as a tie-break.</li>
<li>One contact only: the kill's result is the free ball; the follow-up touch (e.g. the foot after a chest control) is not modelled yet.</li>
<li>The constants are calibration values, not locked: eFloor, eSkill, γ, Dc, the surface weights, capabilities and error shapes.</li></ul>
</main></body></html>`;
fs.writeFileSync(path.join(R, "review", "RECEIVE_KILL1_REVIEW.html"), html); console.log("wrote review page", shots.length, "matrix screenshots", clips.length, "clips");

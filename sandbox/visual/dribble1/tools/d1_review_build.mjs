// dribble1/tools/d1_review_build.mjs — builds review_artifacts/dribble1/review/DRIBBLE1_REVIEW.html from the rendered videos (../videos), their posters
// (made here with ffmpeg) and the evidence JSONs (../evidence). LOCAL REVIEW ONLY: the lab shows real player names (players.json profiles, the kit).
// usage: FFMPEG=<bin> node d1_review_build.mjs
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../../../review_artifacts/dribble1"), VID = path.join(ROOT, "videos"), POS = path.join(ROOT, "posters"), EV = path.join(ROOT, "evidence"), OUT = path.join(ROOT, "review");
fs.mkdirSync(POS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(EV, f), "utf8")); } catch { return null; } };
const STATUS = JSON.parse(fs.readFileSync(path.join(ROOT, "DRIBBLE1_STATUS.json"), "utf8"));
const lines = fs.readFileSync(path.join(HERE, "d1_videos.txt"), "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("|").map((x) => x.trim()));
const meta = Object.fromEntries(lines.map(([name, q, t0, t1, view, rate]) => [name, { q, t0: +t0, t1: +t1, view, rate: +rate }]));
// posters: a frame a little after the middle of each clip
for (const name of Object.keys(meta)) { const v = path.join(VID, name + ".mp4"), p = path.join(POS, name + ".jpg"); if (!fs.existsSync(v) || fs.existsSync(p)) continue;
  const m = meta[name], dur = (m.t1 - m.t0) / m.rate; execFileSync(process.env.FFMPEG || "ffmpeg", ["-v", "error", "-y", "-ss", (dur * 0.55).toFixed(2), "-i", v, "-frames:v", "1", "-q:v", "4", "-vf", "scale=960:-2", p]); }
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lab = (q) => `http://127.0.0.1:8361/sandbox/visual/dribble1.html?${q}`;
const fig = (name, cap, big) => { const m = meta[name]; if (!m || !fs.existsSync(path.join(VID, name + ".mp4"))) return `<p class="miss">missing ${name}</p>`;
  const view = m.view === "game" ? "1× Touchline gameplay camera" : m.view === "layout" ? "gameplay camera + close views, diagnostics on" : `close camera, ${m.rate}× speed`;
  return `<figure class="${big ? "big" : ""}"><video controls muted loop playsinline preload="none" poster="../posters/${name}.jpg" src="../videos/${name}.mp4"></video><figcaption><b>${esc(cap)}</b><br><span class="mut">${view} · sim ${m.t0}–${m.t1} s · <code>${name}.mp4</code> · <a href="${lab(m.q)}">open in the lab</a></span></figcaption></figure>`; };
const grid = (n, items) => `<div class="g${n}">${items.map(([a, b]) => fig(a, b)).join("")}</div>`;
const td = (x) => `<td>${x == null ? "—" : esc(x)}</td>`;
const pct = (x) => (x == null ? "—" : (+x).toFixed(0) + " %");
// ── tables ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const speed = J("speed_matrix_HIGH_B.json"), dir = J("direction_matrix_HIGH_B.json"), rel = J("reliability_B_HIGH.json"), abc = J("abc_architectures.json"), free = J("free_ball_audit.json"),
  detN = J("determinism_node.json"), detC = J("determinism_chrome.json"), plant = J("plant_check.json"), cpu = J("cpu.json");
const mrow = (id, r) => `<tr><td><b>${id}</b></td>${td(r.playerSpeed)}${td(r.touchesPerSec)}${td(r.sepMean)}${td(r.sepMax)}${td(r.freeIntervalMean)}${td(r.freeSharePct != null ? r.freeSharePct.toFixed(1) + " %" : null)}${td(`R ${r.feet.R} · L ${r.feet.L} (preferred ${r.feet.preferredShare} %)`)}${td(Object.entries(r.regions).map(([a, b]) => a + " " + b).join(" · "))}${td(`${r.touchErrSpeedPct} % · ${r.touchErrDirDeg}°`)}${td(`${r.launchMean} (max ${r.launchMax})`)}${td(r.ballSpeedMean)}${td(r.controlLosses)}${td(pct(r.controlledPct))}</tr>`;
const mhead = `<tr><th>scenario</th><th>player m/s</th><th>touches / s</th><th>separation mean m</th><th>max m</th><th>free interval s</th><th>ball free (ticks)</th><th>feet</th><th>regions</th><th>touch error |speed| · |dir|</th><th>launch m/s</th><th>ball m/s</th><th>losses / run</th><th>controlled</th></tr>`;
const mtable = (M) => M ? `<div class="tw"><table>${mhead}${Object.entries(M).map(([id, r]) => mrow(id, r)).join("")}</table></div>` : `<p class="miss">missing</p>`;
const attrs = ["HIGH", "AVERAGE", "POOR", "WEAKFOOT", "LEFT_HIGH"].map((p) => [p, J(`attributes_${p}.json`)]).filter(([, x]) => x);
const atable = `<div class="tw"><table><tr><th>profile</th><th>player</th>${["STRAIGHT_RUN", "CUT60_RUN", "STRAIGHT_SPRINT"].map((s) => `<th>${s} controlled</th><th>touch error</th><th>losses</th>`).join("")}</tr>${attrs.map(([p, x]) => `<tr><td><b>${p}</b></td>${td(x.STRAIGHT_RUN.profile)}${["STRAIGHT_RUN", "CUT60_RUN", "STRAIGHT_SPRINT"].map((s) => td(pct(x[s].controlledPct)) + td(`${x[s].touchErrSpeedPct} % · ${x[s].touchErrDirDeg}°`) + td(x[s].controlLosses)).join("")}</tr>`).join("")}</table></div>`;
const reltable = rel ? `<div class="tw"><table><tr><th>scenario</th><th>seeds</th><th>controlled (after the first touch)</th><th>held to the end</th><th>touches</th><th>double impulses</th><th>unplanned own contacts</th><th>kernel faults</th><th>per seed (C = controlled at the end, L = loose, F = kernel fault)</th></tr>${Object.entries(rel).map(([id, r]) => `<tr><td><b>${id}</b></td>${td(r.seeds)}${td(pct(r.controlledPct))}${td(r.heldToEnd)}${td(r.touches)}${td(r.doubleImpulses)}${td(r.unplannedOwnContacts)}${td(r.kernelFaults || 0)}${td(r.rows.map((x) => x.kernelFault ? "F" : x.end[0]).join(""))}</tr>`).join("")}</table></div>` : `<p class="miss">missing</p>`;
const abctable = abc ? `<div class="tw"><table><tr><th>architecture · fixture</th><th>controlled</th><th>touches</th><th>losses</th><th>launch speed error</th><th>launch dir error</th><th>impulses / touch</th><th>separation mean / max</th><th>cut response</th></tr>${Object.entries(abc).map(([k, r]) => `<tr><td><b>${k}</b></td>${td(pct(r.controlledPct))}${td(r.touches)}${td(r.losses)}${td(r.launchSpeedErrPct + " % (sd " + r.launchSpeedErrSd + ")")}${td(r.launchDirErrDeg + "°")}${td(r.impulsesPerTouch)}${td(r.sepMean + " / " + r.sepMax + " m")}${td(r.cutResponseS != null ? r.cutResponseS + " s (" + r.cutResponded + ")" : r.cutResponded)}</tr>`).join("")}</table></div>` : `<p class="miss">missing</p>`;
const cputable = cpu ? `<div class="tw"><table><tr><th>scenario</th><th>total ms / sim s</th><th>locomotion</th><th>ball kernel</th><th>resolver (all)</th><th>· predictions</th><th>· launch solve</th><th>real-time factor</th></tr>${Object.entries(cpu).map(([id, r]) => `<tr><td><b>${id}</b></td>${td(r.msPerSimSecond.total)}${td(r.msPerSimSecond.locomotion)}${td(r.msPerSimSecond.ball)}${td(r.msPerSimSecond.resolverTotal)}${td(r.msPerSimSecond.resolverPredict)}${td(r.msPerSimSecond.resolverSolve)}${td(r.realtimeFactor + "×")}</tr>`).join("")}</table></div>` : `<p class="miss">missing</p>`;
const det = `Node replay: <b>${detN ? Object.values(detN).filter((x) => x.identical).length + " / " + Object.keys(detN).length : "—"}</b> scenarios bit-identical (ball + COM every tick, touch ticks, feet, regions, launches). ` +
  (detC ? `Node ${detC.node} vs ${esc(detC.chrome)} (the lab page): <b>${detC.identical} / ${detC.total}</b> identical${detC.identical < detC.total ? " — differing: " + Object.entries(detC.results).filter(([, r]) => !r.identical).map(([id]) => id).join(", ") : ""}.` : "");
const S = STATUS;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DRIBBLE-1 review</title>
<style>:root{--bg:#0f1412;--fg:#e6efe9;--mut:#9fb3a8;--card:#16201b;--line:#2c3d34;--acc:#8cffaa;--warn:#ffd45e;--bad:#ff8a7a}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1500px;margin:0 auto;padding:16px 22px 60px}
a{color:#9fd8ff}code{font:12.5px ui-monospace,Menlo,monospace;color:#cfe}h1{font-size:24px;margin:6px 0}h2{font-size:19px;margin:34px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}
.card{background:var(--card);border-radius:8px;padding:10px 14px;margin:10px 0}.mut{color:var(--mut)}.miss{color:var(--bad)}.vl{font-family:ui-monospace,Menlo,monospace;font-size:13.5px;line-height:1.75}.vl b{color:var(--acc)}.vl b.p{color:var(--warn)}.vl b.f{color:var(--bad)}
video{width:100%;background:#000;border-radius:4px;display:block}figure{margin:6px 0 12px}figcaption{font-size:13px;margin-top:4px}.g1,.g2,.g3{display:grid;gap:12px}.g1{grid-template-columns:1fr}.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
@media(max-width:1100px){.g2,.g3{grid-template-columns:1fr}}.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}li{margin:3px 0}</style></head><body><main>
<h1>DRIBBLE-1 — physics-based dribbling on TURN-1.2 with a free BALL-FEEL-1.3 ball</h1>
<p class="mut">${esc(S.date)} · branch <code>prototype/dribble-1</code> · instruction <code>review_artifacts/dribble1/sources/2026-10-16_user_instruction_dribble1_physics_based_dribbling_v1.md</code> · <b>local review page</b> (real player names from players.json appear in the lab and on the kit) · live lab: <a href="${lab("scn=CUT90_RUN&seed=4")}">dribble1.html</a> (server on :8361 from the dribble-1 worktree)</p>
<div class="card vl">${S.statusLines.map(([k, v]) => `${esc(k)}: <b class="${/PARTIAL/.test(v) ? "p" : /^(FAIL|NO)$/.test(v) ? "f" : ""}">${esc(v)}</b>`).join("<br>")}</div>
<h2>Three videos to watch first</h2>${S.watchFirst.map(([n, c]) => fig(n, c, true)).join("")}
<div class="card"><b>How to read the clips.</b> All clips come from the same deterministic simulation the evidence uses; the lab page re-simulates on load (scenario, seed, player and touch architecture are in the URL). The 1× clips are the clean Touchline gameplay camera — nothing is drawn but the HUD line at the bottom (time, player speed, ball speed, separation, control state, last touch). The diagnostic clips add: the ball's path (cyan), the COM path, the feet, the planned (warped) toe path to the contact (pink), the intended contact point and the aimed next-touch window (yellow rings, labelled with foot, boot region and contact time), the control envelope (dotted circle), velocity arrows, and a red marker at every authoritative contact tick. I cannot play video in real time — I judged these from frame strips and stills.</div>
<h2>STRAIGHT — JOG · RUN · FAST · SPRINT (1×)</h2>${grid(2, S.videos.STRAIGHT)}
<h2>CURVE — gentle steering (1×)</h2>${grid(2, S.videos.CURVE)}
<h2>CUT — 45° · 60° · 90° (1×)</h2>${grid(2, S.videos.CUT)}
<h2>REVERSAL — 135° · 180° (experimental, 1×)</h2>${grid(2, S.videos.REVERSAL)}
<h2>INTERRUPTION — a defender's leg and a sliding tackle knock the ball loose (1×)</h2>${grid(2, S.videos.INTERRUPTION)}
<h2>SKILL — the same straight RUN and 60° cut by different players (1×)</h2>${grid(2, S.videos.SKILL)}
<h2>CONTINUOUS INPUT — cancel and retarget (1×)</h2>${grid(2, S.videos.INPUT)}
<h2>THREE-ARCHITECTURE COMPARISON — identical straight RUN and 60° cut (1×)</h2>${grid(3, S.videos.ARCH)}
<h2>DIAGNOSTICS — gameplay camera + close views with overlays</h2>${grid(1, S.videos.DIAG)}
<h2>CONTACT CLOSE-UPS at 0.25×</h2>${grid(2, S.videos.SLOW)}
<h2>How it works</h2><div class="card"><ul>${S.howItWorks.map((x) => `<li>${x}</li>`).join("")}</ul></div>
<h2>Evidence</h2>
<h3>Speed matrix — straight, ${speed ? Object.values(speed)[0].seeds : "?"} seeds each, ${speed ? esc(Object.values(speed)[0].profile) : ""}, resolved touches (B)</h3>${mtable(speed)}
<h3>Direction matrix</h3>${mtable(dir)}
<h3>Reliability — every lab scenario</h3>${reltable}
<h3>Attributes — same scenarios, seeds and touch architecture</h3>${atable}
<h3>Three-architecture comparison</h3>${abctable}
<h3>No tether — the free-ball audit</h3><div class="card">${free ? `The live ball was re-simulated in a fresh BallWorld with <b>no colliders</b> from its own state after every launch and every body contact; between those events the two must agree. Over <b>${free.TOTAL.freeTicks}</b> free-ball ticks (every scenario × 4 seeds): <b>${free.TOTAL.deviatingTicks}</b> deviating ticks, maximum |Δ| = <b>${free.TOTAL.maxDeviation}</b>. The dribble code never writes the ball's state: it only sets collider frames and schedules one authoritative launch per touch through the kernel's validated <code>schedule()</code>.` : "missing"}</div>
<h3>Plants unchanged — the swing adjustment never moves a stance foot</h3><div class="card">${plant ? `At every tick where a touch adjustment acts (${plant.TOTAL.adjustedTicks} ticks, every scenario × 2 seeds), the stance foot and toe of the adjusted pose against TURN-1.2's plain pose of the same state: max deviation <b>${(plant.TOTAL.stanceFootMaxDevM * 1000).toFixed(4)} mm</b>; the other (unadjusted) swing foot: <b>${(plant.TOTAL.unadjustedSwingFootMaxDevM * 1000).toFixed(4)} mm</b>.` : "missing"}</div>
<h3>Determinism</h3><div class="card">${det}${S.determinismNote ? "<br>" + S.determinismNote : ""}</div>
<h3>CPU — single process, Node ${cpu && cpu.ALL ? cpu.ALL.node : ""}, one player + ball</h3>${cputable}
<div class="card">${S.cpuNote || ""}</div>
<h3>Every touch</h3><div class="card">Per touch: tick, foot, boot region, hull, swing phase, contact gap, ball position, pre-touch velocity and spin, desired launch, executed launch (with the keyed execution error), the kernel's post-contact velocity and spin — <code>evidence/touch_log.json</code> and <code>evidence/touch_log.csv</code> for every clip on this page.</div>
<h2>Defects and next step</h2><div class="card"><h3>Three biggest V1 visual defects</h3><ol>${S.visualDefects.map((x) => `<li>${x}</li>`).join("")}</ol><h3>Three biggest V1 system defects</h3><ol>${S.systemDefects.map((x) => `<li>${x}</li>`).join("")}</ol><h3>Exact next shipping step</h3><p>${S.nextStep}</p></div>
<h2>Provenance</h2><div class="card"><ul>${S.provenance.map((x) => `<li>${x}</li>`).join("")}</ul></div>
</main></body></html>`;
fs.writeFileSync(path.join(OUT, "DRIBBLE1_REVIEW.html"), html); console.log("wrote", path.join(OUT, "DRIBBLE1_REVIEW.html"));

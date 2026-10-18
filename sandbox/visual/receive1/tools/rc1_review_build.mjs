// receive1/tools/rc1_review_build.mjs — builds review_artifacts/receive1/review/RECEIVE1_REVIEW.html: the visual cases (A, A′, B–F and the full-throttle
// case: zoomed gameplay camera 1×, top view with diagnostics 0.5×, close side view 0.25×, frame strips), the matrix tables, determinism, CPU, the
// DRIBBLE-V1 check and the limitations — from the videos (../videos), posters (made here with ffmpeg), stills, the evidence JSONs and
// RECEIVE1_STATUS.json. LOCAL REVIEW ONLY: the lab shows real player names.
// usage: FFMPEG=<bin> node rc1_review_build.mjs
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../../../review_artifacts/receive1"), VID = path.join(ROOT, "videos"), POS = path.join(ROOT, "posters"), EV = path.join(ROOT, "evidence"), OUT = path.join(ROOT, "review");
fs.mkdirSync(POS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const J = (f) => JSON.parse(fs.readFileSync(path.join(EV, f), "utf8")), S = JSON.parse(fs.readFileSync(path.join(ROOT, "RECEIVE1_STATUS.json"), "utf8")), A = J("analysis.json"), CPU = J("cpu.json");
const lines = fs.readFileSync(path.join(HERE, "rc1_videos.txt"), "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("|").map((x) => x.trim()));
const meta = {}; for (const l of lines) meta[l[0]] = { page: l[1], q: l[2], t0: +l[3], t1: +l[4], view: l[5], rate: +l[6] };
for (const name of Object.keys(meta)) { const v = path.join(VID, name + ".mp4"), p = path.join(POS, name + ".jpg"); if (!fs.existsSync(v) || fs.existsSync(p)) continue;
  const m = meta[name], dur = (m.t1 - m.t0) / m.rate; execFileSync(process.env.FFMPEG || "ffmpeg", ["-v", "error", "-y", "-ss", (dur * 0.55).toFixed(2), "-i", v, "-frames:v", "1", "-q:v", "4", "-vf", "scale=1280:-2", p]); }
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lab = (q) => `http://127.0.0.1:8361/sandbox/visual/receive1.html?${q}`;
const VIEW = { game: "gameplay camera zoomed 2.6×", top: "close top view, diagnostics", nearC: "close side view" };
const fig = (name) => { const m = meta[name]; if (!m || !fs.existsSync(path.join(VID, name + ".mp4"))) return `<p class="miss">missing ${name}</p>`;
  return `<figure><video controls muted loop playsinline preload="none" poster="../posters/${name}.jpg" src="../videos/${name}.mp4"></video><figcaption><span class="mut">${VIEW[m.view] || m.view} · ${m.rate}× · sim ${m.t0.toFixed(2)}–${m.t1.toFixed(2)} s · <a href="${lab(m.q)}">open in the lab</a></span></figcaption></figure>`; };
const strip = (f, cap) => fs.existsSync(path.join(ROOT, "stills", f)) ? `<figure class="wide"><img src="../stills/${f}"><figcaption class="mut">${esc(cap)}</figcaption></figure>` : "";
// the cases: [letter in the files, title, what the frames show]
const CASES = [
  ["a", "A — ordinary forward receive · R_0_RUN_MED", "Pass from the right to a running receiver, exit straight on. Left inside across the body (6.9 → 6.8 m/s), 2° off the exit. The approach slowed him to 3.1 m/s to time the meeting; back at 5.5 m/s a second later."],
  ["h", "A′ — ordinary receive at running pace · F_315_RUN_MED", "Pass from the front, exit 45° left. The outside of the left foot redirects the oncoming pass (9.2 → 6.4 m/s) 8° off the exit, in stride at 5.5 m/s."],
  ["b", "B — 120° turning receive (right) · FR_120_RUN_MED", "The turn is released 0.34 s before contact. The right outside reaches for the pass and kills its pace (8.5 → 2.9 m/s), sending it out at 93° (27° short); the body keeps turning and is on the 120° line 0.97 s later."],
  ["c", "C — 180° turn first touch · R_180R_JOG_SOFT", "The turn starts 0.33 s before the ball arrives; at contact the body is 92° round (its speed at the bottom of TURN-1.2's pivot, 0.6 m/s). The left laces send the ball out at 172°, 8° off the exit, and he runs on with it — 5.3 m/s a second later."],
  ["d", "D — the opposite side (120° left) · FL_240_RUN_MED", "B mirrored: the right inside takes the ball across the body (8.5 → 3.7 m/s) to −85° for a −120° exit; new line 0.93 s later."],
  ["e", "E — through-stance turn (90° left) · FL_270_RUN_MED", "The right foot's inside meets the ball behind the standing left leg (8.6 → 5.5 m/s), sending it to −66° for a −90° exit, and he turns away with it. Chop-like in function; nothing is scripted."],
  ["f", "F — failed / heavy receive · F_180R_RUN_MED", "Head-on pass, 180° wanted. No valid turning plan; the frozen recovery block with the left toe (9.2 → 9.7 m/s) sends it straight back toward the passer; control is lost 0.13 s later."],
  ["g", "+ full throttle — 90° left from 7.8 m/s · L_270_FAST_MED", "TURN-1.2 brakes to 4.9 m/s for the turn; a right inside wrap with the body 89° round, 2° off the exit; on the new line at once and back at 7.8 m/s a second later. (The close view clips into his back in its first frames.)"],
];
const caseHtml = CASES.map(([L, t, d]) => `<section class="case"><h3>${esc(t)}</h3><p>${esc(d)}</p><div class="g3">${fig(L + "_game")}${fig(L + "_top")}${fig(L + "_near")}</div>${strip(L + "_near.jpg", "frame strip, close side view (8 frames over the clip)")}${strip(L + "_top.jpg", "frame strip, top view with diagnostics")}</section>`).join("");
const OC = ["CLEAN", "TAKEN", "RECEIVED", "RECOVERED", "MISSED"];
const tbl = (title, obj, order) => `<h3>${esc(title)}</h3><div class="tw"><table><tr><th></th><th>n</th>${OC.map((o) => `<th>${o.toLowerCase()}</th>`).join("")}</tr>${(order || Object.keys(obj)).filter((k) => obj[k]).map((k) => `<tr><td>${esc(k)}</td><td>${obj[k].n}</td>${OC.map((o) => `<td class="${o === "CLEAN" ? "ok" : o === "MISSED" ? "bad" : ""}">${obj[k][o] || 0}</td>`).join("")}</tr>`).join("")}</table></div>`;
const o = A.outcomes, pct = (x) => (100 * x / A.n).toFixed(0) + " %";
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RECEIVE-CONTROL-1 review</title>
<style>:root{--bg:#0f1412;--fg:#e6efe9;--mut:#9fb3a8;--card:#16201b;--line:#2c3d34;--acc:#8cffaa;--warn:#ffd45e;--bad:#ff8a7a}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1500px;margin:0 auto;padding:16px 22px 60px}
a{color:#9fd8ff}code{font:12.5px ui-monospace,Menlo,monospace;color:#cfe}h1{font-size:24px;margin:6px 0}h2{font-size:19px;margin:34px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}
.mut{color:var(--mut);font-size:13px}.box{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin:10px 0}.warn{color:var(--warn)}
.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:1000px){.g3{grid-template-columns:1fr}}figure{margin:0}video,img{width:100%;border-radius:5px;background:#000;display:block}figure.wide{margin-top:8px}
.case{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 14px 14px;margin:14px 0}.tw{overflow-x:auto}table{border-collapse:collapse;font-size:13.5px;margin:4px 0 10px}td,th{border:1px solid var(--line);padding:4px 9px;text-align:right}td:first-child,th:first-child{text-align:left}
td.ok{color:var(--acc)}td.bad{color:var(--bad)}.miss{color:var(--bad)}ul{margin:6px 0}</style></head><body><main>
<h1>RECEIVE-CONTROL-1 — full-throttle receiving and turning first touches</h1>
<p class="mut">18 Oct 2026 · <code>prototype/dribble-1</code> · an adapter on the frozen DRIBBLE-V1 (tag <code>dribble-v1-foundation-1</code>, unchanged) · local review page (real player names) · the full report is <code>review_artifacts/receive1/RECEIVE1_REPORT.md</code></p>
<div class="box"><b>Status: presented for review, not frozen. Recommendation: not ready to freeze.</b>
<ul><li>All the behaviours asked for exist and are deterministic: ordinary receives into stride, turning first touches both ways, a 180° turn taken with the first touch, through- and across-body redirections, heavy and failed receives.</li>
<li>Reliability is not foundation-level yet: ${o.CLEAN} of ${A.n} representative runs clean (${pct(o.CLEAN)}), ${o.MISSED} missed (${pct(o.MISSED)}). The main limits are in the frozen dribble contact model meeting a hard incoming ball (the report, §12 and §15).</li>
<li>CPU in the receive phase: ${CPU.mean.receiveMsPerS} ms per simulated second on average (≈ 1.3 s per receive); after the handoff ${CPU.mean.afterMsPerS} ms/s (DRIBBLE-V1's own).</li></ul>
<p class="mut">I cannot play video in real time: every judgement on this page comes from frame strips and stills. Each case: the gameplay camera zoomed 2.6× (1×), a close top view with diagnostics (0.5×) and a close side view around the contact (0.25×). The overlays show the passer, the requested exit with its receiveTurnAngle, and the first touch (foot, surface, role, ball speed in → out, its direction, the exit error and how far the body had turned).</p></div>
<h2>Visual cases</h2>${caseHtml}
<h2>Matrix — ${A.n} runs (238 situations × 3 seeds)</h2>
<p class="mut">Seeds change the keyed execution draws and move the passer a few tenths of a metre, so the ball meets a different phase of the stride. A <b>receive</b> is a first touch before the pass has gone by. Clean: a receive, the new line within 2.5 s, the ball controlled at the end. Taken: the new line reached, but late or not controlled. Received: a receive, no new line. Recovered: the pass went by and was played later. Missed: no touch.</p>
${tbl("By receiveTurnAngle", A.byAngle, ["0", "45", "89", "90", "120", "135", "180", "225", "240", "270", "271", "315"])}
${tbl("By pass direction (where the pass comes from)", A.byDir, ["F", "FL", "FR", "L", "R", "RL", "RR"])}
${tbl("By receiver", A.byReceiver, ["STAND", "JOG", "RUN", "FAST"])}${tbl("By pass strength", A.byPass, ["SOFT", "MED", "FIRM"])}${tbl("By class", A.byClass, ["ordinary", "turning"])}
<div class="box"><ul><li>Turning receives: the turn was released before contact in ${A.turning.turnReleasedBeforeContact} of ${A.turning.realReceives} real turning receives, a median ${A.turning.leadS_median} s early; the body had turned a median ${A.turning.bodyTurnedAtContactDeg_median}° at the contact. In ${A.turning.touchOnExitIsFirst_clean} of ${A.turning.clean} clean ones the first touch itself put the ball on the exit.</li>
<li>180°: ${A.r180.outcomes.CLEAN} clean + ${A.r180.outcomes.TAKEN} taken of ${A.r180.n}; ${A.r180.cleanFirstTouchIsTurn} of the clean ones turn with the first touch; new line ${A.r180.cleanFirstToLine_median} s after it (median).</li>
<li>Clean turning receives: ${A.cleanTurnsBySide.right} to the right, ${A.cleanTurnsBySide.left} to the left. Both feet are chosen by geometry in both directions.</li>
<li>First-touch families (labels read from geometry, no scripted moves): ${Object.entries(A.families).map(([k, v]) => `${esc(k)} ${v}`).join(" · ")}.</li>
<li>Handoff into DRIBBLE-V1: ${A.handoff.doubleTouches} double touches; same-foot re-contacts in ${A.handoff.runsWithRecontact} runs; no acceleration beyond TURN-1.2's own stance impulses.</li>
<li>Failures: ${A.failures.heavyFirstTouch} heavy first touches; ${A.failures.deflectedBeforeFirst} balls deflected off the body before any planned touch; ${A.failures.lostAfterFirst} lost after the first touch; ${A.failures.faults} kernel faults.</li></ul></div>
<h2>Determinism, performance, DRIBBLE-V1</h2>
<div class="box"><ul><li>Node replay ${S.determinism.nodeReplay} identical. Chrome / Node: decisions ${S.determinism.chromeNodeDecisions} identical; state bit-identical in ${S.determinism.chromeNodeStateBitIdentical}, and otherwise differs only in the last bits (as in DRIBBLE-V1).</li>
<li>Matched seeds: first-touch execution draws are keyed by seed, player, tick and foot — ${S.determinism.matchedSeed.identicalDraws}/${S.determinism.matchedSeed.sameContactTwoBuilds} identical for the same contact in two builds, ${S.determinism.matchedSeed.drawsDiffer}/${S.determinism.matchedSeed.sameContactDifferentSeeds} different across seeds.</li>
<li>CPU (one process, idle machine, 20 cases): receive phase ${CPU.mean.receiveMsPerS} ms per simulated second; after the handoff ${CPU.mean.afterMsPerS} ms/s; whole 4 s case ${CPU.mean.totalMsPerS} ms/s; worst step ${CPU.worstStepMs} ms (garbage collection; planning stays inside the frozen ≈ 14 ms per-tick budget).</li>
<li>DRIBBLE-V1: frozen files byte-identical to the tag; ${S.dribbleV1.beforeEqualsAfterReceives} DRIBBLE-1.5 runs identical before and after receives in the same process; ${S.dribbleV1.matchesEvidenceOfRecord} match its evidence of record; the frozen parameter object is unchanged.</li></ul></div>
<h2>Limitations</h2><div class="box"><ul>${S.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p class="mut">For the attribute layer: Ball Control on first-touch execution, weak foot, reach / agility, reactions, pressure and fatigue.</p></div>
</main></body></html>`;
fs.writeFileSync(path.join(OUT, "RECEIVE1_REVIEW.html"), html); console.log("wrote", path.join(OUT, "RECEIVE1_REVIEW.html"));

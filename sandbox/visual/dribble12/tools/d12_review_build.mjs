// dribble12/tools/d12_review_build.mjs — builds review_artifacts/dribble12/review/DRIBBLE12_REVIEW.html from the rendered videos (../videos), posters
// (made here with ffmpeg), still strips (../stills), the evidence JSONs (../evidence) and DRIBBLE12_STATUS.json. LOCAL REVIEW ONLY: the lab shows
// real player names. usage: FFMPEG=<bin> node d12_review_build.mjs
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../../../review_artifacts/dribble12"), VID = path.join(ROOT, "videos"), POS = path.join(ROOT, "posters"), EV = path.join(ROOT, "evidence"), OUT = path.join(ROOT, "review");
fs.mkdirSync(POS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(EV, f), "utf8")); } catch { return null; } };
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "DRIBBLE12_STATUS.json"), "utf8"));
const lines = fs.readFileSync(path.join(HERE, "d12_videos.txt"), "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("|").map((x) => x.trim()));
const meta = {}; for (const l of lines) { if (l[0] === "SBS3") meta[l[1]] = { sbs: 3, clips: [l[2], l[3], l[4]] }; else if (l[0] === "SBS") meta[l[1]] = { sbs: 2, clips: [l[2], l[3]] }; else meta[l[0]] = { page: l[1], q: l[2], t0: +l[3], t1: +l[4], view: l[5], rate: +l[6] }; }
for (const m of Object.values(meta)) if (m.sbs) Object.assign(m, { q: meta[m.clips[0]].q, t0: meta[m.clips[0]].t0, t1: meta[m.clips[0]].t1, view: "sbs", rate: 1, pages: m.clips.map((c) => meta[c].page) });
for (const name of Object.keys(meta)) { const v = path.join(VID, name + ".mp4"), p = path.join(POS, name + ".jpg"); if (!fs.existsSync(v) || fs.existsSync(p)) continue;
  const m = meta[name], dur = (m.t1 - m.t0) / m.rate; execFileSync(process.env.FFMPEG || "ffmpeg", ["-v", "error", "-y", "-ss", (dur * 0.55).toFixed(2), "-i", v, "-frames:v", "1", "-q:v", "4", "-vf", "scale=1600:-2", p]); }
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lab = (page, q) => `http://127.0.0.1:8361/sandbox/visual/${page || "dribble12.html"}?${q}`;
const PN = { "dribble1.html": "DRIBBLE-1", "dribble11.html": "DRIBBLE-1.1", "dribble12.html": "DRIBBLE-1.2" };
const fig = (name, cap, big) => { const m = meta[name]; if (!m || !fs.existsSync(path.join(VID, name + ".mp4"))) return `<p class="miss">missing ${name}</p>`;
  const cam = /zoom=/.test(m.q || "") ? "the Touchline gameplay camera zoomed 2.6×" : "the real Touchline gameplay camera";
  const view = m.sbs ? `${m.pages.map((p) => PN[p] || p).join(" | ")}, same scenario / seed / player, frame-synchronised, 1× speed, ${cam}` : m.view === "game" || m.view === "half" ? `1× ${cam}` : `close view (${m.view}) at ${m.rate}× speed${/diag=1/.test(m.q) ? ", geometry diagnostics on" : ""}`;
  const links = m.sbs ? m.pages.map((p) => `<a href="${lab(p, m.q.replace(/&?diag=1/, ""))}">${PN[p]} lab</a>`).join(" · ") : `<a href="${lab(m.page, m.q)}">open in the lab</a>`;
  return `<figure class="${big ? "big" : ""}"><video controls muted loop playsinline preload="none" poster="../posters/${name}.jpg" src="../videos/${name}.mp4"></video><figcaption><b>${esc(cap)}</b><br><span class="mut">${view} · sim ${m.t0}–${m.t1} s · <code>${name}.mp4</code> · ${links}</span></figcaption></figure>`; };
const grid = (n, items) => `<div class="g${n}">${(items || []).map(([a, b]) => fig(a, b)).join("")}</div>`;
const strip = (s) => { const f = path.join(ROOT, "stills", s.file); return fs.existsSync(f) ? `<figure><img src="../stills/${s.file}" style="width:100%;border-radius:4px"><figcaption><b>${esc(s.caption)}</b></figcaption></figure>` : `<p class="miss">missing still ${s.file}</p>`; };
const td = (x) => `<td>${x == null ? "—" : esc(x)}</td>`, pct = (x) => (x == null ? "—" : (+x).toFixed(0) + " %");
const VERS = ["d1", "d11", "d12"], VN = { d1: "DRIBBLE-1", d11: "DRIBBLE-1.1", d12: "DRIBBLE-1.2" };
// ── reliability (three cores, one instrument) ──────────────────────────────────────────────────────────────────────────────────────────────────────
const rel = { d1: {}, d11: {}, d12: {} }; for (const v of VERS) for (let g = 1; g <= 6; g++) Object.assign(rel[v], J(`rel_${v}_g${g}.json`) || {});
const first8 = (o) => o && o.rows ? o.rows.filter((r) => r.seed <= 8) : [];
const cnt = (o, n8, f) => { if (!o || !o.rows || !o.rows[0].turn) return "—"; const r = n8 ? first8(o) : o.rows; return `${r.filter(f).length}/${r.length}`; };
const takenStr = (o, n8) => cnt(o, n8, (x) => x.turn.takenWithBall), cleanStr = (o, n8) => cnt(o, n8, (x) => x.turn.quality && x.turn.quality.takenCleanly);
const heldStr = (o, n8) => { if (!o || !o.rows) return "—"; const r = n8 ? first8(o) : o.rows; return `${r.filter((x) => x.end === "CONTROLLED").length}/${r.length}`; };
const ids = Object.keys(rel.d12);
const reltable = `<div class="tw"><table><tr><th>scenario</th>${VERS.map((v) => `<th colspan="3">${VN[v]}</th>`).join("")}<th colspan="4">DRIBBLE-1.2 touches</th></tr>
<tr><th></th>${VERS.map(() => `<th>controlled</th><th>held to end · 1–8 / 1–16</th><th>taken with ball · 1–8 / 1–16 (cleanly)</th>`).join("")}<th>touch m/s</th><th>same-foot 2nd ≤ 250 ms</th><th>regions</th><th>preferred foot</th></tr>
${ids.map((id) => `<tr><td><b>${id}</b></td>${VERS.map((v) => { const o = rel[v][id]; return o ? td(pct(o.controlledPct)) + td(heldStr(o, true) + " · " + heldStr(o)) + td(o.rows[0].turn ? `${takenStr(o, true)} · ${takenStr(o)} (${cleanStr(o, true)} · ${cleanStr(o)})` : "—") : td(null) + td(null) + td(null); }).join("")}${(() => { const o = rel.d12[id]; return td(o.touchSpeedMean) + td(`${o.secondSame250}/${o.launched}`) + td(Object.entries(o.regions).map(([k, n]) => `${k} ${n}`).join(" · ")) + td(pct(o.preferredFootPct)); })()}</tr>`).join("")}</table></div>`;
// ── contact distribution, straight vs cuts; decisive surfaces; preferred foot by category ───────────────────────────────────────────────────────────
const CAT = { STRAIGHT: ["STRAIGHT_JOG", "STRAIGHT_RUN", "STRAIGHT_FAST", "STRAIGHT_SPRINT", "STRAIGHT_RUN_FAR"], CURVE: ["CURVE_RUN", "CURVE_JOG"], "60°": ["CUT60_RUN", "CUT60L_RUN", "CUT60_RUN_FAR"], "90°": ["CUT90_RUN", "CUT90L_RUN", "CUT90_JOG"], CUTS: ["CUT45_RUN", "CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN", "CUT90_JOG", "CUT60_RUN_FAR"] };
const touches = (v, cat, cutOnly) => { const out = []; for (const id of CAT[cat]) { const o = rel[v][id]; if (!o) continue; for (const r of o.rows) for (const x of r.touchRows) if (!cutOnly || x.cut || x.stage) out.push(x); } return out; };
const dist = (arr) => { const n = arr.length, c = {}; for (const x of arr) c[x.reg] = (c[x.reg] || 0) + 1; return n ? ["FRONT", "OUTSIDE", "INSIDE", "LACES"].map((k) => `${k} ${(100 * (c[k] || 0) / n).toFixed(0)} %`).join(" · ") + ` (n ${n})` : "—"; };
const decisive = (v, cat) => { const c = {}; let n = 0; for (const id of CAT[cat]) { const o = rel[v][id]; if (!o) continue; for (const r of o.rows) { const d = r.turn && r.turn.quality && r.turn.quality.decisive; if (d) { c[d.reg] = (c[d.reg] || 0) + 1; n++; } } } return n ? ["FRONT", "OUTSIDE", "INSIDE", "LACES"].map((k) => `${k} ${(100 * (c[k] || 0) / n).toFixed(0)} %`).join(" · ") + ` (n ${n})` : "—"; };
const prefPct = (v, cat) => { const a = touches(v, cat, false), pf = "R"; return a.length ? `${(100 * a.filter((x) => x.F === pf).length / a.length).toFixed(0)} %` : "—"; };
const disttable = `<div class="tw"><table><tr><th>core</th><th>STRAIGHT — all touches</th><th>CUTS — all touches in cut scenarios</th><th>CUTS — the decisive touch (first within 25° of the request)</th><th>preferred foot: straight · curve · 60° · 90°</th></tr>
${VERS.map((v) => `<tr><td><b>${VN[v]}</b></td>${td(dist(touches(v, "STRAIGHT", false)))}${td(dist(touches(v, "CUTS", false)))}${td(decisive(v, "CUTS"))}${td(["STRAIGHT", "CURVE", "60°", "90°"].map((c) => prefPct(v, c)).join(" · "))}</tr>`).join("")}</table></div>`;
// ── cut quality (the owner's §13 / §28): per cut scenario and core ────────────────────────────────────────────────────────────────────────────────
const QS = ["CUT45_RUN", "CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN"];
const st = J("setup_stats_d12.json");
const qtable = `<div class="tw"><table><tr><th>scenario</th><th>core</th><th>request → set-up · first redirect ≥ 20° · plant · ball within 20° · body within 20° (s, median)</th><th>touches to ball20</th><th>set-up used · decisive was the first touch</th><th>set-up speed m/s · error at the decisive contact m</th><th>decisive speed m/s · surfaces</th><th>final ball heading error °</th></tr>
${QS.map((id) => VERS.map((v) => { const o = rel[v][id]; if (!o || !o.quality) return ""; const q = o.quality, s2 = v === "d12" && st && st[id];
  return `<tr><td>${v === "d1" ? `<b>${id}</b>` : ""}</td><td>${VN[v]}</td>${td(`${q.toSetupS ?? "–"} · ${q.toRedirectS ?? "–"} · ${q.toPlantS ?? "–"} · ${q.toBall20S ?? "–"} · ${q.toBody20S ?? "–"}`)}${td(q.touchesToBall20)}${td(`${q.setupUsedPct} % · ${q.setupFromExistingTouchPct} %`)}${td(s2 ? `${s2.setupSpeedMean ?? "–"} · ${q.setupErrAtDecisiveM ?? "–"}` : `– · ${q.setupErrAtDecisiveM ?? "–"}`)}${td(`${q.decisiveSpeed ?? "–"} · ${Object.entries(q.decisiveRegions).map(([k, n]) => `${k} ${n}`).join(" ")}`)}${td(q.finalBallHeadingErrDeg)}</tr>`; }).join("")).join("")}</table></div>`;
// cut touch speed and request-to-redirection, 1 → 1.1 → 1.2 (all cut scenarios)
const cutSpeed = (v) => { const a = touches(v, "CUTS", true).map((x) => x.speed).sort((p, q) => p - q); return a.length ? `${(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2)} mean · ${a[a.length >> 1].toFixed(2)} median · ≥ 9 m/s ${a.filter((x) => x >= 9).length}/${a.length}` : "—"; };
const medOf = (v, key) => { const a = []; for (const id of QS) { const o = rel[v][id]; if (o) for (const r of o.rows) { const q = r.turn && r.turn.quality; if (q && q[key] != null) a.push(q[key]); } } a.sort((p, q) => p - q); return a.length ? `${a[a.length >> 1].toFixed(2)} s (n ${a.length})` : "—"; };
const speedtable = `<div class="tw"><table><tr><th>core</th><th>cut / stage touch launch speed (all cut scenarios, 16 seeds)</th><th>request → first meaningful redirect (≥ 20°)</th><th>request → ball within 20°</th><th>request → TURN-1.2 plant</th></tr>
${VERS.map((v) => `<tr><td><b>${VN[v]}</b></td>${td(cutSpeed(v))}${td(medOf(v, "toRedirectS"))}${td(medOf(v, "toBall20S"))}${td(medOf(v, "toPlantS"))}</tr>`).join("")}</table></div>`;
// ── other evidence ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const free = J("free_ball_audit.json"), twin = J("twin_identity.json"), pc = { d1: J("plant_check_d1.json"), d11: J("plant_check_d11.json"), d12: J("plant_check_d12.json") }, pinch = J("pinch_stress.json"), ch = J("chrome_d12.json"), cpu = J("cpu.json");
const attrs = ["AVERAGE", "POOR", "WEAKFOOT", "LEFT_HIGH"].map((p) => [p, J(`attr_d12_${p}.json`)]).filter(([, x]) => x), AS = ["STRAIGHT_RUN", "CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN"];
const atable = `<div class="tw"><table><tr><th>profile (DRIBBLE-1.2, seeds 1–8)</th><th>player</th>${AS.map((s) => `<th>${s} controlled · held · taken</th>`).join("")}</tr>
<tr><td><b>HIGH</b></td>${td(rel.d12.STRAIGHT_RUN && rel.d12.STRAIGHT_RUN.profile)}${AS.map((s) => { const o = rel.d12[s]; return o ? td(`${pct(first8(o).reduce((a, r) => a + r.controlledPct, 0) / 8)} · ${heldStr(o, true)} · ${o.rows[0].turn ? takenStr(o, true) : "—"}`) : td(null); }).join("")}</tr>
${attrs.map(([p, x]) => `<tr><td><b>${p}</b></td>${td(x.STRAIGHT_RUN.profile)}${AS.map((s) => x[s] ? td(`${pct(x[s].controlledPct)} · ${heldStr(x[s])} · ${x[s].takenWithBall || "—"}`) : td(null)).join("")}</tr>`).join("")}</table></div>`;
const cputable = cpu ? `<div class="tw"><table><tr><th>scenario</th>${cpu.versions.map((v) => `<th>${VN[v]} resolver ms / sim s</th>`).join("")}${cpu.versions.map((v) => `<th>${VN[v]} worst step ms</th>`).join("")}</tr>
${Object.entries(cpu.perScenario).map(([id, r]) => `<tr><td><b>${id}</b></td>${cpu.versions.map((v) => td(r[v].resolverMsPerSimS)).join("")}${cpu.versions.map((v) => td(r[v].worstStepMs)).join("")}</tr>`).join("")}
<tr><td><b>ALL</b></td>${cpu.versions.map((v) => td(cpu.all[v].resolverMsPerSimS)).join("")}${cpu.versions.map((v) => td(cpu.all[v].worstStepMs)).join("")}</tr></table></div>
<div class="tw"><table><tr><th>core</th><th>µs / 240 Hz step</th><th>p99 · p99.9 step ms</th><th>steps over 4 · 8 · 20 ms</th><th>planning passes / s</th><th>22 players, one dribbler (ms / sim s)</th><th>two contesting</th><th>all 22 dribbling</th></tr>
${cpu.versions.map((v) => { const a = cpu.all[v], p = cpu.projection22[v]; return `<tr><td><b>${VN[v]}</b></td>${td(a.resolverUsPerStep)}${td(`${a.p99StepMs} · ${a.p999StepMs}`)}${td(`${a.stepsOver4msPct} % · ${a.stepsOver8msPct} % · ${a.stepsOver20msPct} %`)}${td(a.plansPerSimS)}${td(p.oneDribbler)}${td(p.twoContesting)}${td(p.allTwentyTwoDribbling)}</tr>`; }).join("")}</table></div>` : `<p class="miss">cpu.json missing</p>`;
const chromeLine = (c) => c ? `Node ${c.node} vs ${esc(c.chrome)} — decisions <b>${c.summary.decisionsIdentical}/${c.summary.total}</b> identical (every touch tick, foot, region, launch / cancel; the cut timeline; control changes); state bit-identical in ${c.summary.stateIdentical}/${c.summary.total}, otherwise last-bit differences (largest ${Math.max(...Object.values(c.results).map((r) => r.maxStateDiff || 0)).toExponential(1)} m or rad) from the engines' maths libraries` : "missing";
const plantLine = (v) => { const p = pc[v]; return p && p.TOTAL ? `${VN[v]}: ${p.TOTAL.adjustedTicks} adjusted ticks; stance foot / toe vs TURN-1.2's own pose of the same state max <b>${(p.TOTAL.stanceFootMaxDevM * 1000).toFixed(4)} mm</b>; unadjusted swing feet <b>${(p.TOTAL.unadjustedSwingFootMaxDevM * 1000).toFixed(4)} mm</b>` : `${VN[v]}: missing`; };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DRIBBLE-1.2 review</title>
<style>:root{--bg:#0f1412;--fg:#e6efe9;--mut:#9fb3a8;--card:#16201b;--line:#2c3d34;--acc:#8cffaa;--warn:#ffd45e;--bad:#ff8a7a}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif}main{max-width:1600px;margin:0 auto;padding:16px 22px 60px}
a{color:#9fd8ff}code{font:12.5px ui-monospace,Menlo,monospace;color:#cfe}h1{font-size:24px;margin:6px 0}h2{font-size:19px;margin:34px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:18px 0 6px}
.card{background:var(--card);border-radius:8px;padding:10px 14px;margin:10px 0}.mut{color:var(--mut)}.miss{color:var(--bad)}.vl{font-family:ui-monospace,Menlo,monospace;font-size:13.5px;line-height:1.75}.vl b{color:var(--acc)}.vl b.p{color:var(--warn)}.vl b.f{color:var(--bad)}
video{width:100%;background:#000;border-radius:4px;display:block}figure{margin:6px 0 12px}figcaption{font-size:13px;margin-top:4px}.g1,.g2,.g3{display:grid;gap:12px}.g1{grid-template-columns:1fr}.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
@media(max-width:1100px){.g2,.g3{grid-template-columns:1fr}}.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12.5px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600}li{margin:3px 0}</style></head><body><main>
<h1>DRIBBLE-1.2 — cut contact geometry / set-up touch</h1>
<p class="mut">${esc(S.date)} · branch <code>prototype/dribble-1</code> (DRIBBLE-1 <code>7fe57fd3</code> and DRIBBLE-1.1 <code>7d8c8524</code> preserved, their files untouched) · instruction <code>review_artifacts/dribble12/sources/2026-10-17_user_instruction_dribble1_2_cut_contact_geometry_setup_touch.md</code> · <b>local review page</b> (real player names) · live labs: <a href="${lab("dribble12.html", "scn=CUT60_RUN&diag=1")}">DRIBBLE-1.2</a> · <a href="${lab("dribble11.html", "scn=CUT60_RUN")}">DRIBBLE-1.1</a> · <a href="${lab("dribble1.html", "scn=CUT60_RUN")}">DRIBBLE-1</a></p>
<div class="card vl">${S.statusLines.map(([k, v]) => `${esc(k)}: <b class="${/PARTIAL|FAIL/.test(v) && !/^PASS/.test(v) ? (/^FAIL|^NO/.test(v) ? "f" : "p") : ""}">${esc(v)}</b>`).join("<br>")}</div>
<p class="mut">I cannot play video in real time; every judgement on this page was made from frame strips and stills of these clips.</p>
<h2>Three videos to watch first</h2>${S.watchFirst.map(([n, c]) => fig(n, c, true)).join("")}
<h2>A — 60° right: DRIBBLE-1 | DRIBBLE-1.1 | DRIBBLE-1.2</h2>${grid(1, S.videos.A)}
<h2>B — 60° left</h2>${grid(1, S.videos.B)}
<h2>C — 90° right</h2>${grid(1, S.videos.C)}
<h2>D — 90° left</h2>${grid(1, S.videos.D)}
<h2>E — outside-foot hero: set-up → outside contact → redirect → TURN-1.2's plant unchanged</h2><div class="card">${S.heroE || ""}</div>${(S.stillsE || []).map(strip).join("")}${grid(2, S.videos.E)}
<h2>F — inside-foot hero</h2><div class="card">${S.heroF || ""}</div>${(S.stillsF || []).map(strip).join("")}${grid(2, S.videos.F)}
<h2>G — straight RUN: DRIBBLE-1 | DRIBBLE-1.1 | DRIBBLE-1.2</h2>${grid(1, S.videos.G)}
<h2>How DRIBBLE-1.2 works</h2><div class="card"><ul>${S.howItWorks.map((x) => `<li>${x}</li>`).join("")}</ul></div>
<h2>Evidence</h2>
<h3>Contact distribution — straight vs cuts, and the preferred foot (HIGH, right-footed, 16 seeds)</h3>${disttable}
<h3>Cut quality — set-up, timing, decisive contact (HIGH, 16 seeds; medians)</h3>${qtable}
<h3>Cut touch speed and request-to-redirection, DRIBBLE-1 → 1.1 → 1.2</h3>${speedtable}
<h3>Reliability — every lab scenario, HIGH profile, resolved touches, seeds 1–16 (the owner's targets are X/8: seeds 1–8)</h3>${reltable}
<h3>Attributes</h3>${atable}
<h3>CPU — one dribbler + ball, the three cores in one process (Node ${cpu ? cpu.node : ""})</h3>${cputable}<div class="card">${S.cpuNote || ""}</div>
<h3>The optimisation twin</h3><div class="card">${twin ? `DRIBBLE-1.2's core with <code>opts.twin</code> (every DRIBBLE-1.1 / 1.2 behaviour off) against the frozen DRIBBLE-1 core: <b>${twin.summary.identical}/${twin.summary.total}</b> runs bit-identical (every scenario × ${Object.keys(twin.runs).length / Math.max(1, new Set(Object.keys(twin.runs).map((k) => k.split(":")[0])).size)} seeds: every touch, kernel event, cut timeline, control change and the full 240 Hz record)` : "missing"}</div>
<h3>Chrome / Node</h3><div class="card">${chromeLine(ch)}</div>
<h3>No tether — the free-ball audit</h3><div class="card">${free ? `Over <b>${free.TOTAL.freeTicks}</b> free-ball ticks (every scenario × 8 seeds) the live ball against a collider-free re-simulation from its own state: <b>${free.TOTAL.unexplainedDeviatingTicks}</b> deviating tick${free.TOTAL.unexplainedDeviatingTicks === 1 ? "" : "s"} more than one tick after a contact (largest ${(free.TOTAL.maxUnexplainedDeviation * 1000).toFixed(2)} mm); ${free.TOTAL.contactPersistenceTicks} contact-persistence ticks. ${S.freeNote || ""}` : "missing"}</div>
<h3>TURN-1.2 unchanged</h3><div class="card">${VERS.map(plantLine).join("<br>")}<br>${S.plantNote || ""}</div>
<h3>Pinched ball</h3><div class="card">${pinch ? `${pinch.bare.samples} random leg wedges: the bare BALL-FEEL-1.3 kernel failed closed (threw) in <b>${pinch.bare.threw}</b>; through the resolver's kernel step: unrecovered steps <b>${pinch.recovered.unrecoveredSteps}</b>, non-finite states <b>${pinch.recovered.nonFinite}</b>, lowest ball centre ${pinch.recovered.minBallHeight.toFixed(3)} m. ${S.pinchNote || ""}` : "missing"}</div>
<h2>Defects and next step</h2><div class="card"><h3>Three biggest remaining V1 defects</h3><ol>${S.visualDefects.map((x) => `<li>${x}</li>`).join("")}</ol><h3>Exact next shipping step</h3><p>${S.nextStep}</p></div>
<h2>Provenance</h2><div class="card"><ul>${S.provenance.map((x) => `<li>${x}</li>`).join("")}</ul></div>
</main></body></html>`;
fs.writeFileSync(path.join(OUT, "DRIBBLE12_REVIEW.html"), html); console.log("wrote", path.join(OUT, "DRIBBLE12_REVIEW.html"));

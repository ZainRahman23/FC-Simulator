// ═══ receive_turn1/rt_var_page.js — RECEIVE-TURN-1 phase 1: the EXECUTION-VARIANCE page ═══════════════════════════════════════════════════════════
// "What does the natural execution range of a BC70 player actually look like?" Two modes, for a kill benchmark or a receive-and-turn case:
//   SAME RATING   one Ball Control, N keyed seeds (the bounded receive-control-v2 draws): every seed's episode as a tile, an overlay of all their
//                 ball paths in one view, the N-seed quantiles and the 1000-seed (kill) / 200-seed (turn) evidence of record
//   SAME DRAW     one seed at BC 30 … 99: the same execution tendency, progressively better controlled (matched counterfactual)
// Every tile opens the lab with the same seed and rating. Computed in the page with the same code as the Node evidence.
import { prepare, runBC, runEpisode, firstContact, drawsFor, DT } from "./rk_sim.js";
import { setScale } from "./rk_model.js";
import { THREE_BENCH } from "./rk_conditions.js";
import { view, extents, COL } from "./rk_draw.js";
import { prepareTurn, runTurn, FAMILIES } from "./rt_sim.js";
import { turnTop, turnData, turnExtents, TCOL } from "./rt_draw.js";
const Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s), f2 = (x) => (x == null || !isFinite(x) ? "–" : x.toFixed(2));
const ST = { kind: Q.get("kind") || "kill", bench: Q.get("bench") || "HARD", theta: +(Q.get("theta") || 120), v: +(Q.get("v") || 12), bc: +(Q.get("bc") || 70), n: +(Q.get("n") || 16), mode: Q.get("mode") || "rating", seed: +(Q.get("seed") || 1) };
const LADDER = [30, 50, 60, 70, 80, 90, 99], CLS = ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"];
let EV = { kill: null, turn: null };
async function loadEv(k) { if (EV[k] !== null) return EV[k]; const f = k === "kill" ? "var_distribution.json" : "turn_matrix.json"; try { const r = await fetch("../../review_artifacts/receive_turn1/evidence/" + f); EV[k] = r.ok ? await r.json() : false; } catch (e) { EV[k] = false; } return EV[k]; }
const q = (a, p) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const seedCol = (i, n) => `hsl(${Math.round(360 * i / n)}, 75%, 62%)`;
function killEp(P, bc, seed) { const spec = { seed }, r1 = runBC(P, bc, drawsFor({ seed, event: "kill1", contact: 0 }), { post: 2.2, every: 4 }), ep = runEpisode(P, bc, spec, { every: 2 }), fc = firstContact(P, r1.ex, r1.run), grp = P.plan.sf.S.group;
  return { bc, seed, ep, fc, m: ep.m, cls: ep.m.continuation, place: grp === "FOOT" ? fc["e2"] : fc.dropErr, path: ep.rec.filter((r) => r.i <= 2.6 / DT).map((r) => r.p), N: ep.contacts[0].N }; }
function turnEp(P, bc, seed) { const ep = runTurn(P, bc, { seed }, { every: 4, carry: false }); return { bc, seed, ep, m: ep.m, cls: ep.m.cls, place: ep.m.place, path: ep.rec.filter((r) => r.i <= 2.2 / DT).map((r) => r.p), N: ep.N }; }
async function build() {
  const t0 = performance.now(), grid = $("#grid"), ov = $("#overlay"), sum = $("#summary"); grid.innerHTML = ""; setScale("B");
  const kill = ST.kind === "kill", P = kill ? prepare(THREE_BENCH.find((b) => b.id === ST.bench).cond) : prepareTurn({ v: ST.v, theta: ST.theta });
  const runs = ST.mode === "rating" ? Array.from({ length: ST.n }, (_, i) => (kill ? killEp : turnEp)(P, ST.bc, i + 1)) : LADDER.map((bc) => (kill ? killEp : turnEp)(P, bc, ST.seed));
  const title = kill ? THREE_BENCH.find((b) => b.id === ST.bench).title : `${ST.theta > 0 ? "+" : ""}${ST.theta}° receive-and-turn · ${ST.v} m/s pass · ${FAMILIES[P.A.fid].label} (${P.A.F} ${P.A.surface.toLowerCase()})`;
  $("#title").textContent = ST.mode === "rating" ? `${title} — BC ${ST.bc}, ${ST.n} different seeds (the bounded keyed draws)` : `${title} — seed ${ST.seed} at BC ${LADDER.join(" / ")} (the same draws in every tile)`;
  // tiles
  let ext = null, grp = null, inc = [], idealPath = null;
  if (kill) { grp = P.plan.sf.S.group; const kc = P.kc; for (let k = Math.max(0, kc - Math.round(0.5 / DT)); k <= kc; k += 3) inc.push(P.pred.P[k].p); const IE = runEpisode(P, 99, { example: "PERFECT" }); idealPath = IE.rec.filter((r) => r.i <= 2.6 / DT).map((r) => r.p);
    ext = extents([inc.filter((p) => p[0] - P.contact[0] < 2.0), idealPath, ...runs.map((r) => r.path), [[0, 0, grp === "FOOT" ? 0.5 : 1.8]]], grp === "FOOT" ? { near: 3.2 } : {}); }
  runs.forEach((x, i) => {
    const td = document.createElement("div"); td.className = "tile"; const cv = document.createElement("canvas"), cw = 210, ch = kill ? 210 : 190, dpr = window.devicePixelRatio || 1; cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + "px"; cv.style.height = ch + "px"; const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    if (kill) { const e = x.ep, d = { incoming: inc, ideal: idealPath, actual: x.path, contact: P.contact, target: P.ideal.target, group: grp, follow: e.contacts.slice(1).map((c) => ({ p: c.contact, label: String(c.n) })), stable: e.m.stablePoint, moves: [e.contacts[0].stance].concat(e.contacts.slice(1).map((c) => c.stance)), drop: grp !== "FOOT" ? x.fc.drop : null, dropIdeal: grp !== "FOOT" ? x.fc.dropIdeal : null };
      if (grp === "FOOT") view(ctx, "top", { x: 0, y: 0, w: cw, h: ch }, ext, d, { scale: i === 0, font: 8, followLabels: false });
      else { view(ctx, "side", { x: 0, y: 0, w: cw, h: Math.round(ch * 0.5) }, ext, d, { scale: i === 0, font: 8 }); view(ctx, "top", { x: 0, y: Math.round(ch * 0.5), w: cw, h: ch - Math.round(ch * 0.5) }, ext, d, { scale: false, bg: "#0f1613", followLabels: false }); } }
    else { const D = turnData(P, x.ep, { tEnd: 2.0 }); turnTop(ctx, { x: 0, y: 0, w: cw, h: ch }, turnExtents(D), D, { font: 9, lw: 1.2, labels: false, scale: false }); }
    const a = document.createElement("a"); a.target = "_blank"; a.href = kill ? `receive_turn1_kill_lab.html?${new URLSearchParams(Object.assign({ v: 12, h: 0.11, drop: 0, bear: 0, lat: 0, surface: "AUTO" }, THREE_BENCH.find((b) => b.id === ST.bench).cond, { bc: x.bc, draw: "seed" + x.seed, scale: "B" })).toString()}` : `receive_turn1_lab.html?theta=${ST.theta}&v=${ST.v}&bc=${x.bc}&draw=seed${x.seed}`; a.appendChild(cv); td.appendChild(a);
    const m = x.m, N = x.N, dims = kill ? `d ${f2(N.reb)} · dir ${f2(N.lat)} · v ${f2(N.third)}` : `d ${f2(N.damping)} · w ${f2(N.weight)} · dir ${f2(N.direction)} · v ${f2(N.vertical)}`;
    const extra = kill ? `stable ${m.tStable == null ? "—" : f2(m.tStable) + " s"} · n${m.contacts}` : `go ${m.tCont == null ? "—" : f2(m.tCont) + " s"} · ${m.contacts} touch${m.contacts > 1 ? "es" : ""}`;
    const lbl = document.createElement("div"); lbl.className = "lbl"; lbl.innerHTML = `<b>${ST.mode === "rating" ? "seed " + x.seed : "BC " + x.bc}</b> <span class="chip" style="background:${COL.cls[x.cls]}">${x.cls}</span><br>placement ${f2(x.place)} m · ${extra}<br>step ${m.extraAdj == null ? "—" : f2(m.extraAdj)} m · <span class="dim">draws ${dims}</span>`; td.appendChild(lbl); grid.appendChild(td);
  });
  // overlay of every run's ball path (top view), coloured per seed / rating
  { const c = ov, cw = c.clientWidth, chh = c.clientHeight, dpr = window.devicePixelRatio || 1; c.width = cw * dpr; c.height = chh * dpr; const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    const col = (i) => (ST.mode === "rating" ? seedCol(i, runs.length) : `hsl(${Math.round(130 * (LADDER[i] - 30) / 69)}, 80%, 60%)`);
    if (kill) { const d = { incoming: inc, ideal: idealPath, actual: null, contact: P.contact, target: P.ideal.target, group: grp, ladder: runs.map((r, i) => ({ p: r.m.stablePoint || r.m.finalBall, label: ST.mode === "rating" ? String(r.seed) : String(r.bc), color: col(i) })) };
      view(ctx, "top", { x: 0, y: 0, w: cw, h: chh }, ext, d, { scale: true, font: 10, ladderLabels: true, label: "OVERLAY — every run's ball path (top view)" });
      runs.forEach((r, i) => view(ctx, "top", { x: 0, y: 0, w: cw, h: chh }, ext, { actual: r.path }, { bg: "rgba(0,0,0,0)", noGrid: true, actualCol: col(i), scale: false, lw: 0.8 })); }
    const D0 = kill ? null : turnData(P, runs[0].ep, { tEnd: 2.0 }); if (!kill) { D0.actual = null; D0.vActual = null; D0.meet = null; D0.ghosts = runs.map((r, i) => ({ path: r.path, col: col(i), end: r.m.meet ? r.m.meet.ball : null })); D0.fit = D0.fit.concat(...runs.map((r) => r.path.filter((p, j) => j % 12 === 0 && j < 200))); turnTop(ctx, { x: 0, y: 0, w: cw, h: chh }, turnExtents(D0), D0, { font: 10, title: "OVERLAY — every run's ball path", labels: true }); }
  }
  // summary: the N runs' quantiles and the evidence of record
  const ev = await loadEv(ST.kind), pl = runs.map((r) => r.place), tt = runs.map((r) => (kill ? r.m.tStable : r.m.tCont)), adj = runs.map((r) => r.m.extraAdj), cnt = {}; for (const k of CLS) cnt[k] = runs.filter((r) => r.cls === k).length;
  let evHtml = "";
  if (ev && ST.mode === "rating") {
    if (kill) { const B = ev.benchmarks[ST.bench], c = B && B.modes.v2[ST.bc]; if (c) evHtml = `<h3>Evidence of record — ${ev.nSeeds} seeds at BC ${ST.bc} (receive-control-v2 draws)</h3><table><tr><th></th><th>min</th><th>p10</th><th>p25</th><th>median</th><th>p75</th><th>p90</th><th>max</th></tr>${[["place", "first-touch placement (m)"], ["resid", "residual speed (m/s)"], ["tStable", "time to stable control (s)"], ["recDist", "recovery distance (m)"], ["contacts", "contacts"]].map(([k, l]) => `<tr><td>${l}</td>${["min", "p10", "p25", "p50", "p75", "p90", "max"].map((p) => `<td>${f2(c[k] && c[k][p])}</td>`).join("")}</tr>`).join("")}</table><p>${CLS.map((k) => `${k.toLowerCase()} ${(100 * c.cls[k]).toFixed(0)}%`).join(" · ")}</p>`; }
    else { const key = `${{ 6: "SLOW", 12: "NORMAL", 18: "FIRM" }[ST.v]}_${ST.theta}`, cell = ev.cells && ev.cells[key], c = cell && cell.bc && cell.bc[ST.bc]; if (c) evHtml = `<h3>Evidence of record — ${ev.blocks && Object.values(ev.blocks)[0] ? Object.values(ev.blocks)[0].nSeeds : ""} seeds at BC ${ST.bc}</h3><table><tr><th></th><th>min</th><th>p10</th><th>p25</th><th>median</th><th>p75</th><th>p90</th><th>max</th></tr>${[["place", "placement at the planned meeting (m)"], ["tCont", "time to continuation (s)"], ["extraAdj", "correction (m)"], ["dirErrAbs", "touch direction error (°)"], ["contacts", "touches"]].map(([k, l]) => `<tr><td>${l}</td>${["min", "p10", "p25", "p50", "p75", "p90", "max"].map((p) => `<td>${f2(c[k] && c[k][p])}</td>`).join("")}</tr>`).join("")}</table><p>${CLS.map((k) => `${k.toLowerCase()} ${(100 * c.cls[k]).toFixed(0)}%`).join(" · ")}</p>`; }
  }
  sum.innerHTML = `<h3>These ${runs.length} runs</h3><table><tr><th></th><th>p10</th><th>median</th><th>p90</th><th>max</th></tr><tr><td>placement (m)</td><td>${f2(q(pl, 0.1))}</td><td>${f2(q(pl, 0.5))}</td><td>${f2(q(pl, 0.9))}</td><td>${f2(Math.max(...pl.filter((x) => x != null)))}</td></tr><tr><td>${kill ? "stable" : "continuation"} (s)</td><td>${f2(q(tt, 0.1))}</td><td>${f2(q(tt, 0.5))}</td><td>${f2(q(tt, 0.9))}</td><td>${f2(Math.max(...tt.filter((x) => x != null)))}</td></tr><tr><td>step (m)</td><td>${f2(q(adj, 0.1))}</td><td>${f2(q(adj, 0.5))}</td><td>${f2(q(adj, 0.9))}</td><td>${f2(Math.max(...adj.filter((x) => x != null)))}</td></tr></table><p>${CLS.map((k) => `<span class="chip" style="background:${COL.cls[k]}">${k}</span> ${cnt[k]}`).join(" ")}</p>${evHtml}<p class="dim">computed in ${((performance.now() - t0) / 1000).toFixed(1)} s</p>`;
  window.RTV_READY = true;
}
function controls() {
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o) => `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
  $("#ctl").innerHTML = `<label>${sel("kind", [["kill", "kill benchmark"], ["turn", "receive-and-turn"]], ST.kind)}</label><label>benchmark ${sel("bench", THREE_BENCH.map((b) => [b.id, b.title]), ST.bench)}</label>
    <label>turn ${sel("theta", [0, 30, 60, 90, 120, 135, 150, 180, -90, -135, -180].map((a) => [a, (a > 0 ? "+" : "") + a + "°"]), ST.theta)}</label><label>pass ${sel("v", [[6, "6 m/s"], [12, "12 m/s"], [18, "18 m/s"]], ST.v)}</label>
    <label>mode ${sel("mode", [["rating", "same rating, different seeds"], ["draw", "same draw, BC 30 … 99"]], ST.mode)}</label><label>Ball Control ${sel("bc", [30, 50, 60, 70, 80, 90, 99].map((b) => [b, b]), ST.bc)}</label><label>seeds ${sel("n", [[10, 10], [16, 16], [20, 20]], ST.n)}</label><label>seed ${sel("seed", Array.from({ length: 30 }, (_, i) => [i + 1, i + 1]), ST.seed)}</label>
    <a href="receive_turn1_lab.html" target="_blank">turn lab ↗</a> <a href="receive_turn1_kill_lab.html" target="_blank">kill lab ↗</a>`;
  const go = () => { const u = new URL(location.href); for (const k of Object.keys(ST)) u.searchParams.set(k, ST[k]); history.replaceState(null, "", u.toString()); build(); };
  for (const k of Object.keys(ST)) { const el = $("#" + k); if (el) el.onchange = (e) => { ST[k] = ["theta", "v", "bc", "n", "seed"].includes(k) ? +e.target.value : e.target.value; go(); }; }
}
controls(); build();

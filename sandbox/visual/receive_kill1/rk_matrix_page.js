// ═══ receive_kill1/rk_matrix_page.js — RECEIVE-KILL-1: THE CALIBRATION MATRIX (rows = one incoming ball, columns = Ball Control 10 … 99 with the
// SAME standardised execution draws). Each cell runs the real chain in the page (incoming pass → KILL plan → ideal → Ball Control execution → one
// kernel launch → free ball) and draws the result: side view (height) above, top view (lateral) below — incoming grey, IDEAL green dashed, ACTUAL
// orange, the intended point a green ring, the contact marker in the surface's colour, the receiver at the contact (placeholder body).
import { prepare, runBC, drawsFor, EXAMPLES, DT, SIM } from "./rk_sim.js";
import { RK, BC_STEPS, SURFACES, relErr } from "./rk_model.js";
import { MATRICES, BENCHMARKS, condOf, condLabel } from "./rk_conditions.js";
import { KillBody } from "./rk_body.js";
import { view, extents, COL } from "./rk_draw.js";
const W = window, M4G = typeof M4 !== "undefined" ? M4 : W.M4, Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s);
const ST = { matrix: Q.get("m") || "GROUND", draw: Q.get("draw") || "TYPICAL", zoom: Q.get("zoom") || "fit", views: Q.get("views") || "both", dist: Q.get("dist") !== "0", skel: null, distData: null, busy: false };
const SETS = MATRICES.concat([{ id: "BENCH", title: "Benchmarks — the owner's easy, hard and aerial tests", surface: "AUTO", note: "Each row is one benchmark (see its title).", rows: BENCHMARKS.map((b) => Object.assign({ _title: b.id + " · " + b.title }, b.cond)) }]);
const fmt = (x, n = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(n));
function drawSpec() { return ST.draw.startsWith("seed") ? { seed: +ST.draw.slice(4) } : { example: ST.draw }; }
const BONES_FOR = (g, s) => ({ FOOT: ["foot_" + s, "toe_" + s, "shin_" + s], THIGH: ["thigh_" + s], CHEST: ["chest", "spine"], HEAD: ["head", "neck"] }[g] || []);

async function loadSkel() { if (ST.skel) return ST.skel; const ent = await W.ofCharLoad("vinicius"); ST.skel = ent.skel; return ST.skel; }
async function loadDist() { if (ST.distData !== null) return ST.distData; try { const r = await fetch("../../review_artifacts/receive_kill1/evidence/rk_distribution.json"); ST.distData = r.ok ? await r.json() : false; } catch (e) { ST.distData = false; } return ST.distData; }

function header() {
  const tabs = SETS.map((m) => `<button data-m="${m.id}" class="${m.id === ST.matrix ? "on" : ""}">${m.id}</button>`).join("");
  const draws = Object.keys(EXAMPLES).filter((k) => k !== "PERFECT").map((k) => [k, k.toLowerCase()]).concat(Array.from({ length: 12 }, (_, i) => ["seed" + (i + 1), "seed " + (i + 1)]));
  $("#tabs").innerHTML = tabs;
  $("#draw").innerHTML = draws.map(([v, l]) => `<option value="${v}" ${v === ST.draw ? "selected" : ""}>${l}</option>`).join("");
  $("#zoom").value = ST.zoom; $("#views").value = ST.views; $("#dist").checked = ST.dist;
}
function setURL() { const u = new URL(location.href); u.searchParams.set("m", ST.matrix); u.searchParams.set("draw", ST.draw); u.searchParams.set("zoom", ST.zoom); u.searchParams.set("views", ST.views); u.searchParams.set("dist", ST.dist ? "1" : "0"); history.replaceState(null, "", u.toString()); }

async function build() {
  if (ST.busy) return; ST.busy = true; setURL(); const M = SETS.find((m) => m.id === ST.matrix), t0 = performance.now(), skel = await loadSkel(), dist = ST.dist ? await loadDist() : null;
  $("#mtitle").textContent = M.title; $("#mnote").textContent = M.note + " " + (EXAMPLES[ST.draw] ? "Draw: " + EXAMPLES[ST.draw].label + "." : "Draw: keyed seed " + ST.draw.slice(4) + " (seed | RECEIVE | CAL-R | kill1 | receive-kill-v1 | dimension | 0).") + " The same draw in every column.";
  const tb = $("#grid"); tb.innerHTML = `<tr><th class="rh">incoming ball</th>${BC_STEPS.map((b) => `<th>BC ${b}</th>`).join("")}</tr>`;
  const N = drawsFor(drawSpec()), cw = Math.max(96, Math.min(150, Math.floor((W.innerWidth - 200) / 10) - 8)), sh = ST.views === "top" ? 0 : Math.round(cw * 0.6), th = ST.views === "side" ? 0 : Math.round(cw * 0.46), ch = sh + th; document.documentElement.style.setProperty("--cw", cw + "px");
  for (let ri = 0; ri < M.rows.length; ri++) {
    const r = M.rows[ri], cond = condOf(M, r), P = prepare(cond), tr = document.createElement("tr"); tb.appendChild(tr);
    const rh = document.createElement("td"); rh.className = "rh"; tr.appendChild(rh);
    if (P.plan.none) { rh.innerHTML = `<b>${r._title || condLabel(cond)}</b><div class="dim">no feasible authored action</div><div class="dim small">${Object.entries(P.plan.rej).slice(0, 4).map(([k, v]) => k + ": " + Object.keys(v).join("/")).join("<br>")}</div>`; for (const bc of BC_STEPS) { const td = document.createElement("td"); td.className = "na"; td.textContent = "—"; tr.appendChild(td); } continue; }
    const pl = P.plan, S = pl.sf.S, grp = S.group, auto = cond.surface && cond.surface !== "AUTO" ? prepare(Object.assign({}, cond, { surface: "AUTO" })).plan : null;
    const body = new KillBody(W.RUN1_V13, M4G, skel, P), J = body.poseAt(P.kc * DT, P.contact).J, hi = BONES_FOR(grp, pl.sf.side === "L" ? "L" : "R");
    const arr = P.sol.arrival, sp = Math.hypot(arr.v[0], arr.v[1], arr.v[2]);
    rh.innerHTML = `<b>${r._title || condLabel(cond)}</b>
      <div><span class="chip" style="background:${COL.surf[grp]}">${pl.sf.key.replace("_", " ")}</span> ${auto && !auto.none && auto.sf.key !== pl.sf.key ? `<span class="dim small">AUTO: ${auto.sf.key}</span>` : cond.surface === "AUTO" || !cond.surface ? `<span class="dim small">AUTO</span>` : ""}</div>
      <div class="small">difficulty <b>D ${fmt(pl.dif.D)}</b> · vEff ${fmt(pl.dif.vEff, 1)} m/s</div>
      <div class="small dim">contact ${fmt(P.contact[2])} m · ${fmt(sp, 1)} m/s at the reach plane${P.ideal.capExtra > 0.005 ? ` · surface limit +${fmt(P.ideal.capExtra)} m/s` : ""}${P.sol.residual.p > 0.005 ? ` · arrival within ${fmt(P.sol.residual.p * 100, 0)} cm` : ""}</div>`;
    const runs = BC_STEPS.map((bc) => runBC(P, bc, N, { post: 2.2 })), K2 = Math.round(2.0 / DT), kc = P.kc;
    const inc = []; for (let k = Math.max(0, kc - Math.round(0.55 / DT)); k <= kc; k += 3) inc.push(P.pred.P[k].p);
    const idl = P.idealRun.rec.filter((x) => x.i <= K2).map((x) => x.p), idlEnd = idl[idl.length - 1];
    const acts = runs.map((rn) => rn.run.rec.filter((x) => x.i <= K2).map((x) => x.p));
    const incE = inc.filter((p) => p[0] - P.contact[0] < 2.0), ext = extents([incE, idl, ...acts, [[0, 0, 1.8]]], ST.zoom === "near" ? { near: 3 } : ST.zoom === "near1" ? { near: 1.2 } : {});
    runs.forEach((rn, j) => {
      const td = document.createElement("td"), m = rn.m, cv = document.createElement("canvas"), dpr = W.devicePixelRatio || 1; td.className = "cell"; tr.appendChild(td);
      cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + "px"; cv.style.height = ch + "px"; td.appendChild(cv); const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
      const d = { incoming: inc, ideal: idl, actual: acts[j], contact: P.contact, target: P.ideal.target, group: grp, J, hiBones: hi, idealEnd: idlEnd, actualEnd: acts[j][acts[j].length - 1] };
      if (sh) view(ctx, "side", { x: 0, y: 0, w: cw, h: sh }, ext, d, { scale: j === 0, font: 8 });
      if (th) view(ctx, "top", { x: 0, y: sh, w: cw, h: th }, ext, d, { scale: false, bg: "#0f1613" });
      const dd = dist && dist[M.id] && dist[M.id][ri] && dist[M.id][ri].dist ? dist[M.id][ri].dist[j] : null;
      const txt = document.createElement("div"); txt.className = "ct";
      txt.innerHTML = `<div class="big" style="color:${COL.state[m.state]}">${fmt(m.dStar)} m <span class="st">${m.state}</span></div>
        <div>res ${fmt(m.resid, 1)} m/s · lat ${fmt(m["lat1"])}</div><div class="dim">0.25/0.5/1 s ${fmt(m["d0.25"])}/${fmt(m["d0.5"])}/${fmt(m["d1"])}</div>
        ${dd ? `<div class="dist">med ${fmt(dd.med)} · p90 ${fmt(dd.p90)}<br>heavy ${(100 * dd.heavy).toFixed(0)}% · lost ${(100 * dd.lost).toFixed(0)}%</div>` : ""}`;
      td.appendChild(txt); td.onclick = () => detail(M, cond, P, rn, N);
    });
    $("#status").textContent = `computing… row ${ri + 1}/${M.rows.length}`; await new Promise((res) => setTimeout(res, 0));
  }
  $("#status").textContent = `${M.rows.length} incoming balls × 10 ratings computed in the page in ${((performance.now() - t0) / 1000).toFixed(1)} s (the same kernel and code as the Node evidence)` + (ST.dist && !ST.distData ? " · distribution file not found" : "");
  ST.busy = false; W.RKM_READY = true;
}
function detail(M, cond, P, rn, N) {
  const m = rn.m, ex = rn.ex, pl = P.plan, el = $("#detail"), v = (a) => `(${a.map((x) => fmt(x)).join(", ")})`, parts = pl.dif.parts;
  const lab = `receive_kill1_lab.html?v=${cond.v}&h=${cond.h != null ? cond.h : 0.11}&drop=${cond.drop || 0}&bear=${cond.bear || 0}&lat=${cond.lat || 0}&surface=${cond.surface || "AUTO"}&bc=${rn.bc}&draw=${ST.draw}`;
  el.innerHTML = `<div class="dh"><b>${condLabel(cond)}</b> · <b>BC ${rn.bc}</b> · ${pl.sf.key} <a href="${lab}" target="_blank">open in the lab ↗</a> <span class="x" onclick="this.parentNode.parentNode.style.display='none'">✕</span></div>
  <table class="kv">
  <tr><td>difficulty D</td><td>${fmt(pl.dif.D, 3)} = m ${fmt(pl.dif.m)} × vEff/vRef ${fmt(parts.speed, 3)} × (1 + height ${fmt(parts.height, 3)} + jump ${fmt(parts.jump, 3)} + bearing ${fmt(parts.bearing, 3)} + shift ${fmt(parts.shift, 3)})</td></tr>
  <tr><td>relative error E</td><td>${fmt(ex.sig.E, 4)} = eFloor ${RK.exec.eFloor} + eSkill ${RK.exec.eSkill} × q(BC) ${fmt(((100 - rn.bc) / 90) ** RK.exec.gamma, 3)} × c(D) ${fmt(pl.dif.D / (pl.dif.D + RK.exec.Dc), 3)}</td></tr>
  <tr><td>σ (rebound / lateral / third)</td><td>${fmt(ex.sig.reb)} / ${fmt(ex.sig.lat)} / ${fmt(ex.sig.third)} m/s (scale vRef·D·E = ${fmt(ex.sig.scale, 3)})</td></tr>
  <tr><td>draws N</td><td>${fmt(N.reb, 3)} / ${fmt(N.lat, 3)} / ${fmt(N.third, 3)} — ${N.source}${N.key ? " · key " + N.key : ""}</td></tr>
  <tr><td>ideal exit</td><td>${v(P.ideal.v)} m/s (f, r, z) · ${P.ideal.kind}${P.ideal.capExtra > 0 ? " · incl. surface limit " + fmt(P.ideal.capExtra) + " m/s" : ""}</td></tr>
  <tr><td>actual exit</td><td>${v(ex.v)} m/s · error ${v(ex.err)}${ex.capped ? " · capped (" + ex.capped + ")" : ""}</td></tr>
  <tr><td>residual speed</td><td>${fmt(m.resid)} m/s (ideal ${fmt(m.residIdeal)})</td></tr>
  <tr><td>distance from the intended point</td><td>0.25 s ${fmt(m["d0.25"])} · 0.5 s ${fmt(m["d0.5"])} · 1.0 s ${fmt(m["d1"])} · <b>2.0 s ${fmt(m["d2"])}</b> m → ${m.state}</td></tr>
  <tr><td>from the ideal ball</td><td>0.25 s ${fmt(m["dIdeal0.25"])} · 0.5 s ${fmt(m["dIdeal0.5"])} · 1.0 s ${fmt(m["dIdeal1"])} · 2.0 s ${fmt(m["dIdeal2"])} m</td></tr>
  <tr><td>lateral error (1 s)</td><td>${fmt(m["lat1"])} m · vertical: peak ${fmt(m.peak)} m vs ideal ${fmt(m.peakIdeal)} m (${fmt(m.vertErr)} m)</td></tr>
  <tr><td>contact</td><td>tick ${P.kc} (${fmt(P.kc * DT, 3)} s) · ball ${v(P.contact)} · stance shift ${v(P.stance)} · kernel: ${m.launched}</td></tr></table>`;
  el.style.display = "block";
}
async function boot() {
  header();
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; ST.matrix = b.dataset.m; document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); build(); };
  $("#draw").onchange = (e) => { ST.draw = e.target.value; build(); };
  $("#zoom").onchange = (e) => { ST.zoom = e.target.value; build(); };
  $("#views").onchange = (e) => { ST.views = e.target.value; build(); };
  $("#dist").onchange = (e) => { ST.dist = e.target.checked; build(); };
  await build();
}
boot().catch((e) => { $("#status").textContent = "failed: " + (e && e.stack || e); console.error(e); W.RKM_READY = true; });

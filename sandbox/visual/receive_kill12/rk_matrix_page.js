// ═══ receive_kill12/rk_matrix_page.js — RECEIVE-KILL-1.2: the episode matrix with a SCALE selector (original · current · A · B = candidate, computed live)
// ═══ (RECEIVE-KILL-1.1's page:) THE CALIBRATION MATRIX of CONTROL EPISODES (rows = one incoming ball, columns = Ball
// Control 10 … 99 with the SAME standardised execution draws, for every contact of the episode). Each cell runs the real chain in the page and shows
//   FIRST CONTACT     the first touch's exit-velocity error, its drop point (aerial) and its error 0.25 s after the touch
//   COMPLETE RECEIVE  the follow-up foot control(s), the stable-control point, the time to stable control, the EXTRA adjustment against the ideal
//                     episode and the continuation class (IMMEDIATE / ADJUSTED / RECOVERY / UNSTABLE)
// Side view above (height), top view below (lateral + the receiver's adjustment path); ideal episode green dashed, actual episode orange.
import { prepare, runBC, runEpisode, firstContact, drawsFor, EXAMPLES, DT, at } from "./rk_sim.js";
import { RK, BC_STEPS, SCALES, setScale, scaleKey, gBC } from "./rk_model.js";
import { MATRICES, BENCHMARKS, condOf, condLabel } from "./rk_conditions.js";
import { KillBody } from "./rk_body.js";
import { view, extents, COL } from "./rk_draw.js";
const W = window, M4G = typeof M4 !== "undefined" ? M4 : W.M4, Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s);
const ST = { scale: scaleKey(Q.get("scale") || "candidate"), matrix: Q.get("m") || "BENCH", draw: Q.get("draw") || "TYPICAL", zoom: Q.get("zoom") || "fit", views: Q.get("views") || "both", dist: Q.get("dist") !== "0", skel: null, distData: null, busy: false };
const SETS = MATRICES.concat([{ id: "BENCH", title: "Benchmarks — the owner's easy, hard and aerial tests", surface: "AUTO", note: "Each row is one benchmark.", rows: BENCHMARKS.map((b) => Object.assign({ _title: b.id + " · " + b.title }, b.cond)) }]);
const fmt = (x, n = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(n)), fc2 = (x) => (x == null || !isFinite(x) ? "–" : Math.abs(x) < 1 ? x.toFixed(2).replace(/^(-?)0\./, "$1.") : x.toFixed(1)), pct = (x) => (x == null ? "–" : (100 * x).toFixed(0) + "%");
const drawSpec = () => (ST.draw.startsWith("seed") ? { seed: +ST.draw.slice(4) } : { example: ST.draw });
const BONES_FOR = (g, s) => ({ FOOT: ["foot_" + s, "toe_" + s, "shin_" + s], THIGH: ["thigh_" + s], CHEST: ["chest", "spine"], HEAD: ["head", "neck"] }[g] || []);
async function loadSkel() { if (ST.skel) return ST.skel; const ent = await W.ofCharLoad("vinicius"); ST.skel = ent.skel; return ST.skel; }
const DIST = { B: "../../review_artifacts/receive_kill12/evidence/rk12b_distribution.json", A: "../../review_artifacts/receive_kill12/evidence/rk12_distribution.json", current: "../../review_artifacts/receive_kill11/evidence/rk11_distribution.json" };
async function loadDist() { const url = DIST[ST.scale]; if (!url) return false; ST.distCache = ST.distCache || {}; if (ST.distCache[url] !== undefined) return ST.distCache[url]; let d = false; try { const r = await fetch(url); d = r.ok ? await r.json() : false; } catch (e) { d = false; } ST.distCache[url] = d; return d; }
function header() {
  $("#tabs").innerHTML = SETS.map((m) => `<button data-m="${m.id}" class="${m.id === ST.matrix ? "on" : ""}">${m.id}</button>`).join("");
  const draws = Object.keys(EXAMPLES).filter((k) => k !== "PERFECT").map((k) => [k, k.toLowerCase()]).concat(Array.from({ length: 12 }, (_, i) => ["seed" + (i + 1), "seed " + (i + 1)]));
  $("#draw").innerHTML = draws.map(([v, l]) => `<option value="${v}" ${v === ST.draw ? "selected" : ""}>${l}</option>`).join(""); $("#zoom").value = ST.zoom; $("#views").value = ST.views; $("#dist").checked = ST.dist;
  $("#scale").innerHTML = Object.entries(SCALES).map(([k, S]) => `<option value="${k}" ${k === ST.scale ? "selected" : ""}>${S.label}</option>`).join("");
}
function setURL() { const u = new URL(location.href); for (const [k, v] of [["scale", ST.scale], ["m", ST.matrix], ["draw", ST.draw], ["zoom", ST.zoom], ["views", ST.views], ["dist", ST.dist ? "1" : "0"]]) u.searchParams.set(k, v); history.replaceState(null, "", u.toString()); }
// the episode's drawable parts
function epDraw(P, ep) { const K = Math.round(2.6 / DT), path = ep.rec.filter((r) => r.i <= K).map((r) => r.p), fol = ep.contacts.slice(1).map((c) => ({ p: c.contact, label: String(c.n) })), stp = ep.m.stablePoint;
  return { path, follow: fol, stable: stp, moves: [ep.contacts[0].stance].concat(ep.contacts.slice(1).map((c) => c.stance)) }; }
async function build() {
  if (ST.busy) return; ST.busy = true; setScale(ST.scale); setURL(); const M = SETS.find((m) => m.id === ST.matrix), t0 = performance.now(), skel = await loadSkel(), dist = ST.dist ? await loadDist() : null;
  $("#mtitle").textContent = M.title + " — " + SCALES[ST.scale].label; $("#mnote").textContent = M.note + " " + (EXAMPLES[ST.draw] ? "Draw: " + EXAMPLES[ST.draw].label + " (every contact)." : "Draw: keyed seed " + ST.draw.slice(4) + " — contact n keyed by its own event (kill1, kill1.f1, kill1.f2).") + " The same draws in every column.";
  const tb = $("#grid"); tb.innerHTML = `<tr><th class="rh">incoming ball</th>${BC_STEPS.map((b) => `<th>BC ${b}${SCALES[ST.scale].exec.curve === "remap" ? `<br><span class="dim small">≈ current ${gBC(b).toFixed(0)}</span>` : ""}</th>`).join("")}</tr>`;
  const spec = drawSpec(), cw = Math.max(92, Math.min(150, Math.floor((W.innerWidth - 236) / BC_STEPS.length) - 10)), sh = ST.views === "top" ? 0 : Math.round(cw * 0.62), th = ST.views === "side" ? 0 : Math.round(cw * 0.5), ch = sh + th;
  document.documentElement.style.setProperty("--cw", cw + "px");
  for (let ri = 0; ri < M.rows.length; ri++) {
    const r = M.rows[ri], cond = condOf(M, r), P = prepare(cond), tr = document.createElement("tr"); tb.appendChild(tr); const rh = document.createElement("td"); rh.className = "rh"; tr.appendChild(rh);
    if (P.plan.none) { rh.innerHTML = `<b>${r._title || condLabel(cond)}</b><div class="dim">no feasible authored action</div>`; for (const bc of BC_STEPS) { const td = document.createElement("td"); td.className = "na"; td.textContent = "—"; tr.appendChild(td); } continue; }
    const pl = P.plan, grp = pl.sf.S.group, IE = runEpisode(P, 99, { example: "PERFECT" }), ide = epDraw(P, IE), body = new KillBody(W.RUN1_V13, M4G, skel, P), J = body.poseAt(P.kc * DT, P.contact).J, hi = BONES_FOR(grp, pl.sf.side === "L" ? "L" : "R");
    rh.innerHTML = `<b>${r._title || condLabel(cond)}</b><div><span class="chip" style="background:${COL.surf[grp]}">${pl.sf.key.replace("_", " ")}</span> <span class="small dim">D ${fmt(pl.dif.D)}</span></div>
      <div class="small dim">ideal episode: ${IE.m.contacts} contact${IE.m.contacts > 1 ? "s" : ""}${IE.m.followSurfaces.length ? " (→ " + IE.m.followSurfaces.join(", ").replace(/FOOT_/g, "") + ")" : ""} · stable ${fmt(IE.m.tStable)} s${IE.m.adjust > 0.005 ? " · step " + fmt(IE.m.adjust) + " m" : ""}${P.ideal.capExtra > 0.005 ? " · surface limit +" + fmt(P.ideal.capExtra) + " m/s" : ""}</div>`;
    const runs = BC_STEPS.map((bc) => { const r1 = runBC(P, bc, drawsFor(Object.assign({ event: "kill1" }, spec)), { post: 2.2, every: 4 }), ep = runEpisode(P, bc, spec, { every: 2 }); return { bc, r1, fc: firstContact(P, r1.ex, r1.run), ep }; });
    const kc = P.kc, inc = []; for (let k = Math.max(0, kc - Math.round(0.55 / DT)); k <= kc; k += 3) inc.push(P.pred.P[k].p);
    const eds = runs.map((x) => epDraw(P, x.ep)), incE = inc.filter((p) => p[0] - P.contact[0] < 2.0);
    const ext = extents([incE, ide.path, ...eds.map((e) => e.path), [[0, 0, 1.8]]], ST.zoom === "near" ? { near: 3 } : ST.zoom === "near1" ? { near: 1.2 } : {});
    runs.forEach((x, j) => {
      const td = document.createElement("td"), m = x.ep.m, fc = x.fc, e = eds[j], cv = document.createElement("canvas"), dpr = W.devicePixelRatio || 1; td.className = "cell"; tr.appendChild(td);
      cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + "px"; cv.style.height = ch + "px"; td.appendChild(cv); const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
      const d = { incoming: inc, ideal: ide.path, actual: e.path, contact: P.contact, target: P.ideal.target, group: grp, J, hiBones: hi, follow: e.follow, stable: e.stable, moves: e.moves, drop: grp !== "FOOT" ? fc.drop : null, dropIdeal: grp !== "FOOT" ? fc.dropIdeal : null };
      if (sh) view(ctx, "side", { x: 0, y: 0, w: cw, h: sh }, ext, d, { scale: j === 0, font: 8 }); if (th) view(ctx, "top", { x: 0, y: sh, w: cw, h: th }, ext, d, { scale: false, bg: "#0f1613", followLabels: false });
      const dm = dist && dist.matrices ? dist.matrices[M.id] : null, dd = dm && dm[ri] && dm[ri].dist ? dm[ri].dist.find((q) => q.bc === BC_STEPS[j]) || null : null, cls = m.continuation;
      const first = grp === "FOOT" ? `1st Δv ${fc2(fc.velErr)} · ¼s ${fc2(fc["e0.25"])}` : `1st Δv ${fc2(fc.velErr)} · drop ${fc2(fc.dropErr)}`;
      const txt = document.createElement("div"); txt.className = "ct";
      txt.innerHTML = `<div class="big"><span class="cls" style="background:${COL.cls[cls]}">${cls}</span></div>
        <div>${first}</div><div>n${m.contacts}${m.followSurfaces.length ? " " + m.followSurfaces.map((s) => s.replace("FOOT_", "").replace(/_R|_L/, "").toLowerCase()).join("+") : ""} · ${m.extraAdj == null ? "—" : "+" + fc2(m.extraAdj) + " m"}</div><div class="dim">stable ${m.tStable == null ? "—" : fc2(m.tStable) + " s"}${m.extraT != null && m.extraT > 0.02 ? " (+" + fc2(m.extraT) + ")" : ""}</div>
        ${dd ? `<div class="dist">imm ${pct(dd.cls.IMMEDIATE)} · adj ${pct(dd.cls.ADJUSTED)}<br>rec ${pct(dd.cls.RECOVERY)} · uns ${pct(dd.cls.UNSTABLE)}<br>+adj ${fc2(dd.ep.extraAdj.med)}/${fc2(dd.ep.extraAdj.p90)} m</div>` : ""}`;
      td.appendChild(txt); td.onclick = () => detail(M, cond, P, x, IE);
    });
    $("#status").textContent = `computing… row ${ri + 1}/${M.rows.length}`; await new Promise((res) => setTimeout(res, 0));
  }
  $("#status").textContent = `${M.rows.length} incoming balls × ${BC_STEPS.length} ratings (first contact + complete episode) computed in the page in ${((performance.now() - t0) / 1000).toFixed(1)} s — the same kernel and code as the Node evidence` + (ST.dist && !dist ? (DIST[ST.scale] ? " · distribution file not found" : " · no multi-seed distribution file for this scale") : "");
  ST.busy = false; W.RKM_READY = true;
}
function detail(M, cond, P, x, IE) {
  const m = x.ep.m, fc = x.fc, el = $("#detail"), v = (a) => `(${a.map((q) => fmt(q)).join(", ")})`;
  const lab = `receive_kill12_lab.html?scale=${ST.scale}&v=${cond.v}&h=${cond.h != null ? cond.h : 0.11}&drop=${cond.drop || 0}&bear=${cond.bear || 0}&lat=${cond.lat || 0}&surface=${cond.surface || "AUTO"}&bc=${x.bc}&draw=${ST.draw}`;
  const rows = x.ep.contacts.map((c) => `<tr><td>contact ${c.n}</td><td>${c.sf.key} · ${fmt(c.i * DT)} s · D ${fmt(c.D, 3)} · σ reb ${fmt(c.ex.sig.reb)} m/s · draws ${fmt(c.N.reb)}/${fmt(c.N.lat)}/${fmt(c.N.third)} · exit ${v(c.ex.v)} (ideal ${v(c.ideal.v)})${c.adjust != null ? " · adjustment " + fmt(c.adjust) + " m" : ""}</td></tr>`).join("");
  el.innerHTML = `<div class="dh"><b>${condLabel(cond)}</b> · <b>BC ${x.bc}</b> · <a href="${lab}" target="_blank">open in the lab ↗</a> <span class="x" onclick="this.parentNode.parentNode.style.display='none'">✕</span></div><table class="kv">
  <tr><td>FIRST CONTACT</td><td>exit ${v(fc.v)} m/s (${fmt(fc.speed)}; ideal ${fmt(fc.idealSpeed)}) · velocity error ${fmt(fc.velErr)} m/s${fc.capped ? " · capped" : ""}</td></tr>
  <tr><td>… position error vs ideal</td><td>0.10 s ${fmt(fc["e0.1"])} · 0.25 s ${fmt(fc["e0.25"])} · 0.50 s ${fmt(fc["e0.5"])} · 1.00 s ${fmt(fc["e1"])} · 2.00 s ${fmt(fc["e2"])} m${fc.dropErr != null ? " · drop point " + fmt(fc.dropErr) + " m" : ""} · intended point at 2 s ${fmt(x.r1.m.dStar)} m</td></tr>
  ${rows}
  <tr><td>COMPLETE RECEIVE</td><td><b style="color:${COL.cls[m.continuation]}">${m.continuation}</b> · ${m.contacts} contact${m.contacts > 1 ? "s" : ""} · adjustment ${fmt(m.adjust)} m (extra vs ideal ${fmt(m.extraAdj)} m) · next feasible control ${fmt(m.tNextFeasible)} s · follow-up ${fmt(m.tFollow)} s</td></tr>
  <tr><td>… stable control</td><td>${m.stable ? `at ${fmt(m.tStable)} s (ideal ${fmt(IE.m.tStable)} s, extra ${fmt(m.extraT)} s) · ball ${fmt(m.dStable)} m from the player` : "not reached — a loose, contestable ball"}${x.ep.notes.length ? " · " + x.ep.notes.join("; ") : ""}</td></tr></table>`;
  el.style.display = "block";
}
async function boot() {
  header();
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; ST.matrix = b.dataset.m; document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); build(); };
  $("#scale").onchange = (e) => { ST.scale = e.target.value; build(); };
  $("#draw").onchange = (e) => { ST.draw = e.target.value; build(); }; $("#zoom").onchange = (e) => { ST.zoom = e.target.value; build(); }; $("#views").onchange = (e) => { ST.views = e.target.value; build(); }; $("#dist").onchange = (e) => { ST.dist = e.target.checked; build(); };
  await build();
}
boot().catch((e) => { $("#status").textContent = "failed: " + (e && e.stack || e); console.error(e); W.RKM_READY = true; });

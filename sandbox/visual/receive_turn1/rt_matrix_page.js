// ═══ receive_turn1/rt_matrix_page.js — RECEIVE-TURN-1: the receive-and-turn MATRIX (desired turn angle × Ball Control, computed live) ═════════════
// Rows: the desired turn angles 0 … 180 (right turns, or left with the side switch), columns: Ball Control 30 … 99. Each tile is the TOP view of one
// episode with the chosen draw (the same draw in every tile) — initial facing, incoming ball, exit line, planned rotation, ideal vs actual
// first-touch vector and ball path, the meeting — with its continuation class; under it the 200-seed distribution of the class from the evidence
// (review_artifacts/receive_turn1/evidence/turn_matrix.json). Each tile opens the lab with the same case.
import { prepareTurn, runTurn, FAMILIES } from "./rt_sim.js";
import { turnTop, turnData, turnExtents, TCOL } from "./rt_draw.js";
const Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s);
const ST = { v: +(Q.get("v") || 12), side: Q.get("side") || "R", draw: Q.get("draw") || "TYPICAL", dist: Q.get("dist") !== "0", prep: Q.get("prep") || "clean", pref: Q.get("pref") || "R" };
const ANG = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180], BCS = [30, 50, 60, 70, 80, 90, 99], SPK = { 6: "SLOW", 12: "NORMAL", 18: "FIRM" };
const CLS = ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"];
let DIST = null;
async function loadDist() { if (DIST !== null) return DIST; try { const r = await fetch("../../review_artifacts/receive_turn1/evidence/turn_matrix.json"); DIST = r.ok ? await r.json() : false; } catch (e) { DIST = false; } return DIST; }
const spec = () => (ST.draw.startsWith("seed") ? { seed: +ST.draw.slice(4) } : { example: ST.draw });
async function build() {
  const t0 = performance.now(), dist = ST.dist ? await loadDist() : null, sg = ST.side === "L" ? -1 : 1, tb = $("#grid");
  tb.innerHTML = `<tr><th class="rh">desired turn</th>${BCS.map((b) => `<th>BC ${b}</th>`).join("")}</tr>`;
  for (const a of ANG) {
    const th = a === 0 ? 0 : sg * a, cond = { v: ST.v, theta: th, prep: ST.prep === "clean" ? undefined : +ST.prep, pref: ST.pref === "both" ? null : ST.pref }, P = prepareTurn(cond), tr = document.createElement("tr");
    const A = P.A, key = `${SPK[ST.v] || ""}_${th}`, cell = dist && ST.prep === "clean" && ST.pref === "R" && dist.cells ? dist.cells[key] : null;
    tr.innerHTML = `<td class="rh"><b>${th > 0 ? "+" : ""}${th}°</b><br>${A.none ? "<span class='dim'>no feasible action</span>" : `<span class="fam">${FAMILIES[A.fid].label}</span><br><span class="dim">${A.F} ${A.surface.toLowerCase()}${A.fid === "THROUGH_TURN" ? " · " + A.vid : ""} · opens ${Math.abs(A.psiC * 180 / Math.PI).toFixed(0)}° · D ${A.D.toFixed(2)}</span>`}</td>`;
    tb.appendChild(tr);
    for (const bc of BCS) {
      const td = document.createElement("td"); tr.appendChild(td); if (A.none) { td.textContent = "—"; continue; }
      const ep = runTurn(P, bc, spec(), { every: 6, carry: false }), D = turnData(P, ep, { tEnd: 2.0 }), cv = document.createElement("canvas"), cw = 168, ch = 150, dpr = window.devicePixelRatio || 1;
      cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + "px"; cv.style.height = ch + "px"; const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
      turnTop(ctx, { x: 0, y: 0, w: cw, h: ch }, turnExtents(D), D, { font: 9, lw: 1.2, labels: false, scale: false });
      const a2 = document.createElement("a"); a2.href = `receive_turn1_lab.html?theta=${th}&v=${ST.v}&bc=${bc}&draw=${ST.draw}&prep=${ST.prep}&pref=${ST.pref}`; a2.target = "_blank"; a2.appendChild(cv); td.appendChild(a2);
      const m = ep.m, info = document.createElement("div"); info.className = "info";
      info.innerHTML = `<span class="chip" style="background:${TCOL.cls[m.cls]}">${m.cls}</span> ${m.contacts} touch${m.contacts > 1 ? "es" : ""}<br>step ${m.extraAdj == null ? "—" : m.extraAdj.toFixed(2)} m · go ${m.tCont == null ? "—" : m.tCont.toFixed(2)} s`;
      if (cell && cell.bc && cell.bc[bc]) { const c = cell.bc[bc].cls; info.innerHTML += `<div class="bar">${CLS.map((k) => `<i style="width:${(100 * (c[k] || 0)).toFixed(1)}%;background:${TCOL.cls[k]}"></i>`).join("")}</div><span class="dim">${dist.blocks && dist.blocks["MAIN:" + SPK[ST.v] + ":" + (sg > 0 ? "R" : "L")] ? dist.blocks["MAIN:" + SPK[ST.v] + ":" + (sg > 0 ? "R" : "L")].nSeeds : ""} seeds: imm ${(100 * c.IMMEDIATE).toFixed(0)}% · rec ${(100 * c.RECOVERY).toFixed(0)}% · uns ${(100 * c.UNSTABLE).toFixed(0)}%</span>`; }
      td.appendChild(info);
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  $("#status").textContent = `${ANG.length} turn angles × ${BCS.length} ratings computed in the page in ${((performance.now() - t0) / 1000).toFixed(1)} s — the same code as the Node evidence${ST.dist ? (dist ? (ST.prep === "clean" && ST.pref === "R" ? " · 200-seed bars from turn_matrix.json" : " · (the 200-seed bars exist for the clean, right-footed matrix only)") : " · distribution file not found") : ""}`;
  window.RTM_READY = true;
}
function controls() {
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o) => `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
  $("#ctl").innerHTML = `<label>pass ${sel("v", [[6, "slow 6 m/s"], [12, "normal 12 m/s"], [18, "firm 18 m/s"]], ST.v)}</label><label>side ${sel("side", [["R", "right turns"], ["L", "left turns"]], ST.side)}</label>
    <label>draw ${sel("draw", [["TYPICAL", "typical"], ["HEAVY", "heavy (p75)"], ["PERFECT", "perfect"]].concat(Array.from({ length: 20 }, (_, i) => ["seed" + (i + 1), "seed " + (i + 1)])), ST.draw)}</label><label>preparation ${sel("prep", [["clean", "clean"], ["0.45", "0.45 s"], ["0.3", "0.3 s"]], ST.prep)}</label>
    <label>preferred ${sel("pref", [["R", "right"], ["L", "left"], ["both", "two-footed"]], ST.pref)}</label><label><input type="checkbox" id="dist" ${ST.dist ? "checked" : ""}> 200-seed bars</label> <a href="receive_turn1_lab.html" target="_blank">lab ↗</a> <a href="receive_turn1_var.html" target="_blank">variance ↗</a>`;
  const go = () => { const u = new URL(location.href); for (const k of ["v", "side", "draw", "prep", "pref"]) u.searchParams.set(k, ST[k]); u.searchParams.set("dist", ST.dist ? "1" : "0"); history.replaceState(null, "", u.toString()); build(); };
  for (const k of ["v", "side", "draw", "prep", "pref"]) $("#" + k).onchange = (e) => { ST[k] = k === "v" ? +e.target.value : e.target.value; go(); };
  $("#dist").onchange = (e) => { ST.dist = e.target.checked; go(); };
}
controls(); build();

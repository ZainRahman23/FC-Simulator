// occupy3/tools/o3_study.mjs — §2 THE STAGE 2 CONFLICT STUDY (before any impact model): what Stage 2 (the owner's decided configuration — the
// soft wall spares a planned move's approach) actually leaves unresolved. Every CONTACT EPISODE (consecutive ticks with a resolved pair deeper
// than the 2 cm contact tolerance) that reaches an UNRESOLVED tick is recorded AT THE INSTANT THE MEANINGFUL CONTACT BEGINS (the episode's first
// tick) — the players (position, root velocity, facing, travel, request, action, its phase, commitment), their support (planted / airborne feet,
// the support polygon, the posed centre of mass and its place in the polygon, the lean, the budgets left), the contact (the regions, the point,
// the normal, the depth, the contact points' relative velocity — normal / tangential / vertical — the roots' too, where on each body it acts,
// a fast limb or not), the ball (the authority's state and owner, the distances, who has touched it, the tackle / the move committed, before
// or after the decisive event) — then the episode's peak, its unresolved classes and its length. The FAMILIES are the episodes grouped by
// what is committed, the regions, the timing against the decisive events, the geometry and the closing speed.
//   node o3_study.mjs --set review|search|moves [--res json] [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf } from "../../occupy2/tools/o2_metrics.mjs";
import { runO2 } from "../../occupy2/o2_run.js";
import { volumesOf, OCC } from "../../occupy1/o_volumes.js";
import { supportOf, pairName, facingSide, capPt, regionOf } from "../o3_geom.js";
import { S2D } from "../o3_run.js";
import { RES2 } from "../../occupy2/o2_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), RES = Object.assign({}, RES2, S2D, arg("res") ? JSON.parse(arg("res")) : {}), DT = 1 / 240, hyp = Math.hypot;
const r3 = (x) => (x == null ? null : Array.isArray(x) ? x.map((v) => +v.toFixed(3)) : +x.toFixed(3)), deg = (a) => +(a * 180 / Math.PI).toFixed(1), MF = ENV.body.massFrac;
const MOVE = /BODY FEINT|CROQUETA/;
export { actionState } from "../o3_facts.js";
import { actionState } from "../o3_facts.js";
function snap(W, k, t, prev, pr) { const L = W.livePoses(), Ja = L.a.J, Jd = L.d.J, va = volumesOf(Ja), vd = volumesOf(Jd), x = pr.deep, rec = pr.rec, out = { k, t: r3(t), players: [] };
  for (const [i, p, J] of [[0, W.att, Ja], [1, W.def, Jd]]) { const st = p.stateAt(t), planted = ["R", "L"].filter((X) => p.plan.stances[X].some((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9)), S = supportOf(J, planted, MF), ch = p.planAt(t).ch;
    const cm0 = prev && prev.com[i], comV = cm0 ? [(S.com[0] - cm0[0]) / DT, (S.com[1] - cm0[1]) / DT] : null;
    // (the budgets left: an ordinary planted stance's lean (Stage 2's 12 cm) less its push ledger; a committed one's 2 cm per plant / 12 per commitment)
    const SL = W.stanceL.get(p) || {}, CL = W.commitL.get(p), bud = {}; for (const X of planted) { const s = SL[X]; if (!s) continue; const push = hyp(s.push[0], s.push[1]), tot = hyp(s.push[0] + s.wall[0], s.push[1] + s.wall[1]); bud[X] = rec.committed[i] ? r3(W.R.commitPlant - tot) : r3(W.R.lean - push); }
    out.players.push({ pid: p.pid, P: r3(st.P), V: r3(st.V), speed: r3(st.s), facing: deg(st.psi), travel: deg(st.h), req: p.req ? { h: p.req.h == null ? null : deg(p.req.h), mode: p.req.mode } : null, action: actionState(W, p, t),
      support: { state: rec.state[i], planted, airborne: ["R", "L"].filter((X) => !planted.includes(X)), polygon: S.poly ? S.poly.map(r3) : null, centroid: r3(S.centroid), com: r3(S.com), comV: r3(comV), comFromCentroid: S.centroid ? r3([S.com[0] - S.centroid[0], S.com[1] - S.centroid[1]]) : null, margin: r3(S.margin),
        lean: ch && ch.lean ? r3(ch.lean.at(t)) : null, side: ch && ch.side ? r3(ch.side.at(t)) : null, budgetLeft: bud, commitLeft: CL ? r3(W.R.commitTotal - hyp(CL.v[0], CL.v[1])) : null } }); }
  // (the contact: the deepest resolved pair; its contact points' velocities from the previous tick's volumes at the same capsule parameters)
  const vA = va.find((v) => v.id === x.A), vB = vd.find((v) => v.id === x.B), n = x.nh || [1, 0], tn = [-n[1], n[0]]; let vRel = null;
  if (prev) { const a0 = prev.va.find((v) => v.id === x.A), b0 = prev.vd.find((v) => v.id === x.B); if (a0 && b0) { const pa = capPt(vA, x.uA), pb = capPt(vB, x.uB), qa = capPt(a0, x.uA), qb = capPt(b0, x.uB); vRel = [0, 1, 2].map((j) => ((pa[j] - qa[j]) - (pb[j] - qb[j])) / DT); } }
  const sa = W.att.stateAt(t), sd = W.def.stateAt(t), vr = [sa.V[0] - sd.V[0], sa.V[1] - sd.V[1]];
  out.contact = { A: x.A, B: x.B, cls: x.cls, name: pairName(x), regionA: regionOf(x.A, x.uA), regionB: regionOf(x.B, x.uB), at: r3(x.at), normal: r3(n), pen: r3(x.pen), tier: x.tier, fastLimb: x.tier === "FAST LIMB",
    vRel: r3(vRel), closing: vRel ? r3(-(vRel[0] * n[0] + vRel[1] * n[1])) : null, tangential: vRel ? r3(vRel[0] * tn[0] + vRel[1] * tn[1]) : null, vertical: vRel ? r3(vRel[2]) : null,
    rootClosing: r3(-(vr[0] * n[0] + vr[1] * n[1])), rootTangential: r3(vr[0] * tn[0] + vr[1] * tn[1]), onATT: facingSide(n, sa.psi), onDEF: facingSide([-n[0], -n[1]], sd.psi), z: r3(x.at[2]) };
  const B = W.ball.p, au = W.auth; out.ball = { state: au.state, owner: au.id, p: r3(B), distATT: r3(hyp(B[0] - sa.P[0], B[1] - sa.P[1])), distDEF: r3(hyp(B[0] - sd.P[0], B[1] - sd.P[1])),
    touchedBefore: { ATT: W.att.contacts.filter((c) => !c.missed && c.t <= t + 1e-9 && c.t > t - 1.0).length, DEF: (W.tk && W.tk.act ? W.tk.act.hits.filter((h) => h.t <= t + 1e-9).length : 0) } };
  out.stage2 = { share: rec.share, unresolved: rec.unresolved || null, supportLimited: rec.supportLimited || null, left: rec.left || 0, conflict: rec.conflict };
  return out; }
export function studyCase(tc, res = RES) { const eps = []; let cur = null, prev = null;
  const onTick = (W, tRel) => { const rec = W.occ.log[W.occ.log.length - 1], k = W.k; if (!rec || rec.k !== k) { if (cur) { eps.push(cur); cur = null; } prev = null; return; }
    const L = W.livePoses(), va = volumesOf(L.a.J), vd = volumesOf(L.d.J); const now = { va, vd, com: null };
    // (the deepest resolved pair this tick, from the pass's own record (its regions, tier) — the pass logs its first 8 pairs, deepest first)
    const top = (rec.pairs || []).find((q) => q.cls !== "FOOT ↔ BODY" && q.cls !== "ARM ↔ BODY");
    const inContact = top && top.pen > res.coreTol;
    if (inContact) { const t = W.att.t;
      if (!cur) { // (the episode begins: the full snapshot at this instant — the pair re-found with its capsule parameters)
        const all = detectFull(va, vd), deep = all.find((q) => q.A === top.A && q.B === top.B) || all[0]; deep.cls = top.cls; deep.tier = top.tier;
        const s = snap(W, k, t, prev, { deep, rec }); cur = { onset: s, kOn: k, kEnd: k, peak: top.pen, peakAt: t, peakPair: top.A + " / " + top.B, trunkPeak: -1, trunkPair: null, trunkAt: null, unresolved: {}, firstUnresolved: null, classes: new Set([top.cls]), pairs: new Set([pairName(deep)]) }; }
      cur.kEnd = k; if (top.pen > cur.peak) { cur.peak = top.pen; cur.peakAt = t; cur.peakPair = top.A + " / " + top.B; } cur.classes.add(top.cls);
      // (the trunks: the deepest TORSO/PELVIS ↔ TORSO/PELVIS pair this tick — the meeting of the bodies, not of a leg)
      const tr = (rec.pairs || []).find((q) => q.cls === "TORSO/PELVIS ↔ TORSO/PELVIS"); if (tr && tr.pen > cur.trunkPeak) { cur.trunkPeak = tr.pen; cur.trunkPair = tr.A + " / " + tr.B; } if (tr && tr.pen > res.coreTol && cur.trunkAt == null) cur.trunkAt = t;
      if (rec.unresolved) { cur.unresolved[rec.unresolved] = (cur.unresolved[rec.unresolved] || 0) + 1; if (!cur.firstUnresolved) cur.firstUnresolved = { t, act: rec.act, committed: rec.committed, state: rec.state, pen: rec.maxRes }; } }
    else if (cur) { eps.push(cur); cur = null; }
    now.com = [supportOf(L.a.J, [], MF).com, supportOf(L.d.J, [], MF).com]; prev = now; };
  const R = runO2(ENV, tc, "S2", { record: false, res, onTick }); if (cur) eps.push(cur);
  return { R, eps: eps.filter((e) => Object.keys(e.unresolved).length).map((e) => ({ onset: e.onset, dur: r3((e.kEnd - e.kOn + 1) * DT), peak: r3(e.peak), peakAt: r3(e.peakAt), peakPair: e.peakPair, trunkPeak: r3(Math.max(0, e.trunkPeak)), trunkPair: e.trunkPair, trunkAt: r3(e.trunkAt), unresolved: e.unresolved, firstUnresolved: e.firstUnresolved && { t: r3(e.firstUnresolved.t), act: e.firstUnresolved.act, committed: e.firstUnresolved.committed, state: e.firstUnresolved.state, pen: r3(e.firstUnresolved.pen) }, classes: [...e.classes], pairs: [...e.pairs] })), all: eps.length }; }
import { detect } from "../../occupy1/o_volumes.js";
const detectFull = (va, vd) => detect(va, vd, { within: 0.3 }).filter((x) => x.both);
// ── the family of an episode ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function familyOf(e) { const [a, d] = e.onset.players, A = a.action, D = d.action, C = e.onset.contact, nm = (x) => x.kind === "ORDINARY" ? "ordinary" : (x.planned ? "planned " : x.committed ? "committed " : "released ") + x.kind;
  const tim = (x) => x.kind === "ORDINARY" || x.planned ? "" : x.beforeDecisive ? " (before its decisive event)" : " (after its decisive event)";
  const cls = Object.keys(e.unresolved).sort((x, y) => e.unresolved[y] - e.unresolved[x])[0];
  return { who: `ATT ${nm(A)}${tim(A)} × DEF ${nm(D)}${tim(D)}`, regions: C.regionA + " / " + C.regionB, geometry: `on ATT ${C.onATT.side} · on DEF ${C.onDEF.side}`, speed: C.rootClosing < 0.5 ? "bodies closing < 0.5 m/s" : C.rootClosing < 1 ? "bodies closing 0.5–1 m/s" : C.rootClosing < 2 ? "bodies closing 1–2 m/s" : "bodies closing ≥ 2 m/s", trunk: e.trunkPeak > 0.05 ? "the trunks meet beyond the 5 cm limit (" + e.trunkPair + ")" : e.trunkPeak > 0.02 ? "the trunks meet (2–5 cm)" : "legs only (the trunks within the tolerance)", peak: e.peakPair, cls }; }
if (process.argv[1] && process.argv[1].endsWith("o3_study.mjs")) {
  const cases = setOf(SET), out = [], nAll = { eps: 0 }; let i = 0;
  let nRun = 0; for (const tc of cases) { if (tc.onlyCommitted) { const p = runO2(ENV, tc, "OLD", { record: false }); if (!p.W.tk.act) continue; } nRun++; const r = studyCase(tc); i++; nAll.eps += r.all; for (const e of r.eps) out.push(Object.assign({ id: tc.id, group: tc.group || SET }, e)); if (i % 20 === 0) process.stderr.write(`${i}/${cases.length} `); }
  const fam = (key) => { const m = new Map(); for (const e of out) { const f = familyOf(e)[key]; const q = m.get(f) || { n: 0, ticks: 0, peak: 0, trunk: 0, closing: [], root: [], ids: [] }; q.n++; q.ticks += Object.values(e.unresolved).reduce((a, b) => a + b, 0); q.peak = Math.max(q.peak, e.peak); q.trunk = Math.max(q.trunk, e.trunkPeak); if (e.onset.contact.closing != null) q.closing.push(e.onset.contact.closing); q.root.push(e.onset.contact.rootClosing); if (q.ids.length < 4 && !q.ids.includes(e.id)) q.ids.push(e.id); m.set(f, q); } return [...m.entries()].sort((x, y) => y[1].ticks - x[1].ticks); };
  const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  console.log(`\n§2 THE STAGE 2 CONFLICT STUDY — set ${SET} (${nRun} encounters), Stage 2 as decided (the soft wall spares a planned move's approach)`);
  console.log(`contact episodes deeper than the ${(RES.coreTol * 100).toFixed(0)} cm tolerance: ${nAll.eps}; reaching an UNRESOLVED tick: ${out.length}`);
  const cl = {}; for (const e of out) for (const [k, v] of Object.entries(e.unresolved)) cl[k] = (cl[k] || 0) + v; console.log("unresolved ticks by class: " + Object.entries(cl).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
  for (const [key, title] of [["who", "WHO IS COMMITTED (and against the decisive event)"], ["trunk", "THE BODIES OR THE LEGS"], ["regions", "THE REGIONS AT ONSET (ATT / DEF: the first pair beyond the tolerance)"], ["peak", "THE DEEPEST PAIR OF THE EPISODE (capsules ATT / DEF)"], ["geometry", "WHERE ON EACH BODY (at onset)"], ["speed", "THE BODIES' CLOSING SPEED AT ONSET (roots, on the contact normal)"], ["cls", "STAGE 2's CLASS (most ticks)"]]) {
    console.log(`\n${title}`); console.log(`${"family".padEnd(100)}${"episodes".padStart(9)}${"unres. ticks".padStart(13)}${"peak cm".padStart(9)}${"trunk cm".padStart(9)}${"bodies m/s".padStart(11)}${"limb pts m/s".padStart(13)}  examples`);
    for (const [f, q] of fam(key)) console.log(`${f.slice(0, 99).padEnd(100)}${String(q.n).padStart(9)}${String(q.ticks).padStart(13)}${(q.peak * 100).toFixed(1).padStart(9)}${(q.trunk * 100).toFixed(1).padStart(9)}${med(q.root).toFixed(2).padStart(11)}${(q.closing.length ? med(q.closing).toFixed(2) : "—").padStart(13)}  ${q.ids.join(", ")}`); }
  console.log(`\nTHE EPISODES (onset)`); console.log(`${"case".padEnd(26)}${"t".padStart(7)}${"dur".padStart(6)}${"peak".padStart(6)}${"trunk".padStart(6)}  ATT action · phase · support  |  DEF action · phase · support  |  regions · closing / tangential (root closing) · on ATT / DEF · fast limb  |  ball`);
  for (const e of out) { const [a, d] = e.onset.players, C = e.onset.contact, B = e.onset.ball, ps = (p) => `${p.action.label}${p.action.phase !== "—" ? " · " + p.action.phase : ""} · ${p.support.state} ${p.support.planted.join("") || "—"}${p.support.margin != null ? ` (CoM ${(p.support.margin * 100).toFixed(0)} cm ${p.support.margin >= 0 ? "inside" : "outside"})` : ""}`;
    console.log(`${e.id.slice(0, 25).padEnd(26)}${e.onset.t.toFixed(3).padStart(7)}${e.dur.toFixed(2).padStart(6)}${(e.peak * 100).toFixed(1).padStart(6)}${(e.trunkPeak * 100).toFixed(1).padStart(6)}  ${ps(a)}  |  ${ps(d)}  |  ${C.name} · ${C.closing}/${C.tangential} (${C.rootClosing}) m/s · ${C.onATT.side}/${C.onDEF.side}${C.fastLimb ? " · FAST LIMB" : ""}  |  ${B.state}${B.owner ? "(" + B.owner + ")" : ""} ${B.distATT}/${B.distDEF} m`); }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ set: SET, res: RES, episodes: out, contactEpisodes: nAll.eps }, null, 0));
}

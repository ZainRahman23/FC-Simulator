// READ-ONLY audit of the SHARED leg law (the simulation's CHARCOLLIDE runner legs, V1.3 ptRxBodyChar → ofLocoCycle + ofLocoGroundPelvis), at constant speed,
// over two full cycles, 2000 samples per cycle, for walk → sprint. Nothing is modified: the V1.3 files run in a read-only vm (law_provider.mjs).
// Per speed: the pelvis / V2-COM vertical trajectory and its implied vertical force; every position jump and velocity kink with its cause; take-off / flight
// behaviour vs ballistic; stance-foot slip; swing clearance; swing-foot speed; joint-velocity peaks and cusps; swing-leg inverse-dynamics torque vs V2's
// capacity model; and the spring-mass (Morin 2005) vertical for the same stride timing, with the reach / clearance it would require of the authored legs.
// usage (worktree root, V13_WT …): node law_physics_audit.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../.."), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const LP = await import(path.join(ROOT, "promotion_carrier/slice/scripts/law_provider.mjs")); const { SIMV, L } = LP; const { V, Q, B, NB, rawRotations, project, loadAir, bodyLowest } = L;
const { anatomicalAngles, childRotation } = await import(P2 + "spec/v2_joints.js"), { ActuatorLayer } = await import(P2 + "sim/v2_actuation.js"), { bootSole } = await import(P2 + "sim/v2_geom.js");
const spec = L.spec, G = 9.81, Mt = B.reduce((s, b) => s + b.mass, 0), bi = (n) => B.findIndex(b => b.name === n), J = (n) => spec.joints.findIndex(j => j.name === n), D2R = Math.PI / 180;
const REC = loadAir(path.join(ROOT, "promotion_carrier/evidence/records/on_speed"), "lc_v3_LOCO.json.gz"), legLen = 0.865;
const act = new ActuatorLayer(spec, null, null), ofLocoParams = SIMV.g("ofLocoParams");
const mul4 = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), com = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const SOLE = { L: bootSole(B[bi("foot_L")]).pts, R: bootSole(B[bi("foot_R")]).pts }, idxP = REC.bones.findIndex(b => b.name === "pelvis");
// the simulation's law at constant speed v, time t from phase 0 (the sim's own constant-velocity / stride-clock extrapolation)
function lawAt(v, t) { const c = { char: "vinicius", p: { x: 0, y: 0, vx: v, vy: 0, facing: 0, gaitPhase: 0, legLen } }, Bd = SIMV.body(c, t, SIMV.footLenV12), fk = SIMV.g("__pcsFK"), fx = Bd.fx, fy = Bd.fy;
  const T = [-fy, 0, -fx, 0, 0, 1, 0, 0, fx, 0, -fy, 0, Bd.x, 0, -Bd.y, 1], world = fk.world.map(m => mul4(T, Array.from(m))), rr = rawRotations(REC.bones, REC.bind, world, { rk: true }), P = project(rr.raw, world, rr.idx);
  return { S: P.S, clamp: Math.max(...Object.values(P.clamp)), pelvisY: world[idxP][13], planted: { L: Bd.legs.L.planted, R: Bd.legs.R.planted }, up: { L: Bd.legs.L.up, R: Bd.legs.R.up }, phase: Bd.phase, x: Bd.x }; }
const matIdx = (S, sd) => { const i = bi("foot_" + sd); let m = Infinity, k = 0; SOLE[sd].forEach((p, j) => { const y = V.add(S[i].pos, Q.rot(S[i].rot, p))[1]; if (y < m) { m = y; k = j; } }); return k; };
const lowest = (S, sd) => { const i = bi("foot_" + sd); let m = null; for (const p of SOLE[sd]) { const w = V.add(S[i].pos, Q.rot(S[i].rot, p)); if (!m || w[1] < m[1]) m = w; } return m; };
const anat = (S, jn) => { const j = spec.joints[J(jn)]; return anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot); };
const flexAxis = (S, jn, key) => { const j = spec.joints[J(jn)], a = anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot), a2 = { ...a, [key]: a[key] + 0.01 }, q1 = childRotation(j, S[j.parentIndex].rot, a), q2 = childRotation(j, S[j.parentIndex].rot, a2), d = Q.mul(q2, Q.conj(q1)), v = [d[0], d[1], d[2]], n = V.len(v); return V.sc(v, (d[3] < 0 ? -1 : 1) / n); };
const KEY = { hip: "flex", knee: "flex", ankle: "df" }, POS = { hip: "flexion", knee: "flexion", ankle: "dorsiflexion" };
const capIn = (jn, base, S, rateDeg, sgn) => { const j = spec.joints[J(jn)], k = J(jn), i = ["x", "y", "z"].findIndex(kk => j.def.axes[kk] && j.def.axes[kk].key === KEY[base]), x = act.ax[k][i]; if (!x) return null;
  const a = anat(S, jn)[KEY[base]], want = sgn > 0 ? POS[base] : null, side = (sgn > 0) === (x.plus.dir === POS[base]) ? 1 : -1, wDir = sgn * rateDeg * D2R, kn = base === "ankle" ? anat(S, "knee_" + jn.slice(-1)).flex : null; return act.capFull(x, side, a, wDir, kn); };
// swing-leg Newton–Euler torque (inertial + gravity) about a joint, projected on its flexion axis
function swingTorque(Sm, S0, Sp, h, jn, base) { const k = J(jn), sub = []; const j = spec.joints[k]; const kids = (bIdx) => { sub.push(bIdx); spec.joints.filter(jj => jj.parentIndex === bIdx).forEach(jj => kids(jj.childIndex)); }; kids(j.childIndex);
  const pj = S0[j.childIndex].pos; let T = [0, 0, 0];
  for (const i of sub) { const c0 = comW(S0, i), a = V.sc(V.add(V.sub(comW(Sp, i), V.sc(c0, 2)), comW(Sm, i)), 1 / (h * h)), F = V.sc(V.sub(a, [0, -G, 0]), B[i].mass); T = V.add(T, V.cross(V.sub(c0, pj), F));
    const rv = (q) => { const s = q[3] < 0 ? -1 : 1, v = [q[0] * s, q[1] * s, q[2] * s], n = V.len(v); return n < 1e-12 ? [0, 0, 0] : V.sc(v, 2 * Math.atan2(n, q[3] * s) / n); };
    const wp = V.sc(rv(Q.mul(Sp[i].rot, Q.conj(S0[i].rot))), 1 / h), wm = V.sc(rv(Q.mul(S0[i].rot, Q.conj(Sm[i].rot))), 1 / h), w = V.sc(V.add(wp, wm), 0.5), al = V.sc(V.sub(wp, wm), 1 / h);
    const R = (() => { const [x, y, z, ww] = S0[i].rot; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * ww), 2 * (x * z + y * ww)], [2 * (x * y + z * ww), 1 - 2 * (x * x + z * z), 2 * (y * z - x * ww)], [2 * (x * z - y * ww), 2 * (y * z + x * ww), 1 - 2 * (x * x + y * y)]]; })();
    const I = B[i].inertia, mv = (M, v) => [0, 1, 2].map(r => M[r][0] * v[0] + M[r][1] * v[1] + M[r][2] * v[2]), Iw = (v) => mv(R, mv(I, mv([[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], [R[0][2], R[1][2], R[2][2]]], v)));
    T = V.add(T, V.add(Iw(al), V.cross(w, Iw(w)))); }
  return V.dot(T, flexAxis(S0, jn, KEY[base])); }
const SPEEDS = [1.45, 2.2, 3.0, 4.2, 5.5, 6.5, 7.5, 8.2], NPC = 2000, out = { note: "read-only audit of the shared leg law (V1.3 ptRxBodyChar) at constant speed", V2: { massKg: +Mt.toFixed(2), thighM: 0.435, shankM: 0.399, ankleHm: 0.088 }, speeds: {} };
for (const v of SPEEDS) { const P = ofLocoParams(v), step = P.step * legLen, cad = v / step, Tc = 2 / cad, S = P.stance, h = Tc / NPC, n = 2 * NPC;
  const smp = []; for (let i = -2; i <= n + 2; i++) smp.push(lawAt(v, i * h));
  const at = (i) => smp[i + 2], comY = [], pelY = [];
  for (let i = -2; i <= n + 2; i++) { const s = at(i); comY.push(com(s.S)[1]); pelY.push(s.pelvisY); }
  const Y = (i) => comY[i + 2], PY = (i) => pelY[i + 2];
  // events per sample: planted transitions, heel / toe switch (s = 0.62), take-over end (s = 0.12), flight
  const label = (i) => { const a = at(i - 1), b = at(i), out2 = []; for (const sd of ["L", "R"]) { if (!a.planted[sd] && b.planted[sd]) out2.push("touchdown_" + sd); if (a.planted[sd] && !b.planted[sd]) out2.push("toe-off_" + sd);
      const s0 = a.up[sd] / S, s1 = b.up[sd] / S; if (b.planted[sd] && s0 < 0.62 && s1 >= 0.62) out2.push("heel→toe_" + sd); if (b.planted[sd] && s0 < 0.12 && s1 >= 0.12) out2.push("takeover-end_" + sd);
      const sw0 = (a.up[sd] - S) / (1 - S), sw1 = (b.up[sd] - S) / (1 - S); if (!b.planted[sd] && sw0 < 0.72 && sw1 >= 0.72) out2.push("hip-swing-0.72_" + sd); }
    const fl = (s) => !s.planted.L && !s.planted.R; if (!fl(a) && fl(b)) out2.push("flight-start"); if (fl(a) && !fl(b)) out2.push("flight-end"); return out2; };
  const D = (i) => Y(i) - Y(i - 1), jumps = [], kinks = [], isJump = new Set();
  for (let i = 1; i <= n; i++) { const nb = 0.5 * (Math.abs(D(i - 1)) + Math.abs(D(i + 1))); if (Math.abs(D(i) - 0.5 * (D(i - 1) + D(i + 1))) > Math.max(2e-4, 4 * nb)) { isJump.add(i); jumps.push({ phase: +((i * h * cad / 2) % 1).toFixed(4), mm: +((D(i) - 0.5 * (D(i - 1) + D(i + 1))) * 1000).toFixed(2), events: label(i) }); } }
  const Dc = (i) => (isJump.has(i) ? 0.5 * (D(i - 1) + D(i + 1)) : D(i));
  for (let i = 2; i < n; i++) { const dvv = (Dc(i + 1) - Dc(i)) / h; if (Math.abs(dvv) > 0.15) { const ev = label(i).concat(label(i + 1)); kinks.push({ phase: +((i * h * cad / 2) % 1).toFixed(4), dVms: +dvv.toFixed(3), events: ev }); } }
  // collapse kinks into events (consecutive samples)
  const kinkEv = []; for (const k of kinks) { const last = kinkEv[kinkEv.length - 1]; if (last && Math.abs(k.phase - last.phase1) < 3 / NPC) { last.phase1 = k.phase; last.dVms += k.dVms; last.events = [...new Set(last.events.concat(k.events))]; } else kinkEv.push({ phase0: k.phase, phase1: k.phase, dVms: k.dVms, events: k.events.slice() }); }
  // implied vertical force (BW) from the COM, phases: stance (any planted) / flight, excluding samples adjacent to jumps (reported separately)
  const Yc = [Y(0)]; for (let i = 1; i <= n; i++) Yc.push(Yc[i - 1] + Dc(i)); const kp = Math.max(1, Math.round((1 / 240) / h)), hp = kp * h;
  const DP = (i) => PY(i) - PY(i - 1), Pc = [PY(0)]; for (let i = 1; i <= n; i++) Pc.push(Pc[i - 1] + (isJump.has(i) ? 0.5 * (DP(i - 1) + DP(i + 1)) : DP(i))); const bwPel = [];
  const bw = { stance: [], flight: [] }; let vTO = [], flightRise = [];
  for (let i = kp; i + kp <= n; i++) { const a = (Yc[i + kp] - 2 * Yc[i] + Yc[i - kp]) / (hp * hp), s = at(i), fl = !s.planted.L && !s.planted.R; (fl ? bw.flight : bw.stance).push(1 + a / G); if (!fl) bwPel.push(1 + (Pc[i + kp] - 2 * Pc[i] + Pc[i - kp]) / (hp * hp) / G); }
  for (let i = 1; i <= n; i++) { const a = at(i - 1), b = at(i); if ((a.planted.L || a.planted.R) && !b.planted.L && !b.planted.R) { vTO.push((Yc[i] - Yc[i - kp]) / hp); let j = i, mx = -Infinity; while (j <= n && !at(j).planted.L && !at(j).planted.R) { mx = Math.max(mx, Y(j)); j++; } flightRise.push({ riseMm: +((mx - Y(i)) * 1000).toFixed(1), durS: +((j - i) * h).toFixed(4) }); } }
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))].toFixed(2) : null; };
  // stance-foot slip (lowest sole point, horizontal travel while the law plants the foot) and swing clearance / swing-foot speed
  const slip = [], clear = [], fspeed = [], ankEx = [];
  const simPts = (sd, i) => { const c = { char: "vinicius", p: { x: 0, y: 0, vx: v, vy: 0, facing: 0, gaitPhase: 0, legLen } }, Bd = SIMV.body(c, i * h, SIMV.footLenV12), Lg = Bd.legs[sd]; return { pts: [Lg.footA, Lg.footB, Lg.toeB], ankle: Lg.ankle, planted: Lg.planted }; };
  for (const sd of ["L", "R"]) { let cur = null, sw = null;
    for (let i = 0; i < n; i++) { const s = at(i), lp = lowest(s.S, sd);
      if (s.planted[sd]) { const a2 = simPts(sd, i), b2 = simPts(sd, i + 1); let k = 0; for (let q = 1; q < 3; q++) if (a2.pts[q][2] < a2.pts[k][2]) k = q; const d = Math.hypot(b2.pts[k][0] - a2.pts[k][0], b2.pts[k][1] - a2.pts[k][1]);
        if (!cur) cur = { acc: 0, n: 0, a0: a2.ankle, ex: 0 }; cur.acc += d; cur.n++; cur.ex = Math.max(cur.ex, Math.hypot(a2.ankle[0] - cur.a0[0], a2.ankle[1] - cur.a0[1])); if (sw) { clear.push(sw); sw = null; } }
      else { if (cur) { slip.push({ mm: +(cur.acc * 1000).toFixed(0), meanMs: +(cur.acc / (cur.n * h)).toFixed(2) }); ankEx.push(+(cur.ex * 1000).toFixed(0)); cur = null; } const w = (s.up[sd] - S) / (1 - S); if (w > 0.1 && w < 0.9) { sw = sw == null ? lp[1] : Math.min(sw, lp[1]); } } }
    for (let i = kp; i + kp <= n; i++) { const s = at(i); if (s.planted[sd]) continue; let skip = false; for (let q = i - kp; q <= i + kp; q++) if (isJump.has(q)) skip = true; if (skip) continue; const f = bi("foot_" + sd), d = V.dist(comW(at(i + kp).S, f), comW(at(i - kp).S, f)) / (2 * hp); fspeed.push(d); } }
  // joint angular-velocity peaks and cusps (anatomical flexion rates, right leg), and swing-leg torque vs capacity
  const jr = {}; for (const [jn, base] of [["hip_R", "hip"], ["knee_R", "knee"], ["ankle_R", "ankle"]]) { const k = KEY[base], ang = []; for (let i = -1; i <= n + 1; i++) ang.push(anat(at(i).S, jn)[k]); let pk = 0, cusp = 0;
    for (let i = 1; i < ang.length - 1; i++) { const r1 = (ang[i + 1] - ang[i]) / h, r0 = (ang[i] - ang[i - 1]) / h; pk = Math.max(pk, Math.abs(r1)); cusp = Math.max(cusp, Math.abs(r1 - r0)); }
    jr[jn] = { range: [+Math.min(...ang).toFixed(1), +Math.max(...ang).toFixed(1)], peakRateDegS: +pk.toFixed(0), maxSlopeJumpDegS: +cusp.toFixed(0), romHard: spec.joints[J(jn)].def.rom[k].hard }; }
  const tq = {}; for (const [jn, base] of [["hip_R", "hip"], ["knee_R", "knee"]]) { let worst = { ratio: 0 }, peak = 0; const all = [], ratios = [];
    for (let i = kp; i + kp <= n; i += 1) { const s = at(i); if (s.planted.R) continue; const t = swingTorque(at(i - kp).S, s.S, at(i + kp).S, hp, jn, base), a0 = anat(at(i - kp).S, jn)[KEY[base]], a1 = anat(at(i + kp).S, jn)[KEY[base]], rate = (a1 - a0) / (2 * hp);
      const cap = capIn(jn, base, s.S, rate, Math.sign(t) || 1); peak = Math.max(peak, Math.abs(t)); all.push(Math.abs(t)); if (cap) ratios.push(Math.abs(t) / Math.max(1e-9, cap)); if (cap && Math.abs(t) / cap > worst.ratio) worst = { ratio: +(Math.abs(t) / cap).toFixed(2), torqueNm: +t.toFixed(0), capNm: +cap.toFixed(0), phase: +((i * h * cad / 2) % 1).toFixed(3) }; }
    tq[jn] = { swingPeakNm: +peak.toFixed(0), swingP95Nm: pct(all, 0.95), swingP50Nm: pct(all, 0.5), ratioToCapacityP50: pct(ratios, 0.5), ratioToCapacityP95: pct(ratios, 0.95), worstVsCapacity: worst }; }
  // spring-mass vertical (Morin 2005) for the same timing, running only; level at the law's touchdown COM; required vertical correction Δ = model − law
  let model = null; const stepT = Tc / 2, Tcon = S * Tc, Tf = stepT - Tcon;
  if (Tf > 1e-4) { const Fmax = (Math.PI / 2) * Mt * G * (Tf / Tcon + 1), vTD = -G * Tf / 2; const yRel = (tau) => { if (tau <= Tcon) { const w = Math.PI / Tcon, A = Fmax / Mt; return vTD * tau - 0.5 * G * tau * tau + (A / w) * (tau - Math.sin(w * tau) / w); } const y1 = yRel(Tcon), v1 = vTD + (-G * Tcon) + (Fmax / Mt) * (2 * Tcon / Math.PI), tt = tau - Tcon; return y1 + v1 * tt - 0.5 * G * tt * tt; };
    let iTD = null; for (let i = 1; i <= n; i++) { const a = at(i - 1), b = at(i); if (!a.planted.R && b.planted.R) { iTD = i; break; } }
    const y0 = Y(iTD); let dMin = Infinity, dMax = -Infinity, clrMin = Infinity, reachShort = -Infinity; const S0 = at(iTD);
    for (let i = iTD; i < iTD + Math.round(stepT / h) * 2 && i <= n; i++) { const tau = ((i - iTD) * h) % stepT, ym = y0 + yRel(tau), d = ym - Y(i); dMin = Math.min(dMin, d); dMax = Math.max(dMax, d); const s = at(i);
      for (const sd of ["L", "R"]) { if (!s.planted[sd]) { const w = (s.up[sd] - S) / (1 - S); if (w > 0.1 && w < 0.9) clrMin = Math.min(clrMin, lowest(s.S, sd)[1] + d); }
        else { const hip = s.S[bi("thigh_" + sd)].pos, ank = s.S[bi("foot_" + sd)].pos, dAuth = V.dist(hip, ank), dMax2 = 0.435 + 0.399; reachShort = Math.max(reachShort, d - (dMax2 - dAuth)); } } }
    model = { FmaxBW: +(Fmax / (Mt * G)).toFixed(2), landingVms: +vTD.toFixed(3), flightRiseMm: +(G * Tf * Tf / 8 * 1000).toFixed(1), stanceDropMm: +((y0 + yRel(Tcon / 2) - y0) * 1000).toFixed(1), correctionVsLawMm: [+(dMin * 1000).toFixed(1), +(dMax * 1000).toFixed(1)], swingClearanceWithModelMm: +(clrMin * 1000).toFixed(1), stanceReachExcessMm: +(reachShort * 1000).toFixed(1) }; }
  const swingClr = clear.length ? +(Math.min(...clear) * 1000).toFixed(1) : null;
  out.speeds[v] = { gait: P.gait, stance: +S.toFixed(3), cycleS: +Tc.toFixed(4), contactS: +Tcon.toFixed(4), flightS: +Math.max(0, Tf).toFixed(4), comRangeMm: +((Math.max(...comY) - Math.min(...comY)) * 1000).toFixed(1), pelvisRangeMm: +((Math.max(...pelY) - Math.min(...pelY)) * 1000).toFixed(1),
    jumps: jumps.length, jumpList: jumps.slice(0, 12), kinkEvents: kinkEv.length, kinkList: kinkEv.slice().sort((a, b) => Math.abs(b.dVms) - Math.abs(a.dVms)).slice(0, 10).map(k => ({ ...k, dVms: +k.dVms.toFixed(3) })),
    impliedBW240: { stance: { p1: pct(bw.stance, 0.01), p50: pct(bw.stance, 0.5), p99: pct(bw.stance, 0.99), min: pct(bw.stance, 0), max: pct(bw.stance, 1), fracNegative: +(bw.stance.filter(x => x < 0).length / bw.stance.length).toFixed(3) }, flight: bw.flight.length ? { min: pct(bw.flight, 0), p50: pct(bw.flight, 0.5), max: pct(bw.flight, 1) } : null },
    takeoffVms: vTO.map(x => +x.toFixed(2)), flight: flightRise, stanceGroundedPointSlip: slip, stanceAnkleExcursionMm: ankEx, impliedBW240pelvis: { p1: pct(bwPel, 0.01), p50: pct(bwPel, 0.5), p99: pct(bwPel, 0.99), fracNegative: +(bwPel.filter(x => x < 0).length / bwPel.length).toFixed(3) }, swingClearanceMinMm: swingClr, swingFootPeakMs: +Math.max(...fspeed).toFixed(2), joints: jr, swingTorque: tq, maxClampDeg: +Math.max(...smp.map(s => s.clamp)).toFixed(3), springMass: model };
  const o = out.speeds[v]; console.log(String(v).padEnd(5), o.gait.padEnd(6), "| jumps", JSON.stringify(o.jumpList.slice(0, 1).map(j => [j.mm, j.events.join("+")])), "kinkEv", o.kinkEvents, "| BW240 COM p1/p50/p99", o.impliedBW240.stance.p1, o.impliedBW240.stance.p50, o.impliedBW240.stance.p99, "neg", o.impliedBW240.stance.fracNegative, "| pelvis p1/p50/p99", o.impliedBW240pelvis.p1, o.impliedBW240pelvis.p50, o.impliedBW240pelvis.p99, "neg", o.impliedBW240pelvis.fracNegative, "| flight", o.impliedBW240.flight ? o.impliedBW240.flight.min + "…" + o.impliedBW240.flight.max : "-", "| TOv", o.takeoffVms[0], "| slip", JSON.stringify(o.stanceGroundedPointSlip[0]), "ankEx", o.stanceAnkleExcursionMm[0], "| clear", o.swingClearanceMinMm, "| footV", o.swingFootPeakMs, "| knee peak", o.joints.knee_R.peakRateDegS, "| swing τ p50/p95 hip", o.swingTorque.hip_R.swingP50Nm, o.swingTorque.hip_R.swingP95Nm, "knee", o.swingTorque.knee_R.swingP50Nm, o.swingTorque.knee_R.swingP95Nm, "ratio p50 hip/knee", o.swingTorque.hip_R.ratioToCapacityP50, o.swingTorque.knee_R.ratioToCapacityP50); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));

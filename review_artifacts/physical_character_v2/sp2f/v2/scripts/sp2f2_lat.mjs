// SP2F addendum (REFERENCE3): PERSISTENT LATERAL ORIENTATION diagnostic of one run record (reads the record; nothing is simulated). Every 2 steps (8.3 ms)
// from 0.2 s before the first fold-side turf contact to the end of the main slide:
//   pelvisRoll      pelvis roll (°, + onto the folded side, sp2a pelvisAngles)
//   trunkTilt       thorax up-axis angle from vertical (°; 0 = upright)
//   trunkRoll       thorax roll: elevation of the thorax LEFT axis below the horizontal (°, + = folded side down)
//   chestUp         elevation of the thorax chest normal above the horizontal (°, + = chest toward the sky / lying on the back, − = chest toward the turf)
//   psi, lie        the thorax lying direction ψ = atan2(chest-normal up, left-axis down) (°: 0 = on the folded side, +90 = on the back, −90 = chest-down)
//                   and how far it is lying, lie = |(n_y, l_y)| (0 = upright … 1 = lying); the same for the pelvis (psiP, lieP)
//   shL / shR / hipL / hipR    shoulder- and hip-joint heights (m)
//   contacts        turf-contact regions of the step (pelvis:left/right/buttock, thigh_L:<side>, torso:<body>:<left/right/back/front>, head, arm, hand / forearm)
// Classification (thorax): UPRIGHT when tilt < 30°; CHEST-DOWN when ψ < −30° (and lie ≥ 0.5); LATERAL when tilt ≥ 30° and −30° ≤ ψ ≤ 75°; BACK when ψ > 75°.
// Established lateral slide: the first time after the first fold contact from which the thorax stays LATERAL / BACK (never UPRIGHT / CHEST-DOWN again
// for > 25 ms) to the stop and the pelvis roll ≥ 35°. Summary: that time, the upright time, every excursion after establishment (toward upright, toward
// chest-down, ψ reversals), the pelvis-roll / ψ / lie ranges, the folded-side shoulder below the other shoulder (share of time), the contact regions' shares.
const S1 = new URL("../../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), AA = await import(new URL("../../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
const FM = await import(new URL("../../../sp2a/fsweep/scripts/fs_measure.mjs", import.meta.url).href);
const D = 180 / Math.PI, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000, r1 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10;
const orient = (q) => { const up = Q.rot(q, [0, 1, 0]), l = Q.rot(q, [-1, 0, 0]), n = Q.rot(q, [0, 0, 1]); return { tilt: Math.acos(Math.max(-1, Math.min(1, up[1]))) * D, roll: Math.asin(Math.max(-1, Math.min(1, -l[1]))) * D,
  chestUp: Math.asin(Math.max(-1, Math.min(1, n[1]))) * D, psi: Math.atan2(n[1], -l[1]) * D, lie: Math.hypot(n[1], l[1]) }; };
const sideTorso = (S, name, p) => { const b = S[bi(name)], rl = Q.rot(Q.conj(b.rot), V.sub(p, b.pos)); return [["left", -rl[0]], ["right", rl[0]], ["back", -rl[2]], ["front", rl[2]]].sort((a, c) => c[1] - a[1])[0][0]; };
export const LAT_COLS = ["t", "trel", "pelvisRoll", "trunkTilt", "trunkRoll", "chestUp", "psi", "lie", "psiP", "lieP", "shL", "shR", "hipL", "hipR", "cls", "contacts"];
export function classify(x) { if (x.tilt < 30) return "upright"; if (x.psi < -30 && x.lie >= 0.5) return "chestDown"; if (x.psi > 75) return "back"; if (x.psi >= -30) return "lateral"; return "other"; }
export function lateralDiag(o, m = 0.375) { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0;
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = recs[k].contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && (c.a === "turf" ? c.b : c.a)[1] === "foot_L"); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const fold = new Set(["thigh_L", "shank_L", "pelvis"]), k0 = recs.findIndex((r, k) => k > kTO && r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && fold.has((c.a === "turf" ? c.b : c.a)[1])));
  const fm = FM.measure(o, m), kStop = fm.stopped && fm.stopped.t != null ? Math.round((fm.stopped.t - tOff) * 240) - 1 : n - 1, t0 = recs[k0].t + tOff;
  const raw = [];
  for (let k = Math.max(1, k0 - 48); k <= kStop; k++) { const r = recs[k], S = r.S.slice(0, B.length), K = L.skel(S), th = orient(S[bi("thorax")].rot), pe = orient(S[0].rot), pa = AA.pelvisAngles(S[0].rot);
    const cs = new Set(); for (const c of RG.turfContacts(r, recs[k - 1].S, "tackler", 0, null)) { if (!(c.Jn > 0)) continue; const b = c.body;
      if (b === "abdomen" || b === "thorax") cs.add(`torso:${b}:${sideTorso(S, b, c.p)}`); else if (b === "pelvis" || b.startsWith("thigh") || b.startsWith("shank") || b.startsWith("forearm") || b === "head" || b.startsWith("upperArm")) cs.add(c.region); else if (b.startsWith("foot")) cs.add(c.group); }
    const x = { k, t: r.t + tOff, roll: pa.rollDeg, tilt: th.tilt, troll: th.roll, chestUp: th.chestUp, psi: th.psi, lie: th.lie, psiP: pe.psi, lieP: pe.lie, shL: K.shoulder_L[1], shR: K.shoulder_R[1], hipL: K.hip_L[1], hipR: K.hip_R[1], cs: [...cs].sort() };
    x.cls = classify(x); raw.push(x); }
  const after = raw.filter(x => x.t >= t0), H2 = 2 / 240, bad = (x) => x.cls === "upright" || x.cls === "chestDown" || x.cls === "other";
  // established: the earliest time after which no bad run longer than 25 ms occurs, with pelvis roll ≥ 35° there
  let est = null; { let lastBadEnd = null, run = 0; for (let i = 0; i < after.length; i++) { if (bad(after[i])) { run += 1 / 240; if (run > 0.025) lastBadEnd = i; } else run = 0; }
    const from = lastBadEnd == null ? 0 : lastBadEnd + 1; for (let i = from; i < after.length; i++) if (!bad(after[i]) && after[i].roll >= 35) { est = i; break; } }
  const estT = est != null ? after[est].t - t0 : null, seg = est != null ? after.slice(est) : [], uprightS = after.filter(x => x.cls === "upright").length / 240;
  const chestDownS = after.filter(x => x.cls === "chestDown").length / 240, segBadS = seg.filter(bad).length / 240;
  // ψ reversals in the established slide (ψ rate sign changes with |rate| > 30°/s on a 25 ms window)
  let rev = 0; { const W = 6; let prev = 0; for (let i = W; i < seg.length - W; i++) { const rt = (seg[i + W].psi - seg[i - W].psi) / (seg[i + W].t - seg[i - W].t); const s = Math.abs(rt) > 30 ? Math.sign(rt) : 0; if (s && prev && s !== prev) rev++; if (s) prev = s; } }
  const rng = (a, key) => a.length ? [r1(Math.min(...a.map(x => x[key]))), r1(Math.max(...a.map(x => x[key])))] : null;
  const regShare = {}; for (const x of seg) for (const c of x.cs) regShare[c] = (regShare[c] || 0) + 1; for (const c of Object.keys(regShare)) regShare[c] = r3(regShare[c] / Math.max(1, seg.length));
  const firstReg = {}; for (const x of after) for (const c of x.cs) if (firstReg[c] == null) firstReg[c] = r3(x.t - t0);
  const leftLow = seg.length ? r3(seg.filter(x => x.shL < x.shR).length / seg.length) : null, hipLeftLow = seg.length ? r3(seg.filter(x => x.hipL < x.hipR).length / seg.length) : null;
  const marks = Object.fromEntries([0, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0, 1.5, 2.0].map(dt => { const x = after.find(y => y.t - t0 >= dt - 1e-6); return [`+${dt.toFixed(2)}`, x ? { roll: r1(x.roll), tilt: r1(x.tilt), troll: r1(x.troll), chestUp: r1(x.chestUp), psi: r1(x.psi), lie: r3(x.lie), cls: x.cls, shDrop: r3(x.shR - x.shL) } : null]; }));
  const rows = raw.filter((_, i) => i % 2 === 0).map(x => [r3(x.t), r3(x.t - t0), r1(x.roll), r1(x.tilt), r1(x.troll), r1(x.chestUp), r1(x.psi), r3(x.lie), r1(x.psiP), r3(x.lieP), r3(x.shL), r3(x.shR), r3(x.hipL), r3(x.hipR), x.cls, x.cs.join(" ")]);
  return { hash: o.finalHash, firstFoldContactT: r3(t0), stopRel: r3(recs[kStop].t + tOff - t0), cols: LAT_COLS, rows,
    summary: { establishedLateral: r3(estT), uprightS: r3(uprightS), chestDownS: r3(chestDownS), excursionsAfterEstS: r3(segBadS), psiReversals: rev,
      afterEst: est != null ? { pelvisRoll: rng(seg, "roll"), trunkTilt: rng(seg, "tilt"), trunkRoll: rng(seg, "troll"), chestUp: rng(seg, "chestUp"), psi: rng(seg, "psi"), lie: rng(seg, "lie") } : null,
      foldShoulderLowShare: leftLow, foldHipLowShare: hipLeftLow, regionShareAfterEst: regShare, firstRegionContact: firstReg, marks } }; }

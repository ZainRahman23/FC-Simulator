// BALANCE-2 §5 — passive mechanical forward envelope of the settled BALANCE-1 standing state (diagnostic only; nothing is optimised).
// (1) support polygon of the settled state (loaded contact points; the rigid boot's sole hull and its toe-spring rocker);
// (2) static tipping boundary; (3) impulse boundaries under simplified passive conditions: (a) the zero-delay point-mass limit with the COP
//     instantly at the edge (LIP / XcoM), (b) the rigid "statue" (all joints locked) tipping about the front edge, as a function of the push
//     application height, (c) the M1b body with its tonic excitation FROZEN (intrinsic muscle + passive only, no neural feedback): impulse at
//     which the COM crosses the loaded front edge within 1 s, against the unpushed twin; (4) sensitivities of (a) to COM placement, COM height
//     (posture / knee flexion), foot angle (toe-out) and application height (b).
// usage: node b2_passive.mjs --geom <B2_GEOMETRY.json> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SPEC = PL.SPEC_R(), M = SPEC.totals.mass, g = 9.81;
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), CT = await import(RA + "balance1/scripts/b1_ctrl.mjs"), BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, G = JSON.parse(fs.readFileSync(arg("geom"))), b = G.battery;
const bi = (n) => SPEC.bodies.findIndex(x => x.name === n), FOOT = bi("foot_L"), boot = SPEC.bodies[FOOT].boot;
const h = b.com.heightM, w0 = Math.sqrt(g / h), ajcX = (b.feet.L.ajc[0] + b.feet.R.ajc[0]) / 2, comX = b.com.pos[0], out = { protocol: "BALANCE-2 §5 passive forward envelope (diagnostic)" };
// (1) support: the sole hull points of one foot (foot frame: along = forward from the AJC, lateral = medial +), their height above the sole plane
const hull = SPEC.bodies[FOOT].shapes.flatMap(sh => sh.points.map(p => V.add(sh.pos, Q.rot(sh.rot, p)))), soleY = -SPEC.landmarks.yA;   // local y of the sole plane
const pts = hull.map(p => ({ along: p[2], lat: p[0], hAbove: p[1] - soleY })), front0 = Math.max(...pts.filter(p => p.hAbove < 5e-4).map(p => p.along));
// the rocker: the sole profile's forward-most point at each height (the contact point after the boot pitches forward until that height touches)
const prof = [0, 0.001, 0.002, 0.004, 0.006, 0.008, 0.010, 0.012].map(hh => ({ hMm: hh * 1000, along: Math.max(...pts.filter(p => p.hAbove <= hh + 1e-6).map(p => p.along)) }));
// pitch needed to bring the profile point at height hh down to the turf when the boot rolls about its current front edge, and the heel lift
const rock = prof.slice(1).map(p => { const run = p.along - front0, pitch = Math.atan2(p.hMm / 1000, run), heelLift = (front0 - (-boot.heelBehindAJC)) * Math.sin(pitch); return { ...p, pitchDeg: pitch * 180 / Math.PI, heelLiftMm: heelLift * 1000, comToContactMm: (ajcX + p.along - comX) * 1000 }; });
out.support = { soleFrontAlongM: front0, soleHeelAlongM: -boot.heelBehindAJC, toeSpringM: boot.toeSpring, mtp1AlongM: boot.mtp1AheadAJC, mtp5AlongM: boot.mtp5AheadAJC, rockerProfile: prof, rocking: rock,
  polygonWorld: { fwdLoaded: b.edges.loadedFwd, fwdBattery: b.edges.fwd, back: b.edges.back, lateral: [b.feet.R.ajc[2], b.feet.L.ajc[2]] }, comX, ajcX };
// (2) static tipping: COM projection at the loaded front edge
const dL = b.edges.loadedFwd - comX; out.staticTipping = { comShiftToLoadedEdgeMm: dL * 1000, leanAboutAnkleDeg: Math.atan2(dL, h - SPEC.landmarks.yA) * 180 / Math.PI, comShiftToBatteryEdgeMm: (b.edges.fwd - comX) * 1000 };
// (3a) zero-delay point-mass limits for the candidate front edges
const lim = (d, hh = h) => M * Math.sqrt(g / hh) * d; out.zeroDelayNs = { loadedEdge: lim(dL), batteryEdge: lim(b.edges.fwd - comX), rocker5mm: lim(ajcX + prof.find(p => p.hMm === 4).along - comX), bootTip: lim(ajcX + boot.tipAheadAJC - comX), anatomicalToeTip: lim(ajcX + boot.footTipAheadAJC - comX) };
// (3b) rigid statue: J = sqrt(2 m g Δh I_edge) / hp, I_edge = I_com(pitch) + m (h² + d²), Δh = sqrt(h² + d²) − h; I_com from the settled segment layout
const base = await runOne({ law: "M1B", params: {}, ctrl: () => new CT.BalanceController(JSON.parse(fs.readFileSync(new URL("balance1/params/B1_B.json", RA)))), steps: 480, instrument: true }), S = base.recs[479].S;
let Ic = 0; SPEC.bodies.forEach((bd, i) => { const r = V.sub(S[i].com, [comX, h, b.com.pos[2]]); const Ib = bd.inertia; const R = (v) => Q.rot(S[i].rot, v); const ez = [0, 0, 1], ezl = Q.rot([-S[i].rot[0], -S[i].rot[1], -S[i].rot[2], S[i].rot[3]], ez);
  const Izz = ezl.reduce((s, a, p) => s + a * ezl.reduce((t, c, q) => t + Ib[p][q] * c, 0), 0); Ic += Izz + bd.mass * (r[0] ** 2 + r[1] ** 2); });
const heights = { pelvisCOM: S[bi("pelvis")].com[1], COM: h, abdomenCOM: S[bi("abdomen")].com[1], thoraxCOM: S[bi("thorax")].com[1], shoulder: S[bi("upperArm_L")].pos[1] };
const statue = (d, hp) => { const Ie = Ic + M * (h * h + d * d), dh = Math.sqrt(h * h + d * d) - h; return Math.sqrt(2 * M * g * dh * Ie) / hp; };
out.rigidStatue = { IcomPitch: Ic, heightsM: heights, Ns: Object.fromEntries(Object.entries(heights).map(([k, hp]) => [k, { loadedEdge: statue(dL, hp), batteryEdge: statue(b.edges.fwd - comX, hp) }])) };
// (3c) intrinsic-only M1b (tonic excitation frozen: no controller) — COM crossing of the loaded front edge within 1 s after a 50 ms pelvis pulse
const job = (pert, steps) => runOne({ law: "M1B", params: {}, ctrl: null, steps, perturb: pert, instrument: true });
const pb = await job([], 480 + 480), edgeX = b.edges.loadedFwd, drift = pb.recs.filter(r => r.n % 60 === 59).map(r => [+(r.n / 240).toFixed(2), +((r.chars.runner.com[0] - comX) * 1000).toFixed(1)]);
const crosses = async (J) => { const o = await job(BT.pushJob("fwd", J, 480, 12), 480 + 240); let t = null, pk = 0; for (let q = 480; q < o.recs.length; q++) { const x = o.recs[q].chars.runner.com[0], x0 = pb.recs[q].chars.runner.com[0]; pk = Math.max(pk, x - x0); if (t == null && x > edgeX) t = (q - 480) / 240; } return { J, crossT: t, peakRelTwinMm: pk * 1000 }; };
let lo = 0, hi = 30; const tried = []; for (let it = 0; it < 8; it++) { const J = (lo + hi) / 2, r = await crosses(J); tried.push(r); if (r.crossT != null) hi = J; else lo = J; }
out.intrinsicOnly = { note: "M1b body, tonic excitation at the entry rest statics (no controller); the twin's own drift is reported", twinDriftMmEvery0p25s: drift, crossWithin1sNs: (lo + hi) / 2, bracket: [lo, hi], tried, twinCrossesEdge: pb.recs.some(r => r.chars.runner.com[0] > edgeX) };
// (4) sensitivities of the zero-delay limit at the loaded edge
const dC = [-20, -10, -5, 0, 5, 10, 20].map(mm => ({ comShiftMm: mm, Ns: lim(dL - mm / 1000) })), dH = [-0.04, -0.02, 0, 0.02].map(dh => ({ comHeightChangeM: dh, Ns: lim(dL, h + dh) }));
const yaw = [0, 5, 10, 15, 20].map(deg => { const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180); const reach = Math.max(...pts.filter(p => p.hAbove < 5e-4).map(p => p.along * c + Math.abs(p.lat) * s * (p.lat > 0 ? 1 : -1))); return { toeOutDeg: deg, frontReachAlongM: reach, Ns: lim(dL + (reach - front0)) }; });
out.sensitivity = { comPlacement: dC, comHeight: dH, footToeOut: yaw, note: "foot toe-out: the left foot's medial side is +lateral in the foot frame; toe-out rotates the MTP1 (medial, forward-most) corner forward / the MTP5 corner back; reach is the forward-most sole point" };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ support: { front0, rock }, staticTipping: out.staticTipping, zeroDelayNs: out.zeroDelayNs, statue: out.rigidStatue, intrinsic: { crossNs: out.intrinsicOnly.crossWithin1sNs, drift: drift.slice(0, 10), twinCrosses: out.intrinsicOnly.twinCrossesEdge }, sens: out.sensitivity }, (k, v) => typeof v === "number" ? +v.toFixed(3) : v));

// SLIDE-PHYS-1 parameterised choreography (the G23 structure) + the Stage-1 objective used by the physics-in-the-loop authoring search.
// Every parameter is a physically meaningful authoring / intent quantity (plant support, lateral push, plant roll, tackling-hip drive, knee-extension
// coordination, leading-leg press, trunk sit-back, fold-leg lateral fold, arms). The objective encodes the brief's Stage-1 qualification items
// (no belly-flop / face-down roll, fold-side ground entry, tackling leg extended ahead, controlled landing, horizontal momentum kept, sit-back
// slide, a slide of plausible length) — it is a qualification measure, not a style score.
const CD = await import(new URL("./sp_cand.mjs", import.meta.url).href), L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, M, bi } = L;
export const PARAMS = [
  ["plantK1", 1.2, 2.0], ["plantK2", 1.0, 1.6], ["plantEnd", 0.07, 0.13], ["lateral", 0, 3.5], ["plantRoll", 0, 16], ["plantPitch", -10, 2],
  ["hipRpeak", 60, 90], ["hipRtime", 0.14, 0.30], ["kneeStart", 38, 55], ["kneeEnd", 55, 78],
  ["pressFy", 0, 0.7], ["pressPitch", -35, -10], ["pressStart", 0.2, 0.5], ["lumbarBack", -22, 0], ["foldRot", -45, -15], ["foldAbd", 8, 30], ["armR", 60, 150], ["armLabd", 20, 70]];
export const toPhys = (u) => Object.fromEntries(PARAMS.map(([k, lo, hi], i) => [k, lo + (hi - lo) * Math.max(0, Math.min(1, u[i]))]));
export const G23U = [0.625, 0.667, 0.5, 1.0, 0.875, 0.5, 0.5, 0.5, 0.12, 0.30, 0.64, 0.6, 0.5, 0.64, 0.23, 0.82, 0.55, 0.3];   // ≈ G23 (approximate start)
export function makeCand(p, speed = 5.0, id = "S") { const G = CD.G23, tr = JSON.parse(JSON.stringify(G.chor.tracks));
  tr["hip_R.flex"] = [[0, 0], [0.08, Math.min(p.hipRpeak, 35)], [p.hipRtime * 0.6, p.hipRpeak * 0.8], [p.hipRtime, p.hipRpeak], [p.hipRtime + 0.25, p.hipRpeak - 8], [1.6, p.hipRpeak - 15]];
  tr["lumbar.flex"] = [[0, 3], [0.12, 0], [0.3, p.lumbarBack], [0.6, p.lumbarBack], [1.2, p.lumbarBack * 0.5]];
  tr["hip_L.rot"] = [[0, 0], [0.08, p.foldRot * 0.4], [0.2, p.foldRot], [0.6, p.foldRot], [1.6, p.foldRot * 0.8]]; tr["hip_L.abd"] = [[0, 3], [0.08, p.foldAbd * 0.4], [0.2, p.foldAbd], [0.6, p.foldAbd], [1.6, p.foldAbd * 0.7]];
  tr["shoulder_R.flex"] = [[0, 45], [0.12, Math.min(85, p.armR)], [0.25, p.armR], [0.6, p.armR - 10], [1.2, p.armR - 30]]; tr["shoulder_L.abd"] = [[0, 12], [0.15, p.armLabd * 0.6], [0.3, p.armLabd]];
  const entry = { ...G.entry, id: G.entry.id + "@" + speed, vRoot: [G.entry.vRoot[0], G.entry.vRoot[1], speed] };
  return { ...G, id, entry, chor: { name: "search candidate", tracks: tr },
    couple: [{ joint: "knee_R", key: "flex", from: ["hip_R", "flex"], map: [[p.kneeStart, 115], [(p.kneeStart + p.kneeEnd) / 2, 70], [p.kneeEnd, 15]], window: [0, 0.6], blend: 0.02, predict: 0.03 }],
    pelvis: { pitch: [[0, 2], [p.plantEnd, p.plantPitch]], roll: [[0, 0], [p.plantEnd, p.plantRoll]], yaw: [[0, 0], [p.plantEnd, 4]] },
    vfPlan: { ...G.vfPlan, window: [-0.05, p.plantEnd], kappa: [[Math.min(0.05, p.plantEnd - 0.01), p.plantK1], [p.plantEnd, p.plantK2]], lateral: p.lateral },
    press: { ...G.press, fy: p.pressFy, window: [p.pressStart, 1.6], pelvis: { pitch: [[0, 0], [0.3, p.pressPitch], [1.6, p.pressPitch]], roll: [[0, 0], [0.3, 10], [1.6, 12]], yaw: [[0, 0], [1.6, 0]] } },
    params: p }; }
// ── Stage-1 qualification measures from a run (record kept only for the measures) ──
const fwd = (r) => { const v = r.chars.tackler.P; const h = Math.hypot(v[0], v[2]); return h > 1 ? [v[0] / h, 0, v[2] / h] : [0, 0, 1]; };
export function measures(out) { const R = out.recs, h = 1 / 240, travel = [0, 0, 1];
  const ser = R.map(r => { const S = r.S.slice(0, B.length), pel = S[0], th = S[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0]), belly = Q.rot(pel.rot, [0, 0, 1]), pup = Q.rot(pel.rot, [0, 1, 0]), c = r.chars.tackler, v = V.sc(c.P, 1 / M);
    const turf = new Set(r.contacts.filter(x => x.kind.startsWith("turf") && x.Jn > 0).map(x => (x.a === "turf" ? x.b : x.a)[1]));
    return { t: r.t, belly: belly[1], recline: Math.atan2(-V.dot(up, travel), up[1]) * 180 / Math.PI, roll: Math.atan2(-pup[0], pup[1]) * 180 / Math.PI, com: c.com, vh: Math.hypot(v[0], v[2]), vy: v[1], turf, S }; });
  const iE = ser.findIndex(x => [...x.turf].some(n => !/^foot_/.test(n))), e = iE >= 0 ? ser[iE] : null, first = e ? [...e.turf].filter(n => !/^foot_/.test(n)) : [];
  const knee = e ? L.anatOf(e.S).knee_R.flex : 120, ahead = e ? V.dot(V.sub(e.S[bi("foot_R")].com, e.S[0].com), travel) : 0;
  const slide = e ? ser.slice(iE, Math.min(ser.length, iE + 144)) : [], stopI = ser.findIndex((x, i) => i > iE && iE >= 0 && x.vh < 0.3), slideDist = e ? Math.hypot(...[0, 2].map(k => ser[stopI > 0 ? stopI : ser.length - 1].com[k] - e.com[k])) : 0;
  const late = ser.filter(x => x.t > 0.2), headHit = ser.findIndex(x => x.turf.has("head")), chestHit = ser.findIndex(x => x.turf.has("thorax"));
  return { entryT: e ? e.t : null, first, kneeAtEntry: knee, footAhead: ahead, vyEntry: e ? e.vy : null, vhEntry: e ? e.vh : null, slideDist, stopT: stopI > 0 ? ser[stopI].t : null,
    faceDown: late.reduce((s, x) => s + Math.max(0, -x.belly - 0.25) ** 2, 0) / Math.max(1, late.length), minBelly: Math.min(...late.map(x => x.belly)),
    reclineMean: slide.length ? slide.reduce((s, x) => s + x.recline, 0) / slide.length : null, reclinePen: slide.length ? slide.reduce((s, x) => s + Math.max(0, 10 - x.recline) + Math.max(0, x.recline - 55), 0) / slide.length / 20 : 3,
    rollPen: slide.length ? slide.reduce((s, x) => s + Math.max(0, 15 - Math.abs(x.roll)) + Math.max(0, Math.abs(x.roll) - 75), 0) / slide.length / 20 : 3,
    headT: headHit >= 0 ? ser[headHit].t : null, chestT: chestHit >= 0 ? ser[chestHit].t : null, finite: !out.stop }; }
export function cost(m) { const c = {}; if (!m.finite) return { total: 50, parts: { nonfinite: 50 } };
  c.faceDown = 30 * m.faceDown + (m.minBelly < -0.7 ? 2 * (-0.7 - m.minBelly) / 0.3 : 0); c.head = (m.headT != null ? 1.5 : 0) + (m.chestT != null ? 1.0 : 0);
  c.entryBody = m.entryT == null ? 3 : (m.first.some(n => ["thigh_L", "pelvis", "shank_L"].includes(n)) && !m.first.some(n => ["head", "thorax", "abdomen", "forearm_L", "forearm_R"].includes(n)) ? 0 : 1);
  c.knee = Math.max(0, m.kneeAtEntry - 30) / 30; c.footAhead = Math.max(0, 0.5 - m.footAhead) / 0.5; c.landing = m.vyEntry == null ? 1 : 0.5 * Math.max(0, Math.abs(m.vyEntry) - 2.5);
  c.vh = m.vhEntry == null ? 1 : 0.5 * Math.max(0, 3.2 - m.vhEntry); c.recline = 1.5 * m.reclinePen; c.roll = 0.7 * m.rollPen; c.slide = 0.5 * (Math.max(0, 1.2 - m.slideDist) + Math.max(0, m.slideDist - 4.0));
  const total = Object.values(c).reduce((s, x) => s + x, 0); return { total, parts: c }; }

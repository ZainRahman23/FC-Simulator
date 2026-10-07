// TD2 design study (offline, no simulation): the planned approach of candidate C2 (the E2 swing segment to the goal raised by the band height h_B) vs the validated E2 segment
// (goal on the turf), rebuilt from the MEASURED liftoff reference states and goals of the frozen FB battery's AB records (PSTAR5CHAB, all bodies / legs / trajectories, 240 Hz).
// Kinematic peaks against the validated A + B envelope (e2/TOUCHDOWN_COORDINATOR_DESIGN_STOP.md §2) and the reference lowest-point height at φ 0.8 (clearance binding point).
// usage: node approach_kinematics.mjs <runs dir> <hB mm>
import fs from "fs"; import zlib from "zlib";
const W = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2";
const { stepSegment, stepAt } = await import(W + "/ctrl/v2_swing.js");
const D = process.argv[2], hB = +(process.argv[3] || 2.05) / 1000, ENV = { aH: 2.8304, aV: 3.7427, jH: 63.30, jV: 81.84 }, LATE = { h: 0.01106, aV: 2.6324, vV: 0.2169, jV: 49.46, jH: 29.49 };
const TR = { "R-F": [0.6, 0.03], "R-L": [0.6, 0.03], "C-F7": [0.6, 0.03], "C-F13": [0.6, 0.03], "C-L5": [0.6, 0.03], "H-T45": [0.45, 0.03], "H-A40": [0.6, 0.04], "H-D": [0.6, 0.03], "H-F15": [0.6, 0.03] };
function kin(sg, turfY, T) { const dt = 1e-4, N = Math.round(T / dt); let m = { aH: 0, aV: 0, jH: 0, jV: 0, late: { aV: 0, vV: 0, jV: 0, jH: 0 } }, prev = null, prev2 = null;
  for (let i = 0; i <= N; i++) { const t = i * dt, e = stepAt(sg, t), aH = Math.hypot(e.acc[0], e.acc[2]); m.aH = Math.max(m.aH, aH); m.aV = Math.max(m.aV, Math.abs(e.acc[1]));
    if (prev) { const jH = Math.hypot(e.acc[0] - prev.acc[0], e.acc[2] - prev.acc[2]) / dt, jV = Math.abs(e.acc[1] - prev.acc[1]) / dt; m.jH = Math.max(m.jH, jH); m.jV = Math.max(m.jV, jV);
      const h = e.pos[1] - turfY; if (h <= LATE.h && t > T / 2) { m.late.aV = Math.max(m.late.aV, Math.abs(e.acc[1])); m.late.vV = Math.max(m.late.vV, Math.abs(e.vel[1])); m.late.jV = Math.max(m.late.jV, jV); m.late.jH = Math.max(m.late.jH, jH); } }
    prev = e; } return m; }
const rows = [];
for (const f of fs.readdirSync(D).filter(x => x.startsWith("fb_PSTAR5CHAB_") && x.includes("_240_") && x.endsWith(".json.gz"))) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(D + "/" + f))), tr = f.split("_").slice(-1)[0].replace(".json.gz", "");
  const s0 = r.rows.find(x => x.ph === "swing" && x.u != null && Math.abs(x.u) < 1e-9); if (!s0 || !r.goal) continue; const [T, apex] = TR[tr], ref = { p: s0.ref.p, v: s0.ref.v, a: s0.ref.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] };
  const goal = r.goal, turfY = goal.pos[1], gH = { pos: [goal.pos[0], goal.pos[1] + hB, goal.pos[2]], rot: goal.rot };
  const zK = r.anchor.pos[1] + apex, s1 = stepSegment(ref, goal, T, { z: zK, tk: 0.5 * T }), s2 = stepSegment(ref, gH, T, { z: zK, tk: 0.5 * T });   // the harness / E2 knot rule: anchor + apex (corrected 2026-10-07; first version used max(start, goal) + apex)
  const k1 = kin(s1, turfY, T), k2 = kin(s2, turfY, T), h80 = (sg) => (stepAt(sg, 0.8 * T).pos[1] - turfY) * 1000; rows.push({ f: f.slice(14, -8), tr, k1, k2, h1: h80(s1), h2: h80(s2), dh: h80(s2) - h80(s1) }); }
const mx = (a) => Math.max(...a), mn = (a) => Math.min(...a), keys = ["aH", "aV", "jH", "jV"];
console.log(`runs ${rows.length}, h_B ${(hB * 1000).toFixed(2)} mm`);
for (const set of ["R", "C", "H"]) { const S = rows.filter(r => r.tr[0] === set); console.log(`${set}: ` + keys.map(k => `${k} ${mx(S.map(r => r.k1[k])).toFixed(2)} → ${mx(S.map(r => r.k2[k])).toFixed(2)} (env ${ENV[k]})`).join(" | ")
  + ` | late: ` + ["aV", "vV", "jV", "jH"].map(k => `${k} ${mx(S.map(r => r.k1.late[k])).toFixed(3)} → ${mx(S.map(r => r.k2.late[k])).toFixed(3)} (≤ ${LATE[k]})`).join(" ") + ` | foot-origin height above turf at φ 0.8: ${mn(S.map(r => r.h1)).toFixed(2)} → ${mn(S.map(r => r.h2)).toFixed(2)} mm (Δ ${mn(S.map(r => r.dh)).toFixed(2)}…${mx(S.map(r => r.dh)).toFixed(2)})`); }

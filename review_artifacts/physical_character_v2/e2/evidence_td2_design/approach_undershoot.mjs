// TD2 design verification (offline): does the validated E2 approach segment (anchor + apex knot) undershoot its goal before T? min over t of (reference foot-origin height − goal
// height), for the TD2 band-top goal, from the measured liftoff reference states of the frozen FB AB records (all rates). Also the reference's height above the goal at the
// time the reference velocity first reaches zero in the descent.
import fs from "fs"; import zlib from "zlib";
const W = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2"; const { stepSegment, stepAt } = await import(W + "/ctrl/v2_swing.js");
const D = process.argv[2], hB = 0.00205, TR = { "R-F": [0.6, 0.03], "R-L": [0.6, 0.03], "C-F7": [0.6, 0.03], "C-F13": [0.6, 0.03], "C-L5": [0.6, 0.03], "H-T45": [0.45, 0.03], "H-A40": [0.6, 0.04], "H-D": [0.6, 0.03], "H-F15": [0.6, 0.03] };
const res = {}; for (const f of fs.readdirSync(D).filter(x => x.startsWith("fb_PSTAR5CHAB_") && x.endsWith(".json.gz"))) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(D + "/" + f))), tr = f.split("_").slice(-1)[0].replace(".json.gz", "");
  const s0 = r.rows.find(x => x.ph === "swing" && x.u != null && Math.abs(x.u) < 1e-9); if (!s0) continue; const [T, apex] = TR[tr], ref = { p: s0.ref.p, v: s0.ref.v, a: s0.ref.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] };
  const g = { pos: [r.goal.pos[0], r.goal.pos[1] + hB, r.goal.pos[2]], rot: r.goal.rot }, sg = stepSegment(ref, g, T, { z: r.anchor.pos[1] + apex, tk: 0.5 * T }); let mn = Infinity, tmn = null;
  for (let i = 0; i <= 2000; i++) { const t = T * i / 2000, e = stepAt(sg, t); const h = e.pos[1] - g.pos[1]; if (t > 0.5 * T && h < mn) { mn = h; tmn = t / T; } }
  (res[tr] = res[tr] || []).push({ f, mn: mn * 1000, tmn }); }
for (const [tr, S] of Object.entries(res)) { const w = S.reduce((a, b) => (b.mn < a.mn ? b : a)); console.log(`${tr.padEnd(6)} n ${S.length}: min (reference − goal) after the knot: worst ${w.mn.toFixed(3)} mm at φ ${w.tmn.toFixed(3)} (${w.f.slice(14, -8)}); runs with undershoot > 0.01 mm: ${S.filter(s => s.mn < -0.01).length}`); }

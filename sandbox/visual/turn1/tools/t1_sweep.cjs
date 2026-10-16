// turn1/tools/t1_sweep.cjs — the requested turn swept 20…180° in 5° steps at JOG / RUN / SPRINT (right turns, right foot just landed): resolved
// technique, plant time, entry / minimum speed, peak lean, plant crouch, time to the new heading — where the techniques change and whether the
// parameters inside each technique vary continuously with angle (the "interpolate, don't author every angle" evidence).
const { loadTurn1 } = require("./t1_load.cjs"), X = loadTurn1(), T = X.TURN1, fs = require("fs"), D = 180 / Math.PI;
const out = [];
for (const [sp, v] of [["JOG", 5.5], ["RUN", 7.8], ["SPRINT", 9.5]]) for (let a = 20; a <= 180; a += 5) {
  const turn = Math.min(a, 179.5), scn = { init: { v, heading: 0, pos: [20, 34] }, v, heading: 0, cmds: [{ t: 1.0, turn }] }, A = T.t1Make(X.skel, scn.init); let leanMax = 0, crMax = 0, tHead = null, vmin = 1e9, vPlant = null;
  for (let k = 0; k < 4.2 * 240; k++) { T.t1Step(A, T.t1Input(scn, k / 240)); const r = A.log[A.log.length - 1]; leanMax = Math.max(leanMax, Math.abs(r.lean[0])); crMax = Math.max(crMax, r.crouch); vmin = Math.min(vmin, r.s);
    if (tHead == null && r.t > 1 && Math.abs(T.wrapA(r.thv - turn / D)) < 5 / D && r.s > 0.5) tHead = r.t - 1; }
  const man = A.events.find(e => e[1] === "maneuver"), pl = A.events.find(e => e[1] === "TD" && e[3] === "PLANT"); if (pl) { const L = A.log.find(r => r.t >= pl[0]); vPlant = L ? L.s : null; }
  out.push({ speed: sp, turn: a, technique: man ? (man[2] === "PIVOT" ? "PIVOT" : man[3]) : "ARC", plantAfterS: pl ? +(pl[0] - 1).toFixed(3) : null, speedAtPlant: vPlant != null ? +vPlant.toFixed(2) : null, speedMin: +vmin.toFixed(2), leanMaxDeg: +(leanMax * D).toFixed(1), crouchMaxCm: +(crMax * 100).toFixed(1), headingWithin5degAfterS: tHead != null ? +tHead.toFixed(3) : null });
}
for (const r of out) console.log(r.speed.padEnd(7), String(r.turn).padStart(3), r.technique.padEnd(9), "plant", String(r.plantAfterS).padEnd(6), "v@plant", String(r.speedAtPlant).padEnd(5), "vmin", String(r.speedMin).padEnd(5), "lean", String(r.leanMaxDeg).padEnd(5), "crouch", String(r.crouchMaxCm).padEnd(5), "heading", r.headingWithin5degAfterS);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ note: "TURN-1 angle sweep (t1_sweep.cjs)", rows: out }, null, 1));

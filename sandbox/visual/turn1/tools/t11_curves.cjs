// turn1/tools/t11_curves.cjs — gentle curves stay procedural: per scenario, the 240 Hz joint positions with the TURN-1.1 layer attached vs TURN-1's body.
// A scenario whose request resolves to ARC steering never activates the layer and must be BIT-IDENTICAL. usage: node t11_curves.cjs [out.json]
const { X, T } = require("./t1_metrics.cjs"), SCN = require("../turn1_scenarios.js"), crypto = require("crypto"), fs = require("fs");
const out = { note: "TURN-1.1: pose identity with TURN-1 where the layer is not engaged (ARC steering, straight running); joint positions every 240 Hz step, 7 decimals", scenarios: {} };
for (const id of Object.keys(SCN.all)) { const s = SCN.get(id), r = [0, 1].map(m => { const A = T.t1Make(X.skel, s.init); if (m) X.TURN11.attach(A); const h = crypto.createHash("sha256"); let on = 0, man = false;
    for (let k = 0; k < s.dur * 240; k++) { T.t1Step(A, T.t1Input(s, k / 240)); if (A.man) man = true; if (A.l11s && A.l11s.on) on++; for (const j of T.t1Evaluate(A).fk.joint) h.update(j[0].toFixed(7) + "," + j[1].toFixed(7) + "," + j[2].toFixed(7) + "|"); }
    return { hash: h.digest("hex").slice(0, 16), activeSteps: on, maneuver: man }; });
  out.scenarios[id] = { maneuver: r[0].maneuver, poseIdenticalToTurn1: r[0].hash === r[1].hash, layerActiveSteps: r[1].activeSteps }; }
const v = Object.values(out.scenarios); out.arcAndStraight = { count: v.filter(x => !x.maneuver).length, allIdentical: v.filter(x => !x.maneuver).every(x => x.poseIdenticalToTurn1 && x.layerActiveSteps === 0) };
console.log(JSON.stringify(out.arcAndStraight)); if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));

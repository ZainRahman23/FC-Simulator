const { loadTurn1 } = require("./t1_load.cjs");
const X = loadTurn1(), T = X.TURN1, DEG = Math.PI / 180;
const v = +(process.argv[2] || 5.5), turn = +(process.argv[3] || 90), tCmd = +(process.argv[4] || 1.0), dur = +(process.argv[5] || 3.5);
const scn = { init: { v, heading: 0, pos: [20, 34] }, v, heading: 0, cmds: [{ t: tCmd, turn }] };
const A = T.t1Make(X.skel, scn.init);
const n = Math.round(dur * 240);
for (let k = 0; k < n; k++) { T.t1Step(A, T.t1Input(scn, k / 240)); if (k % 4 === 0) { try { T.t1Evaluate(A); } catch (e) { console.log("eval error at", A.t, e.stack.split("\n").slice(0, 4).join(" | ")); process.exit(1); } } }
console.log("events:"); for (const e of A.events) if (e[1] !== "TO") console.log("  ", JSON.stringify(e));
const L = A.log; for (let k = 0; k < L.length; k += 24) { const r = L[k]; console.log(r.t.toFixed(2), "P", r.x.toFixed(2), r.y.toFixed(2), "s", r.s.toFixed(2), "thv", (r.thv / DEG).toFixed(1), "psi", (r.psi / DEG).toFixed(1), "gaze", (r.gaze / DEG).toFixed(0), "lean", (r.lean[0] / DEG).toFixed(1), (r.lean[1] / DEG).toFixed(1), "cr", r.crouch.toFixed(3), r.role, r.man || ""); }

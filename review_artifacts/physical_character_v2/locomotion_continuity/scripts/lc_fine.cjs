// LC-1 OFFICIAL fine-rate construction runs (LC1_PREREG §5.3; rows LC-1a, LC-2, LC-6c): the frozen presentation (bit-exact with the page) at
// Δt = 1/3840 s on synthetic straight runs with the simulation's stride-clock law — the §5.1 speeds (3 s each) and a ramp 1.0 → 8.2 m/s over 3 s;
// the first 0.5 s excluded. Per-step velocity change |x(n+1) − 2x(n) + x(n−1)| / Δt of the rig pelvis, the presentation COM (de Leva) and every
// rig joint centre; each run twice (identical positions = LC-6c). usage: node lc_fine.cjs <tree> <out.json> [on|off] [runs]
const H = require("./pres_harness.cjs"), crypto = require("crypto"), fs = require("fs"), [WT, OUT, MODE, RUNS] = process.argv.slice(2);
const dt = 1 / 3840, T = 3.0, LIM = 0.18, runs = (RUNS || "1.45,2.2,3,4.2,5.5,6.5,7.5,8.2,ramp").split(","), out = { prereg: "LC1_PREREG.md §4 LC-1a / LC-2 / LC-6c", dt, limit: LIM, mode: MODE || "on", runs: {} };
for (const name of runs) {
  const vOf = name === "ramp" ? (t) => 1.0 + 7.2 * Math.min(1, t / 3.0) : () => +name, hashes = [];
  let res = null;
  for (let rep = 0; rep < 2; rep++) {
    const P = H.loadPres(WT, ["anim3d/of_loco_cont.js"]); if (MODE === "off") P.g("OF_CONT.on = false");
    const R = H.driveSynth(P, vOf, T, dt), O = R.out, sk = R.skel, com = P.g("ofContCOM"), k0 = Math.round(0.5 / dt);
    hashes.push(crypto.createHash("sha256").update(JSON.stringify(O.map(f => f.joint))).digest("hex").slice(0, 16));
    if (rep === 1) break;
    const C = O.map(f => com(sk, { joint: f.joint, tip: f.tip })), dvAt = (S, k) => Math.hypot(...[0, 1, 2].map(i => (S[k + 1][i] - 2 * S[k][i] + S[k - 1][i]) / dt));
    const scan = (S) => { let m = 0, at = 0, n = 0; for (let k = k0 + 1; k < S.length - 1; k++) { const d = dvAt(S, k); if (d > LIM) n++; if (d > m) { m = d; at = k; } } return { max: +m.toFixed(4), atS: +(at * dt).toFixed(4), stepsOver: n }; };
    const pel = scan(O.map(f => f.joint[sk.byName.pelvis.idx])), cm = scan(C); let jw = { max: 0 }, perJoint = {}, over = 0;
    for (let b = 0; b < sk.bones.length; b++) { if (!sk.bones[b].parent) continue; const r = scan(O.map(f => f.joint[b])); perJoint[sk.bones[b].name] = r; over += r.stepsOver; if (r.max > jw.max) jw = { ...r, bone: sk.bones[b].name }; }
    const steps = O.length - 1 - (k0 + 1);
    res = { steps, LC1a: { pelvis: pel, com: cm, pass: pel.max <= LIM && cm.max <= LIM }, LC2: { worst: jw, jointStepsOver: over, pass: jw.max <= LIM, perJoint } };
  }
  res.LC6c = { hashes, identical: hashes[0] === hashes[1] }; out.runs[name] = res;
  console.log(name.padEnd(5), "LC-1a pelvis", res.LC1a.pelvis.max, "COM", res.LC1a.com.max, res.LC1a.pass ? "PASS" : "FAIL", "| LC-2 worst", res.LC2.worst.max, res.LC2.worst.bone, "steps over", res.LC2.jointStepsOver, "/", res.steps * 22, res.LC2.pass ? "PASS" : "FAIL", "| LC-6c", res.LC6c.identical ? "identical" : "DIFFERENT");
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

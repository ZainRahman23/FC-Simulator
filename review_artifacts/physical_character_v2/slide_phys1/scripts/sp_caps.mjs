// SLIDE-PHYS-1 audit: canonical M1b isometric capacity per actuated axis of the tackler body (standing entry), and the force–velocity factor
// at representative joint speeds (the capacities every controller in this mission must live within). Output: evidence/caps.json + a table.
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, JN, M } = L;
const pose = L.fk({ pos: [0, 1.0, 0], rot: [0, 0, 0, 1] }, { knee_L: { flex: 5 }, knee_R: { flex: 5 } }), lo = L.lowestOf(pose);
const p2 = pose.map(s => ({ pos: V.add(s.pos, [0, 0.0005 - lo.y, 0]), rot: s.rot }));
// FK check: joint anchors coincide
let sep = 0; for (const j of JN) { const a = V.add(p2[j.parentIndex].pos, Q.rot(p2[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))), b = V.add(p2[j.childIndex].pos, Q.rot(p2[j.childIndex].rot, V.sub(j.at, B[j.childIndex].origin))); sep = Math.max(sep, V.dist(a, b)); }
let body = null; const sim = await L.soloPlant({ pose: p2, vel: p2.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })), steps: 2, law: (p, c) => (body = new L.MB.M1bBody(p, c, L.BODY, null)) });
const act = sim.tackler.act, P = sim.tackler.P, ev = sim.tackler.up.ev, out = [];
for (let k = 0; k < JN.length; k++) for (let i = 0; i < 3; i++) { const x = act.ax[k][i]; if (!x) continue; const an = P.anat(P.jd[k], ev.qs[k], x.key), kk = act.kneeOf[k], kd = kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null;
  const row = { joint: JN[k].name, key: x.key, plusDir: x.plus.dir, minusDir: x.minus.dir, anat: +an.toFixed(1), isoPlus: +act.capFull(x, 1, an, 0, kd).toFixed(1), isoMinus: +act.capFull(x, -1, an, 0, kd).toFixed(1) };
  for (const w of [2, 5, 10, 15]) { row["plus_w" + w] = +act.capFull(x, 1, an, w, kd).toFixed(1); row["minus_w" + w] = +act.capFull(x, -1, an, w, kd).toFixed(1); row["plus_ecc" + w] = +act.capFull(x, 1, an, -w, kd).toFixed(1); }
  out.push(row); }
// angle dependence of the key slide actuators
const sweep = {}; for (const [jn, key, angs] of [["hip_R", "flex", [-20, 0, 30, 60, 90, 110]], ["knee_L", "flex", [10, 40, 70, 100, 130]], ["hip_L", "flex", [-10, 20, 60, 100]]]) { const k = JN.findIndex(j => j.name === jn), i = act.ax[k].findIndex(x => x && x.key === key), x = act.ax[k][i];
  sweep[jn + "." + key] = angs.map(a => ({ anat: a, plus: +act.capFull(x, 1, a, 0, 5).toFixed(1), minus: +act.capFull(x, -1, a, 0, 5).toFixed(1) })); }
sim.destroy();
fs.mkdirSync(new URL("../evidence/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../evidence/caps.json", import.meta.url), JSON.stringify({ note: "canonical M1b capacities of the tackler body (V1-matched V2, 78.9 kg) at a standing pose; plus/minus = the axis' positive / negative anatomical direction; *_wN = concentric at N rad/s; plus_eccN = plus direction lengthening at N rad/s", fkAnchorSepM: sep, M, axes: out, sweep }, null, 1));
console.log("FK anchor sep (m)", sep.toExponential(2), "mass", M.toFixed(2));
for (const r of out) console.log(r.joint.padEnd(11), r.key.padEnd(5), (r.plusDir + "/" + r.minusDir).padEnd(42), "iso", String(r.isoPlus).padStart(6), String(r.isoMinus).padStart(6), " w5", String(r.plus_w5).padStart(6), " w10", String(r.plus_w10).padStart(6), " w15", String(r.plus_w15).padStart(6), " ecc5", r.plus_ecc5);
console.log(JSON.stringify(sweep));

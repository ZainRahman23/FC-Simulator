// C extension (diagnostic): per-primitive overlap of the recorded slide (LEG, BODY) with (a) the posed D-1 body, (b) the simulation's own capsule body (ptRxBody from the read-only trace)
import fs from "fs"; import zlib from "zlib"; import path from "path";
const W = process.cwd(), lib = await import(new URL("./d1a_lib.mjs", import.meta.url).href);
const { load, mapPose, slerp, V, Q, B, bi, gjk, supportOf } = lib, TR = JSON.parse(fs.readFileSync(path.join(W, "review_artifacts/physical_character_v2/pi1/d1a/d1a_trace.json"))).out;
const capSup = (a, b, r) => (d) => { const l = V.len(d), n = l > 1e-15 ? V.sc(d, 1 / l) : [1, 0, 0]; return V.dot(a, n) >= V.dot(b, n) ? V.add(a, V.sc(n, r)) : V.add(b, V.sc(n, r)); };
const segDist = (p1, q1, p2, q2) => { const d1 = V.sub(q1, p1), d2 = V.sub(q2, p2), r = V.sub(p1, p2), a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r), cl = (x) => Math.max(0, Math.min(1, x)); let s, t;
  const c = V.dot(d1, r), b = V.dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } return V.dist(V.add(p1, V.sc(d1, s)), V.add(p2, V.sc(d2, t))); };
const out = {};
for (const cs of ["rx_planted_leg", "rx_free_leg"]) { const R = load(`${cs}_LOCO.json.gz`), RF = load(`${cs}_FULL.json.gz`), maps = R.pres.map(p => mapPose(R.bones, R.bind, p.world)), tr = TR[cs + "_LOCO"].trace, rows = [];
  for (let k = 46; k <= 62; k++) for (let n = 1; n <= 4; n++) { const t = n / 4, S = maps[k].S.map((s, i) => ({ rot: slerp(maps[k - 1].S[i].rot, s.rot, t), pos: V.lerp(maps[k - 1].S[i].pos, s.pos, t) })), row = { time: k + t };
    for (const w of ["LEG", "BODY"]) { const pa = R.prims[k - 1].find(x => x.prim === w), pb = R.prims[k].find(x => x.prim === w); if (!pa || !pb) continue; const L = (u, v) => u.map((x, i) => x + (v[i] - x) * t), A2 = L(pa.a, pb.a), B2 = L(pa.b, pb.b);
      const a = [A2[0], A2[2], -A2[1]], b = [B2[0], B2[2], -B2[1]]; let best = { d: Infinity };
      for (const nm of ["foot_L", "shank_L", "foot_R", "shank_R", "thigh_L"]) { const i = bi(nm); for (const s of B[i].shapes) { const g = gjk(capSup(a, b, pb.r), supportOf(s, S[i])); const d = g.overlap ? -0.0001 : g.d; if (d < best.d) best = { d, body: nm }; } }
      row["D1_" + w] = +best.d.toFixed(4); row["D1_" + w + "_body"] = best.body;
      // the simulation's own capsules at this sub-step (trace rows cover k = 42..56; sub n of row k is squad time k + n/4)
      const trow = tr.find(x => x.row === k); if (trow) { const sub = trow.simModel.subs.find(x => x.sub === n), Lg = sub.legs.L, Rg = sub.legs.R, segs = [["foot_L", Lg.ankle, Lg.toe, 0.05], ["shin_L", Lg.knee, Lg.ankle, 0.06], ["foot_R", Rg.ankle, Rg.toe, 0.05], ["shin_R", Rg.knee, Rg.ankle, 0.06]];
        let sb = { d: Infinity }; for (const [nm, p, q, r] of segs) { const d = segDist(A2, B2, p, q) - r - pb.r; if (d < sb.d) sb = { d, body: nm }; } row["SIM_" + w] = +sb.d.toFixed(4); row["SIM_" + w + "_body"] = sb.body; } }
    row.footL_soleY = +lib.bodyLowest(B[bi("foot_L")], S[bi("foot_L")]).y.toFixed(4); row.presL = R.pres[k].feet[0].mode; rows.push(row); }
  out[cs] = rows; console.log("==", cs); for (const r of rows) if (r.time >= 48.5 && r.time <= 61) console.log(JSON.stringify(r)); }
fs.writeFileSync(path.join(W, "review_artifacts/physical_character_v2/pi1/d1a/d1a_contact_primitives.json"), JSON.stringify(out, null, 1));

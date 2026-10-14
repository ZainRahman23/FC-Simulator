// SLIDE-PHYS-1 generation ledger: re-runs every hand-built candidate (sp_cand.mjs CANDS) and the search results, writes the Stage-1 measures, the
// whole-body angular-momentum contributions of the turf contacts per body, the final hash (determinism), and saves each record outside Git.
// usage (worktree root): node sp_gens.mjs --records <dir outside git> --out evidence/generations.json [--only G1,G2]
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, B } = L, CD = await import(new URL("./sp_cand.mjs", import.meta.url).href);
const RUN = await import(new URL("./sp_run.mjs", import.meta.url).href), P = await import(new URL("./sp_param.mjs", import.meta.url).href), AM = await import(new URL("./sp_angmom.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, RD = arg("records"), only = arg("only") ? arg("only").split(",") : null; if (RD) fs.mkdirSync(RD, { recursive: true });
const contrib = (out, T) => { const cum = {}; for (const r of out.recs) { if (r.t > T) break; const A = AM.angMom(r.S.slice(0, B.length));
    for (const ct of r.contacts) { if (!ct.kind.startsWith("turf")) continue; const side = ct.a === "turf" ? ct.b : ct.a, sg = ct.a === "turf" ? 1 : -1; let H = [0, 0, 0];
      for (const q of ct.points) H = V.add(H, V.cross(V.sub(q.p, A.com), V.sc([0, 1, 0], q.lam))); if (ct.friction) H = V.add(H, V.cross(V.sub(ct.friction.at, A.com), V.sc(ct.friction.J, sg))); cum[side[1]] = V.add(cum[side[1]] || [0, 0, 0], H); } }
  return Object.fromEntries(Object.entries(cum).map(([k, v]) => [k, v.map(x => +x.toFixed(2))])); };
const res = fs.existsSync(arg("out")) ? JSON.parse(fs.readFileSync(arg("out"))) : { note: "per candidate: Stage-1 measures (sp_param.measures), cost parts, turf-contact angular impulse about the COM per body ([pitch x (+ forward), yaw y, roll z (+ toward the fold side)] N·m·s) to 0.6 / 1.0 s, final hash", cands: {} };
for (const [id, cand] of Object.entries(CD.CANDS)) { if (only && !only.includes(id)) continue; const o = await RUN.runCand(cand, {}), m = P.measures(o), c = P.cost(m); delete m.S;
  res.cands[id] = { muscle: cand.muscle || "M1b", hash: o.finalHash, steps: o.recs.length, cost: +c.total.toFixed(3), parts: Object.fromEntries(Object.entries(c.parts).map(([k, v]) => [k, +v.toFixed(3)])), m, contrib06: contrib(o, 0.6), contrib10: contrib(o, 1.0), wallMs: Math.round(o.wallMs) };
  if (RD) L.writeGz(`${RD}/${id}.json.gz`, o); console.log(id, o.finalHash, c.total.toFixed(2), JSON.stringify(m.first), "entry", m.entryT && m.entryT.toFixed(3), "minBelly", m.minBelly.toFixed(2), "recl", m.reclineMean && m.reclineMean.toFixed(0)); }
fs.writeFileSync(arg("out"), JSON.stringify(res, null, 1));

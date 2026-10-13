// SUPPORT-1 VISUAL PREPARATION (presentation only). Re-runs lab jobs deterministically (the final hash is checked against the sweep evidence when
// given) and writes per-step clip data for the frozen RUN-1 viewer: the recipient skinned by MC-1 (vinicius, exact for R0 — the same render rule as
// every PVP review), the actual V2 collision shapes as exact perspective silhouettes, the impactor's actual shape (capsule / sphere silhouette), the
// recipient's foot–turf contact points (the support polygon), the COM ground projection, per-foot normal load and slip, the impactor contact points.
// PRESENTATION YAW: the whole scene may be rotated about the vertical axis through the recipient's standing spot (--yaw deg) so that the
// disturbance crosses the screen; this is a rigid presentation transform of every rendered item (the turf is a uniform plane), nothing else.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node s1_clip_prep.mjs --runs key=CAND:LABEL[,...] --yaw 90 --range -24,600 --out <dir> [--evidence a.json,b.json]
import fs from "fs"; import path from "path";
const RA = new URL("../../", import.meta.url).href, T = await import(RA + "trc1/scripts/trc1_retarget.mjs"), { PL, MC, V, Q } = T, GM = await import(RA + "cxa1/scripts/cxa1_geom.mjs");
const SW = await import(RA + "support1/lab/s1_sweep.mjs"), CAND = await import(RA + "support1/lab/s1_candidates.mjs"), LAB = await import(RA + "support1/lab/s1_lab.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const yaw = +(arg("yaw", "0")) * Math.PI / 180, qY = Q.axis([0, 1, 0], yaw), [r0, r1] = arg("range", "-24,600").split(",").map(Number);
const sR = PL.SPEC_R(), mdR = MC.model(sR), { LOCO } = PL.records(), SKR = T.rig("vinicius"), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), toW = T.toW;
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
const pack = (P) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) }), camL = [0, 30, -77];
const evid = {}; for (const f of (arg("evidence", "") || "").split(",").filter(Boolean)) { const e = JSON.parse(fs.readFileSync(f)); for (const r of e.runs) evid[e.candidate + ":" + r.label] = r.hash; }
const rotP = (p) => Q.rot(qY, p), rotS = (s) => ({ pos: rotP(s.pos), rot: Q.norm(Q.mul(qY, s.rot)), com: rotP(s.com) });
const supCapsule = (a, b, r) => (d) => { const u = V.norm(d); return V.add(V.dot(u, V.sub(a, b)) >= 0 ? a : b, V.sc(u, r)); };
function silhouette(sup, c, who, name) { const vd = V.norm(V.sub(c, camL)), ax = Math.abs(vd[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(vd, ax)), w = V.cross(vd, u), pts = [];
  for (let k = 0; k < 48; k++) { const t = k * Math.PI / 24; pts.push(rv(toW(sup(V.add(V.sc(u, Math.cos(t)), V.sc(w, Math.sin(t))))))); } return { who, body: name, pts, depth: V.dist(c, camL) }; }
const meta = fs.existsSync(path.join(OUT, "meta.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"))) : { runs: {} };
const jobs = [...SW.gridJobs(), ...SW.slideJobs(), ...SW.pulseJobs(), ...SW.loadJobs(), ...(arg("pvp0") ? SW.replayJobs(arg("pvp0")) : [])];
for (const spec of arg("runs").split(",")) { const [key, cl] = spec.split("="), [cid, label] = cl.split(":"), cand = CAND.get(cid), job = jobs.find(j => j.label === label); if (!job) throw new Error("job " + label);
  const o = await SW.runJob(cand, job), R = o.recs, want = evid[cid + ":" + label], on = (R.find(r => r.ext && V.len(r.ext.J) > 1e-6) || { n: 240 }).n;
  if (want && want !== o.finalHash) throw new Error(`hash mismatch ${key}: ${o.finalHash} vs evidence ${want}`);
  const frames = [], imp = o.impactor;
  for (const r of R) { const t = r.n - on; if (t < r0 || t > r1) continue; const SL = r.S.map(rotS), WR = GM.worldShapes(sR, SL), shapes = WR.map(sh => silhouette(sh.sup, sh.bc, "R", sh.name));
    let impo = null; if (r.imp && imp) { const c = rotP(r.imp.com), ax = imp.shape === "capsule" ? V.sc(Q.rot(Q.mul(qY, r.imp.rot), [0, 1, 0]), imp.half) : [0, 0, 0], a = V.add(c, ax), b = V.sub(c, ax);
      impo = { sil: silhouette(supCapsule(a, b, imp.r), c, "I", "impactor").pts, a: rv(toW(a)), b: rv(toW(b)), r: imp.r, speed: +V.len(r.imp.v).toFixed(2) }; }
    const feet = {}; for (const s of ["L", "R"]) { const f = r.feet[s]; feet[s] = { N: Math.round(f.N), vs: f.vs != null ? +f.vs.toFixed(2) : null, pts: (f.pts || []).map(p => rv(toW(rotP([p[0], 0.0, p[1]])))) }; }
    const comG = rv(toW(rotP([r.com[0], 0, r.com[2]]))), focus = [toW(SL[0].pos), toW(SL[LAB.BI("foot_L")].pos), toW(SL[LAB.BI("foot_R")].pos)].map(rv);
    const ipts = r.ext && r.ext.imp && r.ext.imp.pts ? r.ext.imp.pts.map(p => rv(toW(rotP(p)))) : [];
    frames.push({ n: r.n, tMs: r5(t * 1000 / 240), phase: "phys", window: "w", auth: { runner: [50, 34] }, runner: pack(T.poseMC1(SKR, mdR, SL, qRef)), shapes: shapes.sort((a, b) => b.depth - a.depth), imp: impo, feet, comG, focus, ipts, sup: r.sup || null, pelvisY: +r.S[0].pos[1].toFixed(3) }); }
  fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
  meta.runs[key] = { cand: cid, label, frames: frames.length, onset: on, finalHash: o.finalHash, evidenceHash: want || null, yawDeg: yaw * 180 / Math.PI, range: [r0, r1], impactor: imp ? { m: imp.m, r: imp.r, half: imp.half, speed: V.len(imp.v), mode: imp.mode, height: imp.height } : null };
  console.log(key, cid, label, frames.length, "frames", o.finalHash, want ? (want === o.finalHash ? "= evidence" : "≠ evidence") : ""); }
meta.bonesR = SKR.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null })); fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 1));

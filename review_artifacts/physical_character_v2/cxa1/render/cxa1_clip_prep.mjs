// CXA-1 VISUAL PREPARATION (visualisation only; reads committed records + the CXA-1 audits; nothing re-simulated). Per recorded step: both rendered
// meshes (the same render rule MC-1 §2(4) as every PVP-1A-DX / ABI-1 visual: skins / joints), the camera rail (mean authoritative position, as the
// capture), and the ACTUAL V2 collision shapes of both players as exact perspective silhouettes (each convex shape's support points in 64 directions
// perpendicular to the camera ray through its centre; camera CAMERA_V1 position), the Jolt contact manifolds the solver used for this configuration
// (points, normals, impulses), and the audit's signed separation of the closest / penetrating collider pairs.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node cxa1_clip_prep.mjs --run <rec.json.gz> --fixture <fix.json> --audit <CXA1_*.json.gz>
//        --mesh <CXA1_MESH_*.json.gz | none> --key <id> [--order RT|TR] [--steps 1-100] --out <dir>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q, MC } = PL;
const GM = await import(new URL("../scripts/cxa1_geom.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), run = gz(arg("run")), FIX = JSON.parse(fs.readFileSync(arg("fixture"))), AUD = gz(arg("audit")), MESH = arg("mesh", "none") !== "none" ? gz(arg("mesh")) : null;
const key = arg("key"), order = arg("order", "RT"), [s0, s1] = arg("steps", "1-100").split("-").map(Number), OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const { OFF } = PL.records(), sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT), nR = sR.bodies.length, { LOCO } = PL.records();
const LV = IL.loadLV2(), X = LV.X, M4 = X.M4, OFFS = [50, 0, -34], toW = (p) => V.add(p, OFFS), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5);
const rig = (id) => { const SK = Object.assign({}, X.charSkel(id)); delete SK._r1body; return SK; }, SKR = rig("vinicius"), SKT = rig("gabriel");
const INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([body, bone]) => [bone, body]));
const qmat = (q, p) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, p[0], p[1], p[2], 1]; };
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
function retarget(SK, md, Sloc, q0) { const Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q = [], p = [], bi = md.bi, offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5);
  for (const b of SK.bones) { const i = b.idx, vb = INV[b.name]; if (!b.parent) { const pel = Sw[0].pos; q[i] = q0 ? q0[i] : [0, 0, 0, 1]; p[i] = [pel[0], 0, pel[2]]; continue; }
    q[i] = vb != null ? Q.norm(Q.mul(Sw[bi(vb)].rot, Q.conj(md.Z0[bi(vb)].rot))) : q0 ? Q.norm(Q.mul(q[b.parent.idx], Q.mul(Q.conj(q0[b.parent.idx]), q0[i]))) : q[b.parent.idx];
    p[i] = b.name === "pelvis" ? V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)) : V.add(p[b.parent.idx], Q.rot(q[b.parent.idx], b.off)); }
  const skin = []; SK.bones.forEach((b, i) => skin.push(...Array.from(M4.mul(qmat(q[b.idx], p[b.idx]), SK.invBind[i])))); return { skin: skin.map(r5), joint: p.map(rv), tip: SK.bones.map(b => rv(V.add(p[b.idx], Q.rot(q[b.idx], V.sc(b.dir, b.len))))) }; }
const authAt = (tau) => { const [r, s] = PL.rowSlot(tau), body = OFF.prims[r][s].find(p => p.prim === "BODY"); return { runner: [OFF.rows[r][8], OFF.rows[r][9]], tackler: [(body.a[0] + body.b[0]) / 2, (body.a[1] + body.b[1]) / 2] }; };
const split = (S) => (order === "TR" ? { R: S.slice(nR), T: S.slice(0, nR) } : { R: S.slice(0, nR), T: S.slice(nR) });
const SLOP = sR.contact.slop, auditBy = Object.fromEntries(AUD.steps.map(s => [s.n, s])), meshBy = MESH ? Object.fromEntries(MESH.frames.map(f => [f.n, f])) : {};
const robust = (f) => { if (!f) return null; const d = [...f.tacklerInRunner.verts, ...f.runnerInTackler.verts].map(v => v[1]).sort((a, b) => b - a); return { d10: d[9] || 0, n10: d.filter(x => x > 10).length, pairs: Object.entries({ ...f.tacklerInRunner.byPair, ...f.runnerInTackler.byPair }).sort((a, b) => b[1].maxMm - a[1].maxMm).slice(0, 2).map(([k, e]) => `${k} ${e.maxMm.toFixed(0)} mm`) }; };
function silhouettes(W, camL, flagged) { return W.map(sh => { const c = sh.bc, vd = V.norm(V.sub(c, camL)), a = Math.abs(vd[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(vd, a)), w = V.cross(vd, u), pts = [];
  for (let k = 0; k < 64; k++) { const t = k * Math.PI / 32, dir = V.add(V.sc(u, Math.cos(t)), V.sc(w, Math.sin(t))); pts.push(rv(toW(sh.sup(dir)))); }
  return { body: sh.name, k: sh.k, pts, depth: V.dist(c, camL), hot: flagged.has(sh.name + "#" + sh.k) }; }); }
const frames = [];
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const S = split(run.recs[n - 1].S), tau = FIX.tauAct + n / 4, auth = authAt(tau), simX = (auth.runner[0] + auth.tackler[0]) / 2, camL = [simX - 50, 30, -111 + 34];
  const A = auditBy[n] || { rows: [] }, hotR = new Set(), hotT = new Set(); for (const r of A.rows) if (r.d < -SLOP) { const [rk, tk] = r.key.split("|"); hotR.add(rk); hotT.add(tk); }
  const WR = GM.worldShapes(sR, S.R), WT = GM.worldShapes(sT, S.T), next = run.recs[n] || null;
  const cross = next ? next.contacts.filter(c => c.kind === "cross" && c.points.length).map(c => ({ pair: (c.a[0] === "runner" ? c.a[1] + "↔" + c.b[1] : c.b[1] + "↔" + c.a[1]), pts: c.points.map(p => ({ p: rv(toW(p.p)), lam: r5(p.lam), depth: r5(p.depth) })), n: rv(c.n), J: r5(V.len(c.J2)) })) : [];
  const near = A.rows.filter(r => r.d < 0.004).slice(0, 5).map(r => ({ key: r.key, dmm: +(r.d * 1000).toFixed(2), J: r.man ? +r.man.J.toFixed(3) : 0, p: rv(toW(r.p)) }));
  frames.push({ n, tau, tauMs: +(n * 1000 / 240).toFixed(3), auth, runner: retarget(SKR, mdR, S.R, qRef), tackler: retarget(SKT, mdT, S.T, null), shapes: [...silhouettes(WR, camL, hotR).map(s => ({ ...s, who: "R" })), ...silhouettes(WT, camL, hotT).map(s => ({ ...s, who: "T" }))].sort((a, b) => b.depth - a.depth),
    cross, near, maxPenMm: +(A.maxPen * 1000).toFixed(2), nOverSlop: A.nOverSlop || 0, uncached: A.uncached || [], visible: robust(meshBy[n]),
    feetRT: [rv(toW(S.R[13].pos)), rv(toW(S.T[10].pos))] }); }
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const meta = path.join(OUT, "meta.json"), M0 = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta)) : { runs: {} }; M0.runs[key] = { frames: frames.length, steps: [s0, Math.min(s1, run.recs.length)], window: AUD.window, finalHash: run.finalHash };
M0.bonesR = SKR.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null })); fs.writeFileSync(meta, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames");

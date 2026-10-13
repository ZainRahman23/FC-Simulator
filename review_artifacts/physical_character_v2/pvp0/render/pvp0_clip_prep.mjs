// PVP-0 VISUAL PREPARATION (presentation only; reads the PVP-0 run records, writes clip data; nothing re-simulated, interpolated or amplified).
// trc1/render/trc1_clip_prep.mjs with ONLY the PVP-1A-specific inputs replaced: there is no authoritative simulation in PVP-0, so the camera rail
// position is FIXED at the recipient's standing spot (pitch x 50, y 34 = local origin) instead of following an authoritative record, there is no
// lead-in, and the entry frame is the record's first step. Rendering rules unchanged: runner = MC-1 (vinicius, exact for R0), tackler = MC-1P
// (gabriel drawn on its actual V2 joints), the actual V2 collision shapes of both players as exact perspective silhouettes, the Jolt manifolds of
// the step (points, normals, impulse), the closest collider pairs.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node pvp0_clip_prep.mjs --key <id> --run <rec.json.gz> --steps a-b --out <dir>
// --- original header (trc1_clip_prep.mjs) ---
// TRC-1 VISUAL PREPARATION (presentation only; reads committed records, writes clip data; nothing re-simulated, interpolated or amplified).
// Runner: render rule MC-1 §2(4) (unchanged; exact for R0 ← vinicius). Tackler: MC-1P (trc1_retarget.mjs; gabriel stretched onto its V2 joints) and,
// with --withOld 1, also MC-1 for a before / after view. Per physical frame: both skins / joints / tips, the camera rail (mean authoritative position),
// the actual V2 collision shapes of both players as exact perspective silhouettes, the Jolt manifolds solved from this configuration, the signed
// separation of the closest collider pairs, the window label. Lead-in (optional): runner = frozen LOCO presentation; tackler = activation pose carried by
// the authoritative BODY-primitive displacement (labelled constructed), as every earlier review.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node trc1_clip_prep.mjs --key <id> --run <rec.json.gz> --fixture <fix.json> --window <n>
//        [--steps 0-100] [--lead 1] [--withOld 0] --out <dir>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("../../trc1/scripts/trc1_retarget.mjs", import.meta.url).href), { PL, MC, V, Q } = T;
const GM = await import(new URL("../../cxa1/scripts/cxa1_geom.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const key = arg("key"), run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), FIX = { tauAct: 0 }, win = 0, [s0, s1] = arg("steps", "0-100").split("-").map(Number);
const withLead = false, withOld = false, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT), nR = sR.bodies.length, { OFF, LOCO } = PL.records(), X = T.LV().X, M4 = X.M4;
const SKR = T.rig("vinicius"), SKT = T.rig("gabriel"), RT = T.buildPhys(SKT, sT), r5 = (x) => Math.round(x * 1e5) / 1e5, rv = (v) => v.map(r5), toW = T.toW;
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
const pack = (P, SK) => ({ skin: Array.from(P.skin, r5), joint: P.p.map(rv), tip: P.tip.map(rv) });
const AUTH_FIXED = { runner: [50, 34], tackler: [50, 34] }; // PVP-0: fixed camera rail at the recipient (pitch coords)
const authAt_unused = (tau) => { const [r, s] = PL.rowSlot(tau), body = OFF.prims[r][s].find(p => p.prim === "BODY"); return { runner: [OFF.rows[r][8], OFF.rows[r][9]], tackler: [(body.a[0] + body.b[0]) / 2, (body.a[1] + body.b[1]) / 2] }; };
function presFrame(row) { const W = LOCO.pres[row].world, skin = [], joint = [], tip = []; SKR.bones.forEach((b, i) => { const m = W[LOCO.bones.findIndex(x => x.name === b.name)]; skin.push(...Array.from(M4.mul(m, SKR.invBind[i]))); joint.push(rv([m[12], m[13], m[14]])); tip.push(rv(Array.from(M4.transformPoint(m, X.V3.scale(b.dir, b.len))))); }); return { skin: skin.map(r5), joint, tip }; }
function silhouettes(W, camL, who) { return W.map(sh => { const c = sh.bc, vd = V.norm(V.sub(c, camL)), a = Math.abs(vd[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(vd, a)), w = V.cross(vd, u), pts = [];
  for (let k = 0; k < 48; k++) { const t = k * Math.PI / 24; pts.push(rv(toW(sh.sup(V.add(V.sc(u, Math.cos(t)), V.sc(w, Math.sin(t))))))); } return { who, body: sh.name, pts, depth: V.dist(c, camL) }; }); }
const entryS = () => { const mk = (spec, w) => w.poses.map((p, i) => ({ pos: p.pos, rot: p.rot, com: V.add(p.pos, Q.rot(p.rot, spec.bodies[i].comLocal)), v: w.vel[i].v, w: w.vel[i].w })); return [...mk(sR, FIX.write.runner), ...mk(sT, FIX.write.tackler)]; };
const frames = [];
if (withLead) { const bodyMid = (tau) => { const g = PL.primsAt(OFF, tau).find(p => p.prim === "BODY"); return V.lerp(g.a, g.b, 0.5); }, mid0 = bodyMid(FIX.tauAct);
  for (let k = 0; k < 60; k++) { const tau = FIX.tauAct - 15 + k / 4, row = Math.floor(tau - 1 + 1e-9), d = V.sub(bodyMid(tau), mid0), ST = FIX.write.tackler.poses.map(s => ({ pos: V.add(s.pos, d), rot: s.rot }));
    frames.push({ k, tau, tauMs: r5((tau - FIX.tauAct) * 1000 / 60), phase: "lead", n: null, auth: authAt(tau), runner: presFrame(Math.min(50, row)), tackler: pack(T.posePhys(RT, ST), SKT), ...(withOld ? { tacklerOld: pack(T.poseMC1(SKT, mdT, ST, null), SKT) } : {}) }); } }
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const S = run.recs[Math.max(0, n - 1)].S, SR = S.slice(0, nR), ST = S.slice(nR), tau = n / 4, auth = AUTH_FIXED, ACT = run.setup.activate, simX = (auth.runner[0] + auth.tackler[0]) / 2, camL = [simX - 50, 30, -111 + 34];
  const WR = GM.worldShapes(sR, SR), WT = GM.worldShapes(sT, ST), near = [];
  for (const a of WR) for (const b of WT) { if (V.dist(a.bc, b.bc) - a.br - b.br > 0.02) continue; const g = GM.signedDistance(a.sup, b.sup); if (g.d < 0.02) near.push({ key: `${a.name}#${a.k}|${b.name}#${b.k}`, dmm: +(g.d * 1000).toFixed(2), p: rv(toW(V.sc(V.add(g.pA, g.pB), 0.5))) }); }
  near.sort((x, y) => x.dmm - y.dmm); const next = n >= 1 ? run.recs[n] || null : run.recs[0];
  const cross = next ? next.contacts.filter(c => c.kind === "cross" && c.points.length).map(c => ({ pts: c.points.map(p => ({ p: rv(toW(p.p)), lam: r5(p.lam) })), n: rv(c.n), J: r5(V.len(c.J2)) })) : [];
  frames.push({ n, tau, tauMs: r5((n - ACT) * 1000 / 240), phase: "phys", window: run.recs[Math.max(0, n - 1)].tacklerActive ? "active" : "parked", auth, runner: pack(T.poseMC1(SKR, mdR, SR, qRef), SKR), tackler: pack(T.posePhys(RT, ST), SKT), ...(withOld ? { tacklerOld: pack(T.poseMC1(SKT, mdT, ST, null), SKT) } : {}),
    shapes: [...silhouettes(WR, camL, "R"), ...silhouettes(WT, camL, "T")].sort((a, b) => b.depth - a.depth), cross, near: near.slice(0, 4), minSepMm: near.length ? near[0].dmm : null, feetRT: [rv(toW(SR[13].pos)), rv(toW(ST[10].pos))],
    firstContact: !!run.recs.find(r => r.n <= n && r.contacts.some(c => c.kind === "cross" && V.len(c.J2) >= 1e-3)) }); }
const fc = run.recs.find(r => r.contacts.some(c => c.kind === "cross" && V.len(c.J2) >= 1e-3));
fs.writeFileSync(path.join(OUT, key + ".json"), JSON.stringify({ key, frames }));
const mf = path.join(OUT, "meta.json"), M0 = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf)) : { runs: {} }; M0.runs[key] = { frames: frames.length, window: win, firstContact: fc ? fc.n : null, finalHash: run.finalHash, lead: false, withOld: false, steps: [s0, s1], case: run.case };
M0.bonesR = SKR.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null })); M0.bonesT = SKT.bones.map(b => ({ name: b.name, idx: b.idx, parent: b.parent ? b.parent.idx : null }));
fs.writeFileSync(mf, JSON.stringify(M0, null, 1)); console.log(key, frames.length, "frames; first contact", fc ? fc.n : "none");

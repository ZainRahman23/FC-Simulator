// PPR-1 validation battery (preregistered job list; the same jobs for law A and law B). Scenes:
//   QS      quiet standing — the runner ALONE (no tackler exists), PVP-1A-DX entry pose, 4.0 s;
//   PUSH    pelvis pushes (force through the pelvis COM, 100 ms from 0.5 s), 10 N·s in 8 horizontal directions, and a graded series 5 / 20 / 40 /
//           60 / 90 N·s forward, backward, right (2.0 s each; their 10 N·s members are the 0° / 180° / 270° pushes);
//   IMP     IFM-1's diagnostic impactor (10 kg sphere, r 0.060 m, 3.000 m/s, gap 0.5 mm) on the runner alone: the right shank mid-length from behind
//           (the tackle's direction, a generic object), the left shank mid-length from the side, the left deltoid sphere from the side (1.0 s);
//   C0 / N2 PVP-1A-DX with contacts disabled / native (260 steps; N2 is the experiment, judged only inside 0–120 ms after first contact);
//   DET     QS and N2 repeated (bit-identical hashes required).
// Records go to --dir (outside Git); per-run summaries are computed by ppr1_metrics.mjs.
// usage: V2_KNEE_MODEL=v2k node ppr1_battery.mjs --law A --fixture <PVP1A_FIXTURE.json> --dir <records dir> [--only QS,PUSH,...]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const GM = await import(new URL("../../cxa1/scripts/cxa1_geom.mjs", import.meta.url).href);
const { runOne } = await import(new URL("./ppr1_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const BATTERY = Object.freeze({ qsSteps: 960, pushFrom: 120, pushSteps: 24, pushSteps2: 480, pushDirs: 8, pushSmallNs: 10, graded: [5, 10, 20, 40, 60, 90], gradedDirs: ["fwd", "back", "right"],
  imp: { r: 0.060, m: 10, I: 0.0144, speed: 3.0, gapMm: 0.5, steps: 240 }, pvpSteps: 260 });
// the runner's horizontal frame from the entry pose (facing +x in the PVP-1A local frame; left = +z)
function frame(FIX) { const s = PL.SPEC_R(), P = FIX.write.runner.poses, bi = (n) => s.bodies.findIndex(b => b.name === n), pel = P[bi("pelvis")], f0 = Q.rot(pel.rot, [0, 0, 1]), fwd = V.norm([f0[0], 0, f0[2]]);
  const lr = V.sub(P[bi("foot_L")].pos, P[bi("foot_R")].pos), l0 = V.norm([lr[0], 0, lr[2]]), left = V.norm(V.sub(l0, V.sc(fwd, V.dot(l0, fwd))));   // the runner's left = from the right foot to the left foot (the spec's +z)
  return { fwd, left, right: V.sc(left, -1), back: V.sc(fwd, -1) }; }
// impactor placement: start 0.3 m back along −u from the target point and bisect the offset to a 0.5 mm gap to the target body's shapes
function placeImpactor(FIX, body, target, u) { const s = PL.SPEC_R(), i = s.bodies.findIndex(b => b.name === body), P = FIX.write.runner.poses, W = GM.worldShapes(s, P.map(p => ({ pos: p.pos, rot: p.rot }))).filter(w => w.b === i);
  const gap = (d) => Math.min(...W.map(w => GM.CL.sdShape(w.s, w.st, V.sub(target, V.sc(u, d))))) - BATTERY.imp.r; let lo = 0, hi = 0.3;   // sphere ↔ convex shape: point signed distance − r (stateless, exact)
  for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (gap(mid) > BATTERY.imp.gapMm / 1000) hi = mid; else lo = mid; } const c = V.sub(target, V.sc(u, hi));
  return { centre: c, v: V.sc(u, BATTERY.imp.speed), r: BATTERY.imp.r, m: BATTERY.imp.m, I: BATTERY.imp.I, gapM: gap(hi) }; }
export function jobs(FIX) { const F = frame(FIX), s = PL.SPEC_R(), P = FIX.write.runner.poses, bi = (n) => s.bodies.findIndex(b => b.name === n), J = [];
  const pelvisCom = s.bodies[bi("pelvis")].comLocal, dirs = [...Array(BATTERY.pushDirs)].map((_, k) => { const a = k * 2 * Math.PI / BATTERY.pushDirs; return { id: `d${Math.round(a * 180 / Math.PI)}`, u: V.add(V.sc(F.fwd, Math.cos(a)), V.sc(F.left, Math.sin(a))) }; });
  const push = (id, u, Ns) => ({ id, scene: "SOLO", steps: BATTERY.pushSteps2, perturb: [{ from: BATTERY.pushFrom, to: BATTERY.pushFrom + BATTERY.pushSteps, body: "pelvis", pLocal: pelvisCom, F: V.sc(u, Ns / (BATTERY.pushSteps / 240)) }] });
  J.push({ id: "QS", scene: "SOLO", steps: BATTERY.qsSteps });
  for (const d of dirs) J.push(push(`PUSH_${d.id}_${BATTERY.pushSmallNs}`, d.u, BATTERY.pushSmallNs));
  for (const g of BATTERY.gradedDirs) for (const Ns of BATTERY.graded) if (Ns !== BATTERY.pushSmallNs) J.push(push(`PUSHG_${g}_${Ns}`, F[g], Ns));
  const shankMid = (b) => { const ss = s.bodies[bi(b)].shapes[0], p = P[bi(b)]; return V.add(p.pos, Q.rot(p.rot, ss.pos || [0, 0, 0])); }, deltoid = (() => { const b = s.bodies[bi("upperArm_L")], sh = b.shapes.find(x => x.type === "sphere"), p = P[bi("upperArm_L")]; return V.add(p.pos, Q.rot(p.rot, sh.pos)); })();
  J.push({ id: "IMP_shankR_back", scene: "SOLO", steps: BATTERY.imp.steps, impactor: placeImpactor(FIX, "shank_R", shankMid("shank_R"), F.fwd) });
  J.push({ id: "IMP_shankL_side", scene: "SOLO", steps: BATTERY.imp.steps, impactor: placeImpactor(FIX, "shank_L", shankMid("shank_L"), F.right) });
  J.push({ id: "IMP_deltoidL_side", scene: "SOLO", steps: BATTERY.imp.steps, impactor: placeImpactor(FIX, "upperArm_L", deltoid, F.right) });
  J.push({ id: "C0", scene: "C0", steps: BATTERY.pvpSteps }); J.push({ id: "N2", scene: "N2", steps: BATTERY.pvpSteps });
  return J; }
if (process.argv[1] && process.argv[1].endsWith("ppr1_battery.mjs")) {
  const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), law = arg("law", "A"), dir = arg("dir"), only = arg("only") ? arg("only").split(",") : null; fs.mkdirSync(dir, { recursive: true });
  const list = jobs(FIX).filter(j => !only || only.some(o => j.id === o || j.id.startsWith(o + "_"))), log = [];
  for (const j of list) { const t0 = performance.now(), o = await runOne({ fixtureObj: FIX, law, ...j, label: j.id }), f = path.join(dir, `${law}_${j.id}.json.gz`);
    fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(o))); const L = { id: j.id, law, steps: o.recs.length, final: o.finalHash, stop: o.stop || null, s: +((performance.now() - t0) / 1000).toFixed(2), imp: j.impactor ? { gapMm: +(j.impactor.gapM * 1000).toFixed(3) } : undefined };
    log.push(L); console.log(JSON.stringify(L)); }
  if (!only || only.includes("DET")) for (const id of ["QS", "N2"]) { const j = jobs(FIX).find(x => x.id === id), o = await runOne({ fixtureObj: FIX, law, ...j, label: id + "_rep" }), first = log.find(x => x.id === id);
    const L = { id: id + "_DET", law, final: o.finalHash, identical: first ? first.final === o.finalHash : null }; log.push(L); console.log(JSON.stringify(L)); }
  fs.writeFileSync(path.join(dir, `${law}_battery_log.json`), JSON.stringify(log, null, 1)); }

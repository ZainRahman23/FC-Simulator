// CHARCOLLIDE-1 profile generator (CORRECTION_DESIGN_FROZEN.md §1 + TRACKB_PREREG.md §2.2–2.3): the runner's gameplay leg / foot / toe capsules
// from the character's own rig record and its V2 physical colliders. Deterministic; no tackle outcome is read.
// usage (worktree root): node sandbox/visual/physchar2/tools/charcollide_profile.mjs <character id> <out dir> [<sim data .js path>]
import fs from "fs"; import path from "path"; import crypto from "crypto"; import { fileURLToPath } from "url";
import { V } from "../core/v2_math.js"; import { hullPlanes } from "../sim/v2_geom.js"; import { pi1RunnerSpec, pi1RunnerF1Spec, PI1_RUNNER_F1 } from "../spec/v2_pi1_runner.js";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../../../.."), id = process.argv[2] || "vinicius", outDir = process.argv[3];
if (id !== "vinicius") throw new Error("only the D-1 runner (vinicius) has a V2 physical body");
const rigPath = path.join(root, "assets/characters/outfield", id, "rig.json"), rigBuf = fs.readFileSync(rigPath), rig = JSON.parse(rigBuf), sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const F1 = pi1RunnerF1Spec(), F0 = pi1RunnerSpec(), body = (S, n) => S.bodies.find(b => b.name === n);
const src = {};   // the source of every number
// ── rig landmarks (foot / toe frames = the rig bone frames; bind rotations are identity) ──
const bone = (n) => rig.bones.find(b => b.name === n), foot = bone("foot_L"), toe = bone("toe_L"), fw = rig.feet.L;
const ankleH = rig.ankleHeightM, heelBack = -fw.footwearMin[2], mtpLocal = toe.offsetLocal.slice(), tipToe = V.sc(toe.bindDirLocal, toe.lengthM);   // toe tip in the toe frame
src.ankleH = "rig.json ankleHeightM"; src.heelBack = "rig.json feet.L.footwearMin[2] (boot heel behind the ankle joint)"; src.mtpLocal = "rig.json toe_L.offsetLocal"; src.tipToe = "rig.json toe_L bindDirLocal × lengthM";
// ── V2 limb radii (identical on F0 and F1) ──
const sh = (S, n) => body(S, n).shapes[0], th0 = sh(F0, "thigh_L"), sk0 = sh(F0, "shank_L"), th1 = sh(F1, "thigh_L"), sk1 = sh(F1, "shank_L");
if (th0.rTop !== th1.rTop || th0.rBot !== th1.rBot || sk0.rTop !== sk1.rTop || sk0.rBot !== sk1.rBot) throw new Error("F0 / F1 limb colliders differ");
const thigh = [th0.rTop, th0.rBot], shin = [sk0.rTop, sk0.rBot];
src.thigh = `V2 thigh_L tapered collider rTop / rBot (${th0.note})`; src.shin = `V2 shank_L tapered collider rTop / rBot (${sk0.note})`;
// ── the record-length boot (D-1F1 geometry, articulation not used): rear pieces in the foot frame + front pieces moved into the foot frame ──
function pieces(sd) { const f = body(F1, "foot_" + sd), t = body(F1, "toe_" + sd), d = V.sub(t.origin, f.origin);
  return { rear: f.shapes.map(h => h.points.map(p => V.add(p, h.pos))), front: t.shapes.map(h => h.points.map(p => V.add(V.add(p, h.pos), d))), lat: f.origin[0] }; }
// cross-section of a convex piece at z = z0: hull of the vertex-pair segment intersections → x / y extents of the union
function section(P, z0) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, any = false;
  for (const pc of P) for (let i = 0; i < pc.length; i++) for (let j = i; j < pc.length; j++) { const a = pc[i], b = pc[j];
    if ((a[2] - z0) * (b[2] - z0) > 0) continue; const t = Math.abs(b[2] - a[2]) < 1e-12 ? 0 : (z0 - a[2]) / (b[2] - a[2]); if (t < -1e-12 || t > 1 + 1e-12) continue;
    const q = V.add(a, V.sc(V.sub(b, a), t)); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); any = true; }
  return any ? { w: x1 - x0, h: y1 - y0, x0, x1, y0, y1 } : null; }
const fixed = (f, r0) => { let r = r0; for (let k = 0; k < 200; k++) { const n = f(r); if (Math.abs(n - r) < 1e-12) return n; r = n; } return r; };
// inside test against the union of convex pieces (hullPlanes: N·p − d ≤ 0 inside)
function inside(P, p, tol) { return P.some(pc => hullPlanes(pc).every(pl => V.dot(pl.N, p) - pl.d <= tol)); }
// deterministic capsule surface samples (Fibonacci directions on both end spheres, the cone band between them)
function samples(a, b, ra, rb, n) { const out = [], ax = V.sub(b, a), L = V.len(ax), u = V.sc(ax, 1 / L), tmp = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = V.norm(V.cross(u, tmp)), e2 = V.cross(u, e1), g = Math.PI * (3 - Math.sqrt(5));
  for (let k = 0; k < n; k++) { const zf = 1 - 2 * (k + 0.5) / n, rr = Math.sqrt(1 - zf * zf), ph = g * k, dir = V.add(V.add(V.sc(e1, rr * Math.cos(ph)), V.sc(e2, rr * Math.sin(ph))), V.sc(u, zf));
    if (k % 3 === 0) out.push(V.add(a, V.sc(dir, ra))); else if (k % 3 === 1) out.push(V.add(b, V.sc(dir, rb)));
    else { const s = (k * 0.6180339887) % 1, r = ra + (rb - ra) * s, c = V.add(a, V.sc(ax, s)); out.push(V.add(c, V.add(V.sc(e1, r * Math.cos(ph)), V.sc(e2, r * Math.sin(ph))))); } }
  return out; }
// TRACKB_PREREG A1: per end, the largest sphere centred on the foot centre line (x = 0) in the frozen end plane, inscribed in the union of the
// boot pieces (2,000 samples inside, tolerance 0.5 mm), its height searched on a 0.5 mm grid, its radius capped at the design value; then
// the cone band between the two end spheres, scaled by one common factor if it protrudes (both bisections are monotone: fixed centres)
const fib = (n) => { const g = Math.PI * (3 - Math.sqrt(5)), o = []; for (let k = 0; k < n; k++) { const z = 1 - 2 * (k + 0.5) / n, r = Math.sqrt(1 - z * z); o.push([r * Math.cos(g * k), r * Math.sin(g * k), z]); } return o; };
const DIR400 = fib(400), DIR2000 = fib(2000);
const sphereIn = (P, c, r, dirs, tol) => dirs.every(d => inside(P, V.add(c, V.sc(d, r)), tol));
function maxR(P, c, cap, dirs, tol) { if (!inside(P, c, tol)) return 0; let lo = 0, hi = cap; if (sphereIn(P, c, hi, dirs, tol)) return hi; for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi); if (sphereIn(P, c, m, dirs, tol)) lo = m; else hi = m; } return lo; }
function endSphere(P, z, cap, sec, tol) { let best = { r: -1, y: null };
  for (let y = sec.y0; y <= sec.y1 + 1e-12; y += 0.0005) { const r = maxR(P, [0, y, z], cap, DIR400, tol); if (r > best.r + 1e-12) best = { r, y }; }
  const r = maxR(P, [0, best.y, z], cap, DIR2000, tol); return { c: [0, best.y, z], r, capped: Math.abs(r - cap) < 1e-9 }; }
function bandOK(P, a, b, ra, rb, tol) { return samples(a, b, ra, rb, 2000).every(p => inside(P, p, tol)); }
function scaleBand(P, a, b, ra, rb, tol) { if (bandOK(P, a, b, ra, rb, tol)) return 1; let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi); if (bandOK(P, a, b, ra * m, rb * m, tol)) lo = m; else hi = m; } return lo; }
const sides = {};
for (const sd of ["L", "R"]) { const B = pieces(sd), all = B.rear.concat(B.front), tipZ = mtpLocal[2] + tipToe[2], mtpZ = mtpLocal[2], tol = 0.0005;
  const rh0 = fixed(r => { const s = section(B.rear, -heelBack + r); return Math.min(s.w, s.h) / 2; }, 0.03);
  const smt = section(all, mtpZ), rm0 = Math.min(smt.w, smt.h) / 2;
  const rt0 = fixed(r => { const s = section(B.front, tipZ - r); return Math.min(s.w, s.h) / 2; }, 0.02);
  const zh = -heelBack + rh0, zt = tipZ - rt0, sh_ = section(all, zh), st_ = section(all, zt);
  const H = endSphere(all, zh, rh0, sh_, tol), M = endSphere(all, mtpZ, rm0, smt, tol), T = endSphere(all, zt, rt0, st_, tol);
  const kf = scaleBand(all, H.c, M.c, H.r, M.r, tol), rh = H.r * kf, rm = M.r * kf;
  const kt = scaleBand(all, M.c, T.c, T.r, T.r, tol), rt = T.r * kt;   // the toe capsule is uniform r_t (CORRECTION §1)
  sides[sd] = { sections: { heel: sh_, mtp: smt, tip: st_ }, design: { rh: rh0, rm: rm0, rt: rt0 }, ends: { heel: H, mtp: M, tip: T }, bandScale: { foot: kf, toe: kt },
    foot: { a: H.c, b: M.c, ra: rh, rb: rm }, toe: { a: M.c, bFootFrame: T.c, bToeFrame: V.sub(T.c, mtpLocal), r: rt },
    check2000: { foot: bandOK(all, H.c, M.c, rh, rm, tol), toe: bandOK(all, M.c, T.c, rt, rt, tol) } }; }
const S = sides.L; for (const k of ["rh", "rm", "rt"]) if (Math.abs(sides.L.design[k] - sides.R.design[k]) > 1e-9) throw new Error("L / R boot sections differ: " + k);
for (const k of ["ra", "rb"]) if (Math.abs(sides.L.foot[k] - sides.R.foot[k]) > 1e-6) console.warn("L / R foot radius differ", k, sides.L.foot[k], sides.R.foot[k]);
src.footRadii = "record-length V2 boot hull: design radius min(½ width, ½ height) of the end-plane sections (heel-end centre plane, MTP plane, toe-box tip-end centre plane); TRACKB_PREREG A1 largest inscribed sphere on the centre line in each plane (capped at the design value) + common cone-band scale";
// ── the profile (the simulation reads only these fields) ──
const profile = { version: "CHARCOLLIDE-1", id, generator: "physchar2/tools/charcollide_profile.mjs", rigSha256: sha(rigBuf), rigConfigSha256: rig.configSha256,
  rig: { H: rig.H, playerId: rig.playerId, legLenM: rig.legLenM, hipHeightM: rig.hipHeightM, ankleHeightM: rig.ankleHeightM,
    bones: rig.bones.map(b => ({ index: b.index, name: b.name, parent: b.parent, offsetLocal: b.offsetLocal, bindOrigin: b.bindOrigin, bindDirLocal: b.bindDirLocal, lengthM: b.lengthM, radiusM: b.radiusM, part: b.part })) },
  radii: { thigh, shin },
  // foot capsule in the FOOT frame; toe capsule a = the foot capsule's MTP-end centre (foot frame), b = the tip-end centre in the TOE frame
  foot: { a: S.foot.a, b: S.foot.b, ra: S.foot.ra, rb: S.foot.rb }, toe: { aFoot: S.toe.a, bToe: S.toe.bToeFrame, r: S.toe.r },
  kinds: { foot: "foot", toe: "foot", shin: "shin", thigh: "thigh" } };
const profJson = JSON.stringify(profile), profSha = sha(Buffer.from(profJson));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `charcollide_${id}.json`), JSON.stringify({ ...profile, sha256OfCompactProfile: profSha, sources: src, sides }, null, 1));
const dataJs = `// ═══ pt_charcollide.js — CHARCOLLIDE-1 runner collision profiles (FROZEN DATA; generated, never hand-edited) ═══\n// Generated by physical-character-v2 ${profile.generator} from assets/characters/outfield/${id}/rig.json (sha256 ${profile.rigSha256})\n// and the character's V2 colliders. Profile sha256 (compact JSON) ${profSha}. See review_artifacts/physical_character_v2/pi1/trackB/charcollide/.\nconst PT_CHARCOLLIDE = { version: "CHARCOLLIDE-1", profiles: { ${id}: ${profJson} } };\nif (typeof module !== "undefined" && module.exports) module.exports = { PT_CHARCOLLIDE };\n`;
if (process.argv[4]) fs.writeFileSync(process.argv[4], dataJs);
fs.writeFileSync(path.join(outDir, "pt_charcollide.js"), dataJs);
// ── old → new table ──
const LEG = 0.865, f = (x) => (x * 1000).toFixed(1) + " mm";
const rows = [
  ["leg length used for the leg segments", `${f(LEG)} (PT.LEG_REF)`, `thigh ${f(bone("thigh_L").lengthM)} + shin ${f(bone("shin_L").lengthM)} = ${f(rig.legLenM)}`, "rig.json bones thigh_L / shin_L lengthM; legLenM"],
  ["hip joint height", `${f(1.08 * LEG)} (1.08 × leg)`, f(rig.hipHeightM) + " (pelvis offset + cycle bob)", "rig.json hipHeightM; ofLocoCycle pelvis"],
  ["hip half-width", `${f(0.10 * LEG)} (0.10 × leg)`, f(-bone("thigh_L").offsetLocal[0]), "rig.json thigh_L offsetLocal"],
  ["thigh / shin split", `${f(0.51 * LEG)} / ${f(0.49 * LEG)}`, `${f(bone("thigh_L").lengthM)} / ${f(bone("shin_L").lengthM)}`, "rig.json"],
  ["ankle height at rest", f(0.08), f(ankleH), "rig.json ankleHeightM"],
  ["swing pose", "own lift law (0.10 – 0.34 m peak) + two-link knee", "ofLocoCycle on the character's skeleton (the presentation's pure law), skelFK", "of_loco.js / skeleton.js"],
  ["foot capsule", "ankle → toe point 0.20 m (V1.2 far slides 0.27 m) ahead, r 50.0 mm", `heel-end → MTP-end centres, r ${f(S.foot.ra)} → ${f(S.foot.rb)}`, src.footRadii],
  ["toe capsule", "— (part of the foot capsule)", `MTP-end → tip-end centre, r ${f(S.toe.r)}`, src.footRadii],
  ["shin capsule", "r 60.0 mm", `tapered ${f(shin[0])} → ${f(shin[1])}`, src.shin],
  ["thigh capsule", "r 80.0 mm", `tapered ${f(thigh[0])} → ${f(thigh[1])}`, src.thigh],
  ["pelvis / torso capsules", "r 150 / 170 mm on the legacy hip height", "unchanged", "CORRECTION_DESIGN §1 scope"],
  ["planted rule", "stride clock: up < stance", "unchanged", "CORRECTION_DESIGN §1"],
];
const ins = (e, k) => `centre height ${f(e.c[1] + ankleH)} above the studs; largest inscribed ${f(e.r)}${e.capped ? ' (= design cap)' : ''}; × band scale ${k.toFixed(4)} → ${f(e.r * k)}`;
const md = `# CHARCOLLIDE-1 profile: ${id} (generated; old → new runner gameplay geometry)\n\n**Inputs:**\n- \`assets/characters/outfield/${id}/rig.json\`: SHA-256 \`${profile.rigSha256}\`; config \`${rig.configSha256}\`.\n- The D-1 runner's V2 colliders (\`spec/v2_pi1_runner.js\`). The record-length boot is the D-1F1 geometry; the articulation is not used.\n\n**Profile:** SHA-256 \`${profSha}\` (compact JSON). It is embedded in the simulation data file \`sandbox/visual/pt_charcollide.js\` on \`prototype/slide-contact-v1.3-charcollide\`.\n\n| quantity | old (legacy ptRxBody) | new (CHARCOLLIDE-1) | source |\n|---|---|---|---|\n${rows.map(r => "| " + r.join(" | ") + " |").join("\n")}\n\n## Boot sections and inscription (TRACKB_PREREG §2.3 + amendment A1)\n\n| capsule end | section plane (foot frame z) | section width × height | design radius (§2.3) | A1 inscribed sphere |\n|---|---|---|---|---|\n| heel end | ${f(-heelBack + S.design.rh)} | ${f(S.sections.heel.w)} × ${f(S.sections.heel.h)} | ${f(S.design.rh)} | ${ins(S.ends.heel, S.bandScale.foot)} |\n| MTP end | ${f(mtpLocal[2])} | ${f(S.sections.mtp.w)} × ${f(S.sections.mtp.h)} | ${f(S.design.rm)} | ${ins(S.ends.mtp, S.bandScale.foot)} |\n| toe tip end | ${f(mtpLocal[2] + tipToe[2] - S.design.rt)} | ${f(S.sections.tip.w)} × ${f(S.sections.tip.h)} | ${f(S.design.rt)} | ${ins(S.ends.tip, S.bandScale.toe)} |\n\nLeft and right are identical. All capsules lie on the foot's centre line (x = 0 in the foot frame). The final capsules pass the 2,000-sample check: foot ${S.check2000.foot}, toe ${S.check2000.toe}.\n\n## Known residual, recorded and not adjusted\n\nThe thigh and shank capsules use the V2 radii on the joint axes (hip → knee, knee → ankle), as frozen. The V2 colliders sit off those axes: the thigh has a lateral axis offset of ${f(Math.abs(th0.pos[0]))}, the shank a posterior calf offset of ${f(Math.abs(sk0.pos[2]))}. The gameplay limb capsules are therefore not strictly inscribed in the physical ones, by up to about that offset.\n\nThis also stands: the F0 promoted body's anatomical boot is shorter than this record-length foot / toe geometry. The consequences are gated by CG-1 / CG-4 / CG-5 and PCG-F0 P-9 (TRACKB_PREREG §1).\n`;
fs.writeFileSync(path.join(outDir, "CHARCOLLIDE_PROFILE.md"), md);
console.log(JSON.stringify({ profSha, rigSha: profile.rigSha256, radii: { thigh, shin, foot: [S.foot.ra, S.foot.rb], toe: S.toe.r }, design: S.design, ends: { heel: [S.ends.heel.c, S.ends.heel.r], mtp: [S.ends.mtp.c, S.ends.mtp.r], tip: [S.ends.tip.c, S.ends.tip.r] }, bandScale: S.bandScale, check2000: S.check2000, sections: S.sections }));

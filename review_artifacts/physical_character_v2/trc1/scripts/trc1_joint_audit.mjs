// TRC-1 joint audit (read-only): rendered skeleton vs the physical V2 skeleton, BEFORE (MC-1) and AFTER (MC-1P) for the tackler, MC-1 for the runner
// (unchanged), at every recorded step of a trustworthy window. Per joint: positional error of the rendered bone origin vs the physical joint centre
// (child-body side; the parent-body side differs only by the joint's own anchor separation); per limb segment: the rendered bone TIP vs the next
// physical joint, and the angle between the rendered segment axis (origin → tip) and the physical segment (joint → next joint); per foot: angle between
// the rendered and physical foot orientation (identical by construction in both rules). Informational: bridge bones (neck, clavicles — MC-1P re-aims and
// stretches them every frame; stretch factor and re-aim angle vs the parent's bind direction), and the toe-bone tip's overhang beyond the front of the V2
// foot colliders along the rendered toe direction. Median and maximum over the window.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node trc1_joint_audit.mjs --run <rec.json.gz> --label <id> --window <n> --out <out.json>
import fs from "fs"; import zlib from "zlib";
const T = await import(new URL("./trc1_retarget.mjs", import.meta.url).href), { PL, MC, V, Q } = T, GM = await import(new URL("../../cxa1/scripts/cxa1_geom.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), label = arg("label"), win = +arg("window", "60");
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT), nR = sR.bodies.length, { LOCO } = PL.records();
const SKR = T.rig("vinicius"), SKT = T.rig("gabriel"), RT = T.buildPhys(SKT, sT), RR = T.buildPhys(SKR, sR), qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
const JOINTS = { hip_L: "thigh_L", knee_L: "shin_L", ankle_L: "foot_L", hip_R: "thigh_R", knee_R: "shin_R", ankle_R: "foot_R", shoulder_L: "upperArm_L", elbow_L: "foreArm_L", shoulder_R: "upperArm_R", elbow_R: "foreArm_R" };
const SEGS = { thigh_L: ["hip_L", "knee_L"], shank_L: ["knee_L", "ankle_L"], thigh_R: ["hip_R", "knee_R"], shank_R: ["knee_R", "ankle_R"], upperArm_L: ["shoulder_L", "elbow_L"], upperArm_R: ["shoulder_R", "elbow_R"], forearm_L: ["elbow_L", "wrist_L"], forearm_R: ["elbow_R", "wrist_R"] };
const BONE_OF_SEG = { thigh_L: "thigh_L", shank_L: "shin_L", thigh_R: "thigh_R", shank_R: "shin_R", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", forearm_L: "foreArm_L", forearm_R: "foreArm_R" };
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(V.norm(a), V.norm(b))))) * 180 / Math.PI;
function measure(SK, spec, R, P, S) { const out = { pos: {}, tip: {}, axisDeg: {}, footDeg: {}, bridgeStretch: {}, bridgeAimDeg: {}, toeOverhangMm: {} }, phys = {};
  for (const j of Object.keys(JOINTS)) phys[j] = T.physJoint(spec, S, j); for (const sd of ["L", "R"]) phys["wrist_" + sd] = T.physWrist(R, S, sd);
  for (const [j, b] of Object.entries(JOINTS)) out.pos[j] = V.dist(P.p[SK.byName[b].idx], phys[j]) * 1000;
  for (const sd of ["L", "R"]) out.pos["wrist_" + sd] = V.dist(P.p[SK.byName["hand_" + sd].idx], phys["wrist_" + sd]) * 1000;
  for (const [sg, [a, b]] of Object.entries(SEGS)) { const i = SK.byName[BONE_OF_SEG[sg]].idx, child = SK.bones.find(c => c.parent && c.parent.idx === i && (Object.values(JOINTS).includes(c.name) || /^hand_/.test(c.name))), pc = P.p[child.idx];
    out.tip[sg] = V.dist(pc, phys[b]) * 1000; out.axisDeg[sg] = ang(V.sub(pc, P.p[i]), V.sub(phys[b], phys[a])); }
  for (const sd of ["L", "R"]) { const fb = spec.bodies.findIndex(b => b.name === "foot_" + sd), rB = Q.norm(Q.mul(S[fb].rot, Q.conj(MC.model(spec).Z0[fb].rot))); out.footDeg["foot_" + sd] = ang(Q.rot(P.q[SK.byName["foot_" + sd].idx], [0, 0, 1]), Q.rot(rB, [0, 0, 1])); }
  for (const [bn, cn] of [["neck", "head"], ["clavicle_L", "upperArm_L"], ["clavicle_R", "upperArm_R"]]) { const b = SK.byName[bn], c = SK.byName[cn], v = V.sub(P.p[c.idx], P.p[b.idx]);
    out.bridgeStretch[bn] = V.len(v) / V.len(c.off); out.bridgeAimDeg[bn] = ang(Q.rot(P.q[b.parent.idx], c.off), v); }
  const WS = GM.worldShapes(spec, S); for (const sd of ["L", "R"]) { const t = SK.byName["toe_" + sd].idx, f = V.norm(V.sub(P.tip[t], P.p[t])), front = Math.max(...WS.filter(w => w.name === "foot_" + sd).map(w => V.dot(T.toW(w.sup(f)), f)));
    out.toeOverhangMm["toe_" + sd] = (V.dot(P.tip[t], f) - front) * 1000; }
  return out; }
const series = { tackler_MC1: [], tackler_MC1P: [], runner_MC1: [] };
for (let n = 1; n <= Math.min(win, run.recs.length); n++) { const S = run.recs[n - 1].S, SR = S.slice(0, nR), ST = S.slice(nR);
  series.tackler_MC1.push(measure(SKT, sT, RT, T.poseMC1(SKT, mdT, ST, null), ST)); series.tackler_MC1P.push(measure(SKT, sT, RT, T.posePhys(RT, ST), ST)); series.runner_MC1.push(measure(SKR, sR, RR, T.poseMC1(SKR, mdR, SR, qRef), SR)); }
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; }, r2 = (x) => +x.toFixed(2);
const summ = (rows) => { const o = {}; for (const kind of Object.keys(rows[0])) { o[kind] = {}; for (const key of Object.keys(rows[0][kind])) { const v = rows.map(r => r[kind][key]); o[kind][key] = { median: r2(med(v)), min: r2(Math.min(...v)), max: r2(Math.max(...v)) }; } } return o; };
const out = { tool: "trc1_joint_audit.mjs", label, run: arg("run"), window: win, finalHash: run.finalHash, units: { pos: "mm", tip: "mm", axisDeg: "deg", footDeg: "deg", bridgeStretch: "ratio", bridgeAimDeg: "deg", toeOverhangMm: "mm (+ = rendered toe tip ahead of the foot colliders)" },
  scope: "position error of the rendered joint (bone origin) vs the V2 joint centre evaluated on the child body; values < 0.005 mm print as 0 (float precision)",
  corrections: Object.fromEntries(Object.entries(RT.bone).filter(([, e]) => e.kind !== "fk").map(([k, e]) => [k, { kind: e.kind, scale: e.scale ? r2(e.scale * 1000) / 1000 : null, swingDeg: e.swingDeg != null ? r2(e.swingDeg) : null }])),
  tackler: { before_MC1: summ(series.tackler_MC1), after_MC1P: summ(series.tackler_MC1P) }, runner_MC1_unchanged: summ(series.runner_MC1) };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
const line = (o, kind) => Object.entries(o[kind]).map(([k, v]) => `${k} ${v.median}/${v.max}`).join(" · ");
console.log(`${label} (steps 1–${win}) tackler joint position mm (median/max) BEFORE: ${line(out.tackler.before_MC1, "pos")}\n   AFTER: ${line(out.tackler.after_MC1P, "pos")}\n   AFTER segment axis deg: ${line(out.tackler.after_MC1P, "axisDeg")} | tip mm: ${line(out.tackler.after_MC1P, "tip")} | foot deg: ${line(out.tackler.after_MC1P, "footDeg")}\n   BEFORE axis deg: ${line(out.tackler.before_MC1, "axisDeg")}\n   runner (MC-1, unchanged) pos: ${line(out.runner_MC1_unchanged, "pos")}\n   bridges AFTER stretch: ${line(out.tackler.after_MC1P, "bridgeStretch")} | aim deg: ${line(out.tackler.after_MC1P, "bridgeAimDeg")}\n   toe overhang mm BEFORE: ${line(out.tackler.before_MC1, "toeOverhangMm")} | AFTER: ${line(out.tackler.after_MC1P, "toeOverhangMm")} | runner: ${line(out.runner_MC1_unchanged, "toeOverhangMm")}`);

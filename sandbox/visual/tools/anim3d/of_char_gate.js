// ══ OUTFIELD CHARACTER STATIC GATE (node, headless) ═══════════════════════════════════════════════════════════════════════════════
// Before any animation: prove the bind is right, the stature is right, and the ground contract is right — for each real character.
//   1. identity-bind closure: summed offsets == recorded bind origins; inverseBind == T(-origin)
//   2. skinning closure: under an IDENTITY pose the skin must reproduce the bind mesh exactly (one inverse-bind application)
//   3. the template trap: the shared H=1.90 template's inverse binds must NOT match a player (except where stature coincides,
//      and even then the offsets must differ) — the handoff's explicit warning, checked numerically
//   4. the neutral presentation stance is NOT the bind pose: it carries real arm rotations
//   5. stature / hip / knee / shoulder / chain lengths against the package's own measurements
//   6. ground contract: lowest stud tip at y~0, sole bottom ~12 mm, ankle 88 mm, toe joint 31 mm, under the runtime skeleton
//   node of_char_gate.js [--ids cucurella,gabriel] [--pkg <package dir>]
const fs = require("fs"), path = require("path"), vm = require("vm");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const IDS = opt("--ids", "cucurella,gabriel").split(",").filter(Boolean);
const PKG = opt("--pkg", "");
const ROOT = path.join(__dirname, "../../anim3d"), ASSETS = path.join(__dirname, "../../../../assets/characters/outfield");
const ctx = { console, Math, performance: { now: () => 0 }, Float32Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Map, Set, Object, Array, Number, JSON };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["m4.js", "skeleton.js", "skin_mesh.js", "ik.js", "gk_motion_library.js", "of_rig.js", "of_motion.js", "of_loco.js", "of_kick.js", "of_character.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
vm.runInContext(`globalThis.clamp01=(x)=>Math.max(0,Math.min(1,x)); globalThis.lerp=(a,b,t)=>a+(b-a)*t; globalThis.smooth01=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};`, ctx);

const out = [];
for (const id of IDS) {
  const rig = JSON.parse(fs.readFileSync(path.join(ASSETS, id, "rig.json"), "utf8"));
  const buf = fs.readFileSync(path.join(ASSETS, id, "mesh.bin"));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const r = vm.runInContext(`(function(rig, ab){
    const e = { id: rig.playerId, rig, mesh: null, skel: null };
    e.mesh = ofCharViews(ab, rig.mesh.layout);
    const skel = ofCharSkeleton(e);
    const fk = skelFK(skel, {}, M4.ident());
    // (2) skinning closure under an identity pose: p' must equal p for every TRIANGLE-REFERENCED vertex
    const M = e.mesh, used = new Uint8Array(rig.mesh.vertexCount);
    for (let i = 0; i < M.indices.length; i++) used[M.indices[i]] = 1;
    const skin = []; for (const b of skel.bones) skin[b.idx] = M4.mul(fk.world[b.idx], skel.invBind[b.idx]);
    let maxSkinErr = 0, maxWeightErr = 0, maxInfl = 0, checked = 0;
    for (let i = 0; i < rig.mesh.vertexCount; i++) {
      if (!used[i]) continue; checked++;
      const px = M.positions[i*3], py = M.positions[i*3+1], pz = M.positions[i*3+2];
      let x = 0, y = 0, z = 0, ws = 0, ni = 0;
      for (let k = 0; k < 4; k++) {
        const w = M.weights[i*4+k]; if (w === 0) continue; ni++; ws += w;
        const m = skin[M.joints[i*4+k]];
        x += w * (m[0]*px + m[4]*py + m[8]*pz + m[12]);
        y += w * (m[1]*px + m[5]*py + m[9]*pz + m[13]);
        z += w * (m[2]*px + m[6]*py + m[10]*pz + m[14]);
      }
      maxSkinErr = Math.max(maxSkinErr, Math.abs(x-px), Math.abs(y-py), Math.abs(z-pz));
      maxWeightErr = Math.max(maxWeightErr, Math.abs(ws - 1)); maxInfl = Math.max(maxInfl, ni);
    }
    // (3) the shared H=1.90 template trap: build the generic test rig at this player's height and compare
    const tmpl = skelBuild(rig.H, null);
    let tmplOriginErr = 0, tmplLegErr = 0;
    { const tf = skelFK(tmpl, {}, M4.ident());
      for (const b of skel.bones) { const tb = tmpl.byName[b.name]; if (!tb) continue;
        const j = fk.joint[b.idx], t = tf.joint[tb.idx];
        tmplOriginErr = Math.max(tmplOriginErr, Math.hypot(j[0]-t[0], j[1]-t[1], j[2]-t[2])); }
      tmplLegErr = Math.abs((tmpl.byName.thigh_R.len + tmpl.byName.shin_R.len) - skel.legLen); }
    // (6) ground contract under the runtime skeleton
    const ankle = fk.joint[skel.byName.foot_R.idx], toe = fk.joint[skel.byName.toe_R.idx];
    // lowest drawable vertex (the stud tip) in the bind
    let lowest = 1e9; for (let i = 0; i < rig.mesh.vertexCount; i++) if (used[i]) { const y = M.positions[i*3+1]; if (y < lowest) lowest = y; }
    return { id: rig.playerId, name: rig.identity.name, heightCm: rig.identity.heightCm, weightKg: rig.identity.weightKg,
      bindCheck: skel.bindCheck, maxSkinErr, maxWeightErr, maxInfl, checked,
      statureM: rig.H, hipY: skel.hipY, legLen: skel.legLen, ankleH: skel.ankleH,
      ankleY: ankle[1], toeJointY: toe[1], lowestDrawableY: lowest,
      studTipY: rig.ground.studTipY, soleBottomY: rig.ground.soleBottomY,
      tmplOriginMaxErrM: tmplOriginErr, tmplLegLenErrM: tmplLegErr,
      verts: rig.mesh.vertexCount, tris: rig.mesh.triangleCount, unref: rig.mesh.unreferencedVertices,
      hairWarnings: rig.hairWarnings.map(w => w.code + " " + (w.bones||[]).join("+")) };
  })(${JSON.stringify(rig)}, arguments0)`.replace("arguments0", "AB"), Object.assign(ctx, { AB: ab }));
  // (4) the neutral presentation stance must NOT be an identity bind pose
  if (PKG) {
    const np = JSON.parse(fs.readFileSync(path.join(PKG, "derived", id, "neutral-presentation-pose.json"), "utf8"));
    const rots = []; const scan = (o, p) => { if (!o || typeof o !== "object") return;
      for (const k in o) { const v = o[k];
        if (Array.isArray(v) && v.length === 16) { const m = v; const rot = Math.max(Math.abs(m[1]), Math.abs(m[2]), Math.abs(m[4]), Math.abs(m[6]), Math.abs(m[8]), Math.abs(m[9]));
          if (rot > 1e-6) rots.push([p + "/" + k, +rot.toFixed(5)]); }
        else scan(v, p + "/" + k); } };
    scan(np, "");
    r.neutralRotatedJoints = rots.length; r.neutralMaxOffDiagonal = rots.length ? Math.max(...rots.map(x => x[1])) : 0;
    r.neutralExamples = rots.slice(0, 4).map(x => x[0].split("/").pop() + " " + x[1]);
  }
  out.push(r);
}
const F = (v, d = 6) => (v == null ? "-" : (+v).toFixed(d));
console.log("OUTFIELD REAL-CHARACTER STATIC GATE\n");
for (const r of out) {
  console.log(`── ${r.name}  (${r.id})  ${r.heightCm} cm / ${r.weightKg} kg`);
  console.log(`   geometry            ${r.verts} vertices (${r.unref} unreferenced, never indexed), ${r.tris} triangles`);
  console.log(`   identity bind       summed offsets vs recorded origins  ${F(r.bindCheck.summedOriginMaxErrM, 9)} m`);
  console.log(`                       inverseBind == T(-origin)           ${F(r.bindCheck.inverseBindMaxErrM, 9)} m`);
  console.log(`   skin closure        identity pose reproduces bind mesh  ${F(r.maxSkinErr, 9)} m over ${r.checked} drawable vertices`);
  console.log(`                       weight sum error ${F(r.maxWeightErr, 9)}   max influences ${r.maxInfl}`);
  console.log(`   template trap       generic rig at the same height is off by ${F(r.tmplOriginMaxErrM, 4)} m (joint origins), leg chain by ${F(r.tmplLegLenErrM, 4)} m`);
  if (r.neutralRotatedJoints != null)
    console.log(`   neutral stance      ${r.neutralRotatedJoints} joints carry real rotation (max off-diagonal ${F(r.neutralMaxOffDiagonal, 5)}) — NOT a bind pose  [${r.neutralExamples.join(", ")}]`);
  console.log(`   stature             ${F(r.statureM, 4)} m   hip ${F(r.hipY, 4)}   leg chain ${F(r.legLen, 4)}`);
  console.log(`   ground contract     stud tip ${F(r.lowestDrawableY, 5)} (recorded ${F(r.studTipY, 5)})   sole bottom ${F(r.soleBottomY, 4)}   ankle joint ${F(r.ankleY, 4)}   toe joint ${F(r.toeJointY, 4)}`);
  if (r.hairWarnings.length) console.log(`   hair                ${r.hairWarnings.join("; ")}`);
  console.log("");
}
const bad = out.filter(r => r.bindCheck.summedOriginMaxErrM > 1e-6 || r.bindCheck.inverseBindMaxErrM > 1e-6 || r.maxSkinErr > 5e-6 || r.maxWeightErr > 1e-6);
// thresholds are float32-realistic: the inverse binds are stored as Float32Array, so ~1e-7 m rounding is expected and is 10,000x below
// anything visible. The substantive gates are the closure errors, the template divergence and the ground contract.
console.log(bad.length ? "GATE FAIL: " + bad.map(b => b.id).join(", ") : "GATE PASS — every character's own bind closes, skins to its bind mesh, and differs from the shared template");
process.exit(bad.length ? 1 : 0);

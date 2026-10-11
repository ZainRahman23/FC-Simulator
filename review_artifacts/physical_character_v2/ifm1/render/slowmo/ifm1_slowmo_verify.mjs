// IFM-1 SLOW-MOTION REVIEW — VERIFICATION that the rendered character states correspond exactly to the committed IFM-1 records (visualisation only).
//  V1  the committed rendered-pose clip data are reproduced byte for byte by the committed ifm1_clip_prep.mjs from the committed records
//  V2  every rendered frame's mapped rig bones carry exactly the recorded V2 body rotations (q_bone · Z0 = q_body), the pelvis joint sits at the
//      recorded pelvis origin, the impactor at its recorded position; n = 0 against the fixture's entry write
//  V3  the skin matrices actually uploaded by the capture page (FNV-1a per panel per frame) equal the committed clip data (left = C0, right = N;
//      lead-in = the committed RUN-1 lead-in on both sides)
//  V4  lead-in and entry: left / right character pixels identical; one camera for both panels on every frame
//  V5  every MP4 holds exactly one sample per prepared frame at the stated rate (0.25× = 60 fps, 0.1× = 24 fps of 240 Hz record steps)
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node ifm1_slowmo_verify.mjs <prep dir> <capture dir> <scratch dir> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const L = await import(new URL("../../scripts/ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, RA, MC } = L;
const [PREP, CAP, SCR, OUT] = process.argv.slice(2), E3 = path.join(RA, "ifm1/evidence/run3"), gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const FIX = JSON.parse(fs.readFileSync(path.join(RA, "ifm1/fixture/IFM1_FIXTURE.json"))), SUB = FIX.worldToLocal.subtract;
const res = { tool: "ifm1_slowmo_verify.mjs", head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: RA }).toString().trim() };
// ── V1 ──
{ const runs = path.join(SCR, "v1_runs"), out = path.join(SCR, "v1_prep"); fs.rmSync(runs, { recursive: true, force: true }); fs.mkdirSync(runs, { recursive: true });
  for (const f of fs.readdirSync(path.join(E3, "records"))) fs.symlinkSync(path.join(E3, "records", f), path.join(runs, f));
  fs.symlinkSync(path.join(E3, "IFM1_EVAL.json"), path.join(runs, "IFM1_EVAL.json"));
  execFileSync("node", [path.join(RA, "ifm1/render/ifm1_clip_prep.mjs"), runs, out], { stdio: "ignore", env: process.env });
  const cmp = fs.readdirSync(path.join(E3, "render/clipdata")).map(f => { const a = zlib.gunzipSync(fs.readFileSync(path.join(E3, "render/clipdata", f))), b = fs.readFileSync(path.join(out, "clipdata", f.replace(/\.gz$/, "")));
    return { file: f, identical: Buffer.compare(a, b) === 0 }; });
  res.V1 = { files: cmp.length, allIdentical: cmp.every(x => x.identical), differing: cmp.filter(x => !x.identical).map(x => x.file) }; }
// ── V2 ──
const LV = L.loadLV2(), SK = L.rigOf(LV).SK, INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([b, bone]) => [bone, b]));
const prepFiles = fs.readdirSync(PREP).filter(f => /^slowmo_(SH|PL|TP|SW)_/.test(f)).sort();
res.V2 = { cases: {} };
const fnv = (arr) => { let h = 2166136261; const u = new Uint32Array(Float32Array.from(arr).buffer); for (let i = 0; i < u.length; i++) for (let b = 0; b < 4; b++) { h ^= (u[i] >>> (b * 8)) & 255; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
const CAPJ = JSON.parse(fs.readFileSync(path.join(CAP, "slowmo_capture.json"))); res.V3 = { cases: {} }; res.V4 = { cases: {} };
for (const f of prepFiles) { const D = JSON.parse(fs.readFileSync(path.join(PREP, f))), key = `${D.case}_${D.body}`, spec = L.SPECS[D.body](), md = MC.model(spec);
  const recC = gz(path.join(E3, D.sources.recordsC0)), recN = gz(path.join(E3, D.sources.recordsN)), cdC = gz(path.join(E3, D.sources.clipdataC0)), cdN = gz(path.join(E3, D.sources.clipdataN)), lead = gz(path.join(E3, D.sources.lead));
  const entry = FIX.entries[`${D.body}/${D.state}`].write.poses; let rotMax = 0, pelMax = 0, impMax = 0, prepVsClip = true, nFrames = 0;
  for (const F of D.frames.filter(x => x.phase === "phys")) { const n = F.n;
    for (const [side, P, rec, cd] of [["C0", F.C0, recC, cdC], ["N", F.N, recN, cdN]]) {
      const S = n === 0 ? entry : rec.recs[n - 1].S; if (n > 0 && rec.recs[n - 1].n !== n) throw new Error("record step mismatch");
      if (JSON.stringify(P.skin) !== JSON.stringify(cd.frames[n].skin) || JSON.stringify(P.joint) !== JSON.stringify(cd.frames[n].joint)) prepVsClip = false;
      for (const b of SK.bones) { const vb = INV[b.name]; if (!vb) continue; const i = md.bi(vb), W = cd.frames[n].world[b.idx], qb = MC.m2q(W), qBody = Q.norm(Q.mul(qb, md.Z0[i].rot));
        rotMax = Math.max(rotMax, L.qangRad(qBody, S[i].rot)); }
      pelMax = Math.max(pelMax, V.dist(cd.frames[n].joint[1], V.add(S[0].pos, SUB)));
      if (side === "N" && n > 0) impMax = Math.max(impMax, V.dist(P.imp, V.add(rec.recs[n - 1].imp.pos, SUB))); nFrames++; } }
  for (const F of D.frames.filter(x => x.phase === "lead")) { const j = lead.f240.findIndex(g => g.tauMs === F.tauMs); if (j < 0 || JSON.stringify(lead.f240[j].skin) !== JSON.stringify(F.both.skin)) prepVsClip = false; }
  res.V2.cases[key] = { physFramesChecked: nFrames, maxMappedBoneRotationErrRad: rotMax, maxPelvisJointErrM: pelMax, maxImpactorErrM: impMax, prepFramesEqualCommittedClipdata: prepVsClip };
  // V3 / V4
  const cap = CAPJ.cases[key]; let hashOk = true, leadSame = true, entrySame = true, cam = true;
  D.frames.forEach((F, k) => { const c = cap.frames[k]; const L0 = F.phase === "lead" ? F.both.skin : F.C0.skin, R0 = F.phase === "lead" ? F.both.skin : F.N.skin;
    if (c.skinHashL !== fnv(L0) || c.skinHashR !== fnv(R0)) hashOk = false; if (!c.sameCamera) cam = false;
    if (F.phase === "lead" && c.panelDiffPx !== 0) leadSame = false; if (F.phase === "phys" && F.n === 0 && c.panelDiffPx !== 0) entrySame = false; });
  res.V3.cases[key] = { frames: D.frames.length, uploadedSkinEqualsCommitted: hashOk };
  res.V4.cases[key] = { leadInPanelsPixelIdentical: leadSame, entryPanelsPixelIdentical: entrySame, firstDivergentFrame: (() => { const k = cap.frames.findIndex(c => c.panelDiffPx > 0); return k < 0 ? null : { k, n: cap.frames[k].n, tauMs: cap.frames[k].tauMs, pixels: cap.frames[k].panelDiffPx }; })(), sameCameraEveryFrame: cam }; }
// ── V5: MP4 sample tables ──
function mp4Info(buf) { const out = {}; const walk = (s, e) => { let p = s; while (p + 8 <= e) { let size = buf.readUInt32BE(p); const type = buf.toString("latin1", p + 4, p + 8); let hdr = 8; if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } if (size < 8) break;
      if (["moov", "trak", "mdia", "minf", "stbl"].includes(type)) walk(p + hdr, p + size);
      else if (type === "mdhd") { const v = buf[p + hdr]; out.timescale = v === 1 ? buf.readUInt32BE(p + hdr + 20) : buf.readUInt32BE(p + hdr + 12); out.duration = v === 1 ? Number(buf.readBigUInt64BE(p + hdr + 24)) : buf.readUInt32BE(p + hdr + 16); }
      else if (type === "stsz") out.samples = buf.readUInt32BE(p + hdr + 8);
      else if (type === "stts") { const n = buf.readUInt32BE(p + hdr + 4), ent = []; for (let i = 0; i < n; i++) ent.push([buf.readUInt32BE(p + hdr + 8 + i * 8), buf.readUInt32BE(p + hdr + 12 + i * 8)]); out.stts = ent; }
      else if (type === "avcC") out.avcProfile = buf[p + hdr + 1];
      p += size; } }; walk(0, buf.length); return out; }
res.V5 = { videos: {} };
for (const v of fs.readdirSync(path.join(CAP, "video")).sort()) { const I = mp4Info(fs.readFileSync(path.join(CAP, "video", v))), fps = /0\.25x/.test(v) ? 60 : 24, key = v.split("_").slice(0, 2).join("_"), nPrep = JSON.parse(fs.readFileSync(path.join(PREP, `slowmo_${key}.json`))).frames.length;
  const durs = (I.stts || []).flatMap(([c, d]) => Array(c).fill(d / I.timescale)); res.V5.videos[v] = { samples: I.samples, expected: nPrep, fps, frameDurationS: [Math.min(...durs), Math.max(...durs)], ok: I.samples === nPrep && durs.every(d => Math.abs(d - 1 / fps) < 1e-3), profile: I.avcProfile }; }
res.allPass = res.V1.allIdentical && Object.values(res.V2.cases).every(c => c.maxMappedBoneRotationErrRad < 1e-5 && c.maxPelvisJointErrM < 2e-6 && c.maxImpactorErrM < 2e-6 && c.prepFramesEqualCommittedClipdata)
  && Object.values(res.V3.cases).every(c => c.uploadedSkinEqualsCommitted) && Object.values(res.V4.cases).every(c => c.leadInPanelsPixelIdentical && c.entryPanelsPixelIdentical && c.sameCameraEveryFrame) && Object.values(res.V5.videos).every(v => v.ok);
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log("V1 clip data reproduced from committed records:", res.V1.allIdentical, `(${res.V1.files} files)`);
for (const k of Object.keys(res.V2.cases)) { const a = res.V2.cases[k], b = res.V3.cases[k], c = res.V4.cases[k];
  console.log(`${k}: V2 rot ${a.maxMappedBoneRotationErrRad.toExponential(1)} rad · pelvis ${(a.maxPelvisJointErrM * 1e6).toFixed(2)} µm · impactor ${(a.maxImpactorErrM * 1e6).toFixed(2)} µm · prep=clipdata ${a.prepFramesEqualCommittedClipdata} | V3 skin ${b.uploadedSkinEqualsCommitted} | V4 lead ${c.leadInPanelsPixelIdentical} entry ${c.entryPanelsPixelIdentical} cam ${c.sameCameraEveryFrame} · first divergent frame ${c.firstDivergentFrame ? `n ${c.firstDivergentFrame.n} (${c.firstDivergentFrame.pixels} px)` : "none"}`); }
console.log("V5 videos ok:", Object.values(res.V5.videos).every(v => v.ok), `(${Object.keys(res.V5.videos).length})`); console.log("ALL PASS:", res.allPass);

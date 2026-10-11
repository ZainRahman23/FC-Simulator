// IFM-1 RENDER MANIFEST (prereg §11 "record all hashes / settings"): the post-freeze presentation tooling (ifm1/render/*), the frozen RUN-1 viewer /
// character files it drives (each archive file's git blob compared with the tag's tree), the browser and the capture settings.
// usage: node ifm1_render_manifest.mjs <tag archive> <capture.json> <out.json>
import fs from "fs"; import path from "path"; import crypto from "crypto"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), [ARCH, CAPJ, OUT] = process.argv.slice(2), TAG = "locomotion-v2-straight-baseline-1";
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"), git = (...a) => execFileSync("git", a, { cwd: HERE }).toString().trim();
const blob = (f) => { const b = fs.readFileSync(f); return crypto.createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex"); };
const FROZEN = ["sandbox/visual/run1.html", "sandbox/visual/run1/run1_viewer.js", "sandbox/visual/run1/run1_gait.js", "sandbox/visual/run1/run1_gait_orig.js", "sandbox/visual/run1/run1_gait_v11.js", "sandbox/visual/run1/run1_gait_v12.js",
  "sandbox/visual/run1/run1_gait_v13.js", "sandbox/visual/run1/lv2_state.js", "sandbox/visual/run1/tools/run1_load.cjs", "sandbox/visual/anim3d/m4.js", "sandbox/visual/anim3d/skeleton.js", "sandbox/visual/anim3d/ik.js", "sandbox/visual/anim3d/of_rig.js",
  "sandbox/visual/anim3d/of_motion.js", "sandbox/visual/anim3d/of_loco.js", "sandbox/visual/anim3d/of_loco_cont.js", "sandbox/visual/anim3d/of_character.js", "sandbox/visual/anim3d/of_char_gl.js",
  "assets/characters/outfield/vinicius/rig.json", "assets/characters/outfield/vinicius/mesh.bin", "assets/characters/outfield/vinicius/atlas.png"];
const cap = JSON.parse(fs.readFileSync(CAPJ));
const out = { manifest: "IFM1_RENDER_MANIFEST", note: "presentation tooling added AFTER run 3 (post-freeze, IFM1_FREEZE.json decision 'gameplay camera'); it reads run records and cannot affect any gate",
  head: git("rev-parse", "HEAD"), tag: { name: TAG, object: git("rev-parse", TAG), commit: git("rev-parse", TAG + "^{}") },
  tooling: Object.fromEntries(fs.readdirSync(HERE).filter(f => /\.(mjs|cjs|py|json)$/.test(f)).sort().map(f => [`ifm1/render/${f}`, sha(path.join(HERE, f))])),
  frozenFiles: Object.fromEntries(FROZEN.map(f => { const a = path.join(ARCH, f), want = git("rev-parse", `${TAG}:${f}`), have = blob(a); return [f, { sha256: sha(a), blob: have, tagBlob: want, identical: have === want }]; })),
  settings: { page: cap.page, viewportCss: [cap.W, cap.H], devicePixelRatio: cap.dpr, camera: "CAMERA_V1 rv1GameCam (height 30, dist 43, pitch 22°, FOV 28°, 720-px focal), rail x = authoritative mover x (identical in every mode), zoom 1 (primary) / 4 (diagnostic only)",
    renderRule: "MC-1 §2(4) (record_hinged/RH1_PREREG.md, 50eae23a): rotation retarget, unmapped bones hold τ0 local rotation, rig FK from the V2 hip midpoint", impactor: "sphere r 0.060 m, drawn by this tooling (Lambert, depth-tested), labelled 'diagnostic impactor (not a tackler)'",
    cadence: "primary 60 Hz (lead-in τ = −250 … −16.7 ms from RUN-1, physical n = 0, 4, …, 36); diagnostic 240 Hz shown at 60 fps = 0.25×", browser: cap.env, puppeteer: (() => { try { return JSON.parse(fs.readFileSync(path.join(process.env.PUPPETEER_NODE_MODULES || "", "puppeteer-core/package.json"))).version; } catch (_) { return null; } })() } };
out.allFrozenIdentical = Object.values(out.frozenFiles).every(x => x.identical);
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(Object.keys(out.tooling).length, "tooling files;", FROZEN.length, "frozen files, identical to the tag:", out.allFrozenIdentical);

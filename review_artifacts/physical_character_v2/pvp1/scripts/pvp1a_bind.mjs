// PVP-1A input manifest (prereg §13 step 2): hashes of every consumed record / asset / spec / bound implementation, the contact-configuration
// equality, ib_verify and the recomputed gameplay hash. No stepping.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node pvp1a_bind.mjs <out.json>
import fs from "fs"; import path from "path"; import crypto from "crypto"; import { execFileSync } from "child_process";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV, IL, RA, P2 } = PL;
const OUT = process.argv[2], sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"), git = (...a) => execFileSync("git", a, { cwd: RA }).toString().trim();
const files = ["interaction_benchmark/records/v13/rx_behind_standing_OFF.json.gz", "interaction_benchmark/records/v13/rx_behind_standing_LOCO.json.gz", "interaction_benchmark/scenarios/IB1-SR_rx_behind_standing.json",
  "interaction_benchmark/SHA256SUMS", "pvp1/PVP1A_PREREGISTRATION.md", "pvp1/evidence/PVP1_SURVEY.json"].map(f => [f, sha(path.join(RA, f))]);
const impl = ["core/v2_jolt.js", "sim/v2_passive.js", "sim/v2_actuation.js", "ctrl/v2_stand.js", "ctrl/v2_stance.js", "gates/v2_slp.js", "map/v2_lv2_map.js", "map/v2_render_map.js", "spec/v2_spec.js", "spec/v2_pi1_runner.js", "spec/v2_human.js", "tools/track_a_lib.mjs", "vendor/jolt-physics.wasm-compat.js"].map(f => [f, sha(path.join(P2, f))]);
const { OFF, LOCO } = PL.records(), sR = PL.SPEC_R(), sT = PL.SPEC_T();
let contactEqual = true; try { PL.combine(sR, sT); } catch (e) { contactEqual = String(e); }
const ib = (() => { try { return execFileSync("node", ["interaction_benchmark/scripts/ib_verify.mjs"], { cwd: RA }).toString().trim().split("\n").pop(); } catch (e) { return "ERROR " + e.message; } })();
const out = { manifest: "PVP1A_INPUTS", head: git("rev-parse", "HEAD"), prereg: PV.prereg, files: Object.fromEntries(files), implementation: Object.fromEntries(impl),
  specs: { R0: { hash: IL.specHash(sR), mass: sR.bodies.reduce((a, b) => a + b.mass, 0) }, V1matched: { hash: IL.specHash(sT), mass: sT.bodies.reduce((a, b) => a + b.mass, 0) } }, contactConfigurationsEqual: contactEqual,
  tag: { name: "locomotion-v2-straight-baseline-1", object: git("rev-parse", "locomotion-v2-straight-baseline-1"), commit: git("rev-parse", "locomotion-v2-straight-baseline-1^{}") },
  assets: Object.fromEntries(["vinicius", "gabriel"].flatMap(c => ["rig.json", "mesh.bin", "atlas.png"].map(f => [`${c}/${f}`, { tag: git("rev-parse", `locomotion-v2-straight-baseline-1:assets/characters/outfield/${c}/${f}`), sim5042230: git("rev-parse", `5042230:assets/characters/outfield/${c}/${f}`) }]))),
  gameplayHash: { expected: PV.auth.gameplayHash, recomputedOFF: PL.gameplayHashOf(OFF), recomputedLOCO: PL.gameplayHashOf(LOCO) }, ibVerify: ib };
out.status = contactEqual === true && /59 pass, 1 note, 0 fail/.test(ib) && out.gameplayHash.recomputedOFF === PV.auth.gameplayHash && Object.values(out.assets).every(a => a.tag === a.sim5042230) ? "BOUND" : "PROVENANCE_BLOCKED";
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(out.status, "· ib_verify", ib, "· gameplay hash", out.gameplayHash.recomputedOFF, "· specs", out.specs.R0.hash, out.specs.V1matched.hash);

// ═══ physchar2/tools/g0_run.js — V2-G0 runner (Node). usage: node tools/g0_run.js [--out <dir>] [--quiet]
// Builds V2-REF + the variation set, runs every G0 check, compares with the approved Python calculation, checks engine-hash repeatability,
// topology identity across bodies and the V1 freeze guard. Exit code 0 only if EVERY check passes.
import fs from "fs"; import path from "path"; import crypto from "crypto"; import { execSync } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { g0Body, specAgreement, TOL, VARIATION_SET, V2_REF } from "../gates/v2_g0.js";
import { BONES } from "../spec/v2_skeleton.js";

const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const OUT = path.resolve(arg("--out", path.join(ROOT, "review_artifacts/physical_character_v2/g0/json"))), quiet = !!arg("--quiet", false);
const t0 = Date.now(), log = (...a) => { if (!quiet) console.log(...a); };

// vendored engine must be byte-identical to V1's pinned build
const vend = path.join(here, "../vendor/jolt-physics.wasm-compat.js"), sha = crypto.createHash("sha256").update(fs.readFileSync(vend)).digest("hex");
const SHA_EXPECT = "011233a5fff762d6f0f5b50726b315246bf68cb182f0a10024559d04f4c257de";
const J = await loadJolt(vend);
const pySpec = JSON.parse(fs.readFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/PHYSICAL_CHARACTER_V2_SPEC.json"), "utf8"));

const runs = [], topo = [];
for (const h of VARIATION_SET) {
  const r = g0Body(J, h, {}); const ref = h.id === "V2-REF" ? pySpec.V2_REF : h.id === "V1-matched" ? pySpec.V1_matched : null;
  const ag = specAgreement(r.spec, ref);
  if (ag) r.checks.push({ id: "0.S", name: "agreement with the approved calculation (PHYSICAL_CHARACTER_V2_SPEC.json, rounded to 4–5 decimals)", pass: ag.pass,
    value: `mass ${ag.mass.toExponential(1)} kg · COM ${ag.com.toExponential(1)} m · inertia ${ag.inertia.toExponential(1)} · skeleton ${ag.skeleton.toExponential(1)} m · colliders ${ag.colliders.toExponential(1)} m`,
    limit: `≤ ${TOL.specMass} kg / ${TOL.specPos} m / ${TOL.specInertia} kg·m²` });
  runs.push(r); topo.push(JSON.stringify({ bodies: r.spec.bodies.map(b => [b.name, b.parent]), joints: r.spec.joints.map(j => [j.name, j.parent, j.child, j.locked, j.passiveOnly]), bones: BONES.map(b => [b.name, b.parent, b.cls, b.body]) }));
}
// determinism of the engine (V2-REF ×3, fresh worlds) and topology identity
const rep = [0, 1, 2].map(() => g0Body(J, V2_REF, {})), eh = rep.map(r => r.engine.stateHash + "/" + r.engine.readHash + "/" + r.specHash);
const global = [
  { id: "0.1b", name: "V2-REF ×3 fresh builds: identical spec hash, engine readback hash and post-step state hash", pass: eh.every(x => x === eh[0]), value: eh.join("  "), limit: "identical" },
  { id: "0.12", name: `topology identical across the ${VARIATION_SET.length}-body variation set (names, order, parents, joints, bones, classes)`, pass: topo.every(t => t === topo[0]), value: `${new Set(topo).size} distinct topology`, limit: "1" },
  { id: "0.E", name: "vendored Jolt build = V1's pinned build (sha256)", pass: sha === SHA_EXPECT, value: sha.slice(0, 16) + "…", limit: SHA_EXPECT.slice(0, 16) + "…" },
];
let guard = ""; try { guard = execSync(JSON.stringify(path.join(here, "guard_v1.sh")), { encoding: "utf8", cwd: here }).trim(); global.push({ id: "0.V1", name: "V1 frozen: runtime + evidence identical to the freeze tag", pass: true, value: guard, limit: "identical" }); }
catch (e) { global.push({ id: "0.V1", name: "V1 frozen: runtime + evidence identical to the freeze tag", pass: false, value: String(e.stdout || e.message).trim(), limit: "identical" }); }

// ── report ──
const allPass = runs.every(r => r.checks.every(c => c.pass)) && global.every(c => c.pass);
log(`\nV2-G0 — anatomy / static construction   (${((Date.now() - t0) / 1000).toFixed(1)} s, Node ${process.version}, Jolt sha ${sha.slice(0, 12)})`);
for (const r of runs) {
  const nP = r.checks.filter(c => c.pass).length; log(`\n■ ${r.human.id}  H ${r.human.H} m  M ${r.human.M} kg  spec ${r.specHash}  engine ${r.engine.stateHash}/${r.engine.readHash}   ${nP}/${r.checks.length} pass`);
  for (const c of r.checks) if (!c.pass || r.human.id === "V2-REF") log(`  ${c.pass ? "PASS" : "FAIL"} ${c.id.padEnd(6)} ${c.name}\n         ${c.value}   [${c.limit}]${c.detail ? "\n         " + c.detail : ""}`);
}
log("\n■ global"); for (const c of global) log(`  ${c.pass ? "PASS" : "FAIL"} ${c.id.padEnd(6)} ${c.name}\n         ${c.value}   [${c.limit}]`);
log(`\nG0 RESULT: ${allPass ? "PASS" : "FAIL"} — ${runs.reduce((s, r) => s + r.checks.filter(c => !c.pass).length, 0) + global.filter(c => !c.pass).length} failing check(s)`);

fs.mkdirSync(OUT, { recursive: true });
const slim = runs.map(r => ({ human: r.human, specHash: r.specHash, engine: { stateHash: r.engine.stateHash, readHash: r.engine.readHash, perPose: r.engine.perPose, groundContactBodies: r.engine.groundContactBodies },
  checks: r.checks, measures: r.measures, wholeBodyArmsDownNoEquip: { mass: r.wbDown.M, com: r.wbDown.com, I: r.wbDown.I }, canonicalCOM: r.wbCan.com, toe: r.toe, surfaces: r.surf, footDims: r.footDims }));
fs.writeFileSync(path.join(OUT, "g0_results.json"), JSON.stringify({ generated: "V2-G0 runner", node: process.version, joltSha256: sha, tolerances: TOL, allPass, global, runs: slim }, null, 1));
fs.writeFileSync(path.join(OUT, "v2_ref_spec.json"), JSON.stringify(runs.find(r => r.human.id === "V2-REF").spec, null, 1));
log(`wrote ${path.relative(ROOT, OUT)}/g0_results.json, v2_ref_spec.json`);
process.exit(allPass ? 0 : 1);

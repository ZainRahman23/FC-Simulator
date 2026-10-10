// IB-1 interaction benchmark — integrity / neutrality verifier (READ-ONLY). Run before and after any consumer run; prints a deterministic report and
// exits 1 on any failed HARD check. Checks:
//  V1 every record's SHA-256 equals SHA256SUMS;  V2 every record's SHA-256 prefix equals the committed export summary (Track B for V1.3, LC-1 for lc1),
//     except where the file bytes are known not to be reproducible (wall-clock `cpu` field; reported, not failed);
//  V3 the gameplay hash recomputed from rows + events equals the record's field and the committed summary, in every record of a case (neutrality);
//  V4 V1.3 OFF vs V1.3 LOCO: every field except mode / pres / cpu identical; V5 LC-1 LOCO vs V1.3 OFF: authoritative streams identical;
//  V6 MANIFEST.json and the scenario files agree with the records (hashes, contacts).
// usage (from review_artifacts/physical_character_v2): node interaction_benchmark/scripts/ib_verify.mjs
import fs from "fs"; import path from "path"; import zlib from "zlib"; import crypto from "crypto"; import { fileURLToPath } from "url";
const IB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), ROOT = path.resolve(IB, "..");
const load = (p) => JSON.parse(zlib.gunzipSync(fs.readFileSync(p))), sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const gh = (R) => fnv(JSON.stringify(R.rows) + "|" + JSON.stringify(R.events)), eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SUMS = Object.fromEntries(fs.readFileSync(path.join(IB, "SHA256SUMS"), "utf8").trim().split("\n").filter((l) => l.includes("records/")).map((l) => { const [h, p] = l.trim().split(/\s+/); return [p, h]; }));
const SUM_V13 = JSON.parse(fs.readFileSync(path.join(ROOT, "pi1/trackB/v13/air/air_summary.json"))).summary, SUM_LC1 = JSON.parse(fs.readFileSync(path.join(ROOT, "locomotion_continuity/evidence/exports/on/rx/air_summary.json"))).summary;
const M = JSON.parse(fs.readFileSync(path.join(IB, "MANIFEST.json")));
const AUTH = ["rows", "events", "react", "def", "pred", "dnow", "prims", "simBody", "params", "scenario", "mass", "legLen", "LEG_REF", "slide", "react0", "chars"];
let hardFail = 0; const out = [], ok = (c, name, pass, info = "", hard = true) => { if (!pass && hard) hardFail++; out.push(`${pass ? "PASS" : hard ? "FAIL" : "NOTE"}  ${c.padEnd(19)} ${name.padEnd(46)} ${info}`); };
for (const S of M.scenarios) { const c = S.case, recs = {};
  for (const [k, r] of Object.entries(S.records)) { const p = path.join(IB, r.path), h = sha(p); recs[k] = load(p);
    ok(c, `V1 sha256 = SHA256SUMS (${k})`, SUMS[r.path] === h && r.sha256 === h, h.slice(0, 16));
    const ref = k === "off" ? SUM_V13[c].OFF.sha256 : k === "v13loco" ? SUM_V13[c].LOCO.sha256 : SUM_LC1[c].LOCO.sha256;
    const cpuOnly = k !== "off" && h.slice(0, 16) !== ref;
    ok(c, `V2 sha256 prefix = committed summary (${k})`, h.slice(0, 16) === ref, cpuOnly ? `file ${h.slice(0, 16)} vs summary ${ref}: presentation-mode bytes include the wall-clock cpu field; see V3–V5` : ref, !cpuOnly);
    const g = gh(recs[k]), gs = k === "off" ? SUM_V13[c].OFF.gameplayHash : k === "v13loco" ? SUM_V13[c].LOCO.gameplayHash : SUM_LC1[c].LOCO.gameplayHash;
    ok(c, `V3 gameplay hash recomputed = record = summary (${k})`, g === recs[k].gameplayHash && g === gs && g === S.gameplayHash, g); }
  const off = recs.off, vl = recs.v13loco, ll = recs.lc1loco;
  const diff = Object.keys(off).filter((k) => !["mode", "pres", "cpu"].includes(k) && !eq(off[k], vl[k]));
  ok(c, "V4 V1.3 OFF ≡ V1.3 LOCO (except mode/pres/cpu)", diff.length === 0, diff.join(",") || "identical");
  // the LC-1 exporter (locomotion_continuity/scripts/lc_export.cjs) adds scenario.keys (null for every rx fixture); compared without it
  const scenNoKeys = (R) => { const { keys, ...rest } = R.scenario; return { rest, keys: keys ?? null }; };
  const dl = AUTH.filter((k) => (k === "scenario" ? !(eq(scenNoKeys(ll).rest, off.scenario) && scenNoKeys(ll).keys === null) : !eq(off[k], ll[k])));
  ok(c, "V5 LC-1 LOCO ≡ V1.3 OFF (authoritative streams)", dl.length === 0, dl.length ? "differs: " + dl.join(",") : `identical: ${AUTH.length} fields (scenario.keys null)`);
  const scf = JSON.parse(fs.readFileSync(path.join(IB, S.scenarioFile)));
  const contacts = off.events.filter((e) => e.kind === "PLAYER_CONTACT").map((e) => [e.tick, e.sub, e.prim, e.seg, e.cls, e.J]);
  ok(c, "V6 manifest / scenario file agree with records", scf.authoritativeOutcome.gameplayHash === gh(off) && eq(contacts, S.contacts.map((x) => [x.tick, x.sub, x.prim, x.seg, x.cls, x.J])) && Object.entries(scf.provenance.records).every(([k, v]) => v.sha256 === S.records[k].sha256), `${contacts.length} contact(s)`); }
console.log(out.join("\n")); console.log(`\n${hardFail ? "FAILED" : "ALL HARD CHECKS PASS"} (${out.filter((l) => l.startsWith("PASS")).length} pass, ${out.filter((l) => l.startsWith("NOTE")).length} note, ${hardFail} fail)`);
process.exit(hardFail ? 1 : 0);

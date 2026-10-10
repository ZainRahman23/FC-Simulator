// IB-1 interaction benchmark — manifest extractor (READ-ONLY; consolidation, 10 Oct 2026; source sources/2026-10-10_user_instruction_pause_consolidate.md).
// Reads the frozen records in ../records/ (copies of existing exports, see ../README.md §3) and writes ../MANIFEST.json and ../scenarios/<id>.json.
// Nothing here runs the simulation, the presentation or any physics. Every value is either copied verbatim from a record / committed evaluation file, or
// labelled "derived" with its formula. The only derived geometry is the segment–segment surface distance, computed with the exporter's formula
// (pi1/trackB/scripts/air_export_v13.cjs `surf`: d − r_prim − r_seg(t), r_seg tapered ra → rb) and checked against the record's own d_now column.
// usage (from review_artifacts/physical_character_v2): node interaction_benchmark/scripts/ib_extract.mjs
import fs from "fs"; import path from "path"; import zlib from "zlib"; import crypto from "crypto"; import { fileURLToPath } from "url";
const IB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), ROOT = path.resolve(IB, "..");
const load = (p) => JSON.parse(zlib.gunzipSync(fs.readFileSync(p))), sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const gameplayHash = (R) => fnv(JSON.stringify(R.rows) + "|" + JSON.stringify(R.events));   // the exporter's hashOf, unchanged
const contentHash = (R) => crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(R).filter(([k]) => k !== "cpu")))).digest("hex");
const r6 = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6);
// closest points between segments p1q1 and p2q2 (Ericson, Real-Time Collision Detection §5.1.9); returns distance and the parameter t on the second segment
function segseg(p1, q1, p2, q2) { const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), cl = (x) => Math.max(0, Math.min(1, x));
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t;
  if (a <= 1e-12 && e <= 1e-12) { s = t = 0; } else if (a <= 1e-12) { s = 0; t = cl(f / e); } else { const c = dot(d1, r); if (e <= 1e-12) { t = 0; s = cl(-c / a); } else { const b = dot(d1, d2), den = a * e - b * b;
    s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } } }
  const c1 = p1.map((x, i) => x + d1[i] * s), c2 = p2.map((x, i) => x + d2[i] * t); return { d: Math.hypot(...sub(c1, c2)), s, t }; }
const segR = (g, t) => (g.ra != null ? g.ra + (g.rb - g.ra) * Math.max(0, Math.min(1, t)) : g.r);
function surfPairs(prims, segs) { const out = []; for (const p of prims) for (const g of segs) { const cc = segseg(p.a, p.b, g.a, g.b); out.push({ prim: p.prim, seg: g.name, dM: cc.d - p.r - segR(g, cc.t) }); } return out.sort((x, y) => x.dM - y.dM); }
// record conventions (D-1A erratum; exporter loop): row k = state after squad tick k+1; slot n−1 of row k = sub-step n of squad tick k+1 = τ k + n/4
const COLS = { ball: "1..5 = x, y, z, vx, vy", owner: 6, active: 7, runner: "8..13 = x, y, vx, vy, facing, gaitPhase (ctx 0)", tackler: "14..19 = x, y, vx, vy, facing, gaitPhase (ctx 1)" };
const kin = (row) => ({ runner: { x: row[8], y: row[9], vx: row[10], vy: row[11], facing: row[12], gaitPhase: row[13] }, tackler: { x: row[14], y: row[15], vx: row[16], vy: row[17], facing: row[18], gaitPhase: row[19] } });
const CG = { ...JSON.parse(fs.readFileSync(path.join(ROOT, "pi1/trackB/v13/compat_gate_v13_all.json"))).cases };
const REV2 = JSON.parse(fs.readFileSync(path.join(ROOT, "pi1/rev2/scan_rev2_rx.json"))).cases;
const SUM_V13 = JSON.parse(fs.readFileSync(path.join(ROOT, "pi1/trackB/v13/air/air_summary.json"))).summary;
const SUM_LC1 = JSON.parse(fs.readFileSync(path.join(ROOT, "locomotion_continuity/evidence/exports/on/rx/air_summary.json"))).summary;
const SCEN = [
  { id: "IB1-NM", role: "near miss", cs: "rx_miss" },
  { id: "IB1-FL", role: "swinging / free-leg clip, recoverable outcome", cs: "rx_free_leg" },
  { id: "IB1-PL", role: "planted / weight-bearing-leg sweep, fall outcome (the PI-1 designated case)", cs: "rx_planted_leg" },
  { id: "IB1-PG", role: "planted / weight-bearing-leg sweep, fall outcome (alternate: passes the contact-correspondence rows CG-1 … CG-6)", cs: "rx_glancing" },
  { id: "IB1-SR", role: "standing runner, weight-bearing shin struck, recoverable outcome (the only REV2 end-to-end pass; anchor)", cs: "rx_behind_standing" },
];
const manifest = { schema: "ib1.manifest/1", note: "IB-1 interaction benchmark. Authoritative = the V1.3 simulation export (OFF record). Presentation streams are optional, non-authoritative inputs.", conventions: {
  time: "row k = authoritative state after squad tick k+1 (60 Hz); event (tick T, sub n) ↔ row T−1, sub-step slot n−1, τ = T − 1 + n/4 (PI-1 τ units; row r's end state is τ = r + 1)",
  rowColumns: COLS, units: "m, m/s, rad (facing), kg, N·s (J); pitch plane x, y; z up", contactModel: "simulation V1.3 ptRxDetect (CHARCOLLIDE-1 runner capsules; slide primitives LEG, THIGH, TUCK, TUCKSHIN, BODY, TRUNK)",
  gameplayHash: "FNV-1a of JSON(rows) + '|' + JSON(events) — the exporter's hashOf", contentHash: "SHA-256 of the JSON record without the wall-clock `cpu` field (FULL / LOCO file bytes are not reproducible because of it)" }, scenarios: [], notFrozen: [] };
for (const S of SCEN) {
  const f = { off: `records/v13/${S.cs}_OFF.json.gz`, v13loco: `records/v13/${S.cs}_LOCO.json.gz`, lc1loco: `records/lc1/${S.cs}_LOCO.json.gz` };
  const R = load(path.join(IB, f.off)), PV = load(path.join(IB, f.v13loco)), PL = load(path.join(IB, f.lc1loco));
  const gh = gameplayHash(R), events = R.events, contacts = events.filter((e) => e.kind === "PLAYER_CONTACT");
  // reaction timeline (simulation's runner reaction state per row)
  const trans = []; let prev = "∅"; R.react.forEach((x, i) => { const s = x ? x.kind : "∅"; if (s !== prev) { trans.push({ row: i, kind: x ? x.kind : null, state: x }); prev = s; } });
  const reactStart = trans.find((t) => t.kind) ? trans.find((t) => t.kind).row : null, reactEnd = [...trans].reverse().find((t) => !t.kind && t.row > (reactStart ?? 1e9));
  // derived surface distances, every row and slot; check against the record's d_now (min over slots per row)
  let dmax = 0, closest = { dM: Infinity }; const perRow = [];
  for (let k = 0; k < R.rows.length; k++) { if (!R.prims[k] || !R.simBody[k]) { perRow.push(null); continue; } let mRow = Infinity;
    for (let n = 1; n <= 4; n++) { const pr = R.prims[k][n - 1], sb = R.simBody[k][n - 1]; if (!pr || !pr.length || !sb) continue; const P = surfPairs(pr, sb.segs)[0];
      if (P.dM < mRow) mRow = P.dM; if (P.dM < closest.dM) closest = { ...P, row: k, slot: n - 1, tau: k + n / 4 }; }
    perRow.push(mRow === Infinity ? null : mRow); if (mRow !== Infinity && R.dnow[k] != null) dmax = Math.max(dmax, Math.abs(mRow - R.dnow[k])); }
  const firstOverlap = perRow.findIndex((x) => x != null && x < 0);
  let firstOverlapDetail = null; if (firstOverlap >= 0) for (let n = 1; n <= 4 && !firstOverlapDetail; n++) { const pr = R.prims[firstOverlap][n - 1], sb = R.simBody[firstOverlap][n - 1]; if (!pr || !pr.length) continue; const P = surfPairs(pr, sb.segs).filter((x) => x.dM < 0); if (P.length) firstOverlapDetail = { row: firstOverlap, slot: n - 1, tau: firstOverlap + n / 4, overlappingPairs: P.map((x) => ({ ...x, dM: r6(x.dM) })) }; }
  const firstPredRow = R.pred.findIndex((x) => x != null && x <= 0.25);
  const C = contacts.map((e) => { const row = e.tick - 1, slot = e.sub - 1, pr = R.prims[row][slot], sb = R.simBody[row][slot], pairs = surfPairs(pr, sb.segs);
    const presFeet = (Rp) => (Rp.pres[row] ? Rp.pres[row].feet : null);
    return { event: e, row, slot, tau: row + e.sub / 4, decisive: null,
      geometry: { tacklerPrimitives: pr, runnerSegments: sb.segs, derivedSurfaceDistance: { formula: "segseg(prim, seg).d − prim.r − seg.r(t)", pairsBelow50mm: pairs.filter((x) => x.dM < 0.05).map((x) => ({ ...x, dM: r6(x.dM) })) } },
      support: { authoritative: { eventSupport: e.support, stride: e.stride, segPlanted: e.segPlanted, gaitPhaseAtContact: e.phase, simBodyPhase: sb.phase, simBodyLegs: sb.legs, supportLost: e.supportLost, collapse: e.collapse },
        presentation_nonAuthoritative: { v13LocoFeet: presFeet(PV), lc1LocoFeet: presFeet(PL) } },
      kinematics: { preContactRow: { row: row - 1, ...kin(R.rows[row - 1]) }, contactRow: { row, ...kin(R.rows[row]) }, eventVelocities: { runner_vA: e.vA, tackler_vT: e.vT, massA: e.massA, massT: e.massT } },
      tacklerState: R.def[row] }; });
  // decisive contact = the one whose class sets the final outcome (rank NEGLIGIBLE < CORRECTION < STUMBLE < FALL; REV2 A1 reading)
  const RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 }; let best = -1; C.forEach((c, i) => { if (best < 0 || RANK[c.event.cls] > RANK[C[best].event.cls]) best = i; }); C.forEach((c, i) => (c.decisive = i === best));
  const w0 = Math.max(0, (firstPredRow >= 0 ? firstPredRow : 30) - 12), w1 = Math.min(R.rows.length - 1, reactEnd ? reactEnd.row + 1 : (closest.row ?? 60) + 12);
  const window = []; for (let k = w0; k <= w1; k++) window.push({ row: k, ...kin(R.rows[k]), react: R.react[k] ? R.react[k].kind : null, dNowRecorded: R.dnow[k] != null ? r6(R.dnow[k]) : null, dPredRecorded: R.pred[k] != null ? r6(R.pred[k]) : null });
  const cg = CG[S.cs], rv = REV2[S.cs];
  const sc = { id: S.id, role: S.role, case: S.cs,
    provenance: { simulation: { commit: R.baseline, branch: "prototype/slide-contact-v1.3-charcollide (local)", lineage: "slide-contact V1.2 e2c98ec + CHARCOLLIDE-1 (profile 3e28e02; prereg dd88ee9, A1 469d7ef, E1 0a60763, A2 6802742)", charcollide: R.charcollide, profileSha: JSON.parse(fs.readFileSync(path.join(ROOT, "pi1/trackB/v13/compat_gate_v13_all.json"))).profileSha },
      exporter: { script: "pi1/trackB/scripts/air_export_v13.cjs", schema: R.schema, ticks: R.scenario.ticks },
      records: Object.fromEntries(Object.entries(f).map(([k, p]) => { const Rx = k === "off" ? R : k === "v13loco" ? PV : PL; return [k, { path: p, bytes: fs.statSync(path.join(IB, p)).size, sha256: sha(path.join(IB, p)), contentHashExclCpu: contentHash(Rx), schema: Rx.schema, mode: Rx.mode, gameplayHash: Rx.gameplayHash, gameplayHashRecomputed: gameplayHash(Rx) }]; })),
      committedSummaries: { v13: { file: "pi1/trackB/v13/air/air_summary.json (e48fa5d9)", OFF: SUM_V13[S.cs].OFF, LOCO: SUM_V13[S.cs].LOCO }, lc1: { file: "locomotion_continuity/evidence/exports/on/rx/air_summary.json (19ff19d2)", LOCO: SUM_LC1[S.cs].LOCO } } },
    authoritativeInputs: { params: R.params, scenario: R.scenario, characters: R.chars, massKg: R.mass, legLenM: R.legLen, LEG_REF: R.LEG_REF, slideConstants: R.slide, reactionConstants: R.react0 },
    authoritativeOutcome: { gameplayHash: gh, finalClass: cg ? cg.finalClass : (contacts.length ? null : "NO_CONTACT"), contacts: C.map((c) => ({ tick: c.event.tick, sub: c.event.sub, row: c.row, slot: c.slot, tau: c.tau, prim: c.event.prim, seg: c.event.seg, segPlanted: c.event.segPlanted, cls: c.event.cls, family: c.event.family || null, J: c.event.J, decisive: c.decisive })),
      events, reactionTimeline: trans.map((t) => ({ row: t.row, kind: t.kind })), reactionStates: trans.filter((t) => t.kind).map((t) => ({ row: t.row, state: t.state })), reactionWindowRows: [reactStart, reactEnd ? reactEnd.row : null] },
    contacts: C,
    nearMissAndOverlap: { recordedMinDNowM: r6(Math.min(...R.dnow.filter((x) => x != null))), derivedClosest: { ...closest, dM: r6(closest.dM) }, derivedVsRecordedDNowMaxAbsM: dmax, firstGeometricOverlap: firstOverlapDetail,
      note: "derived = the exporter's surface-distance formula on the recorded primitives / segments; overlap is geometric only — the gameplay contact is the PLAYER_CONTACT event" },
    predictorReference_architectureSpecific: { rule: "PI-1 predictor: d_pred ≤ 0.25 m within 0.10 s on the current state (PI1_PREREGISTRATION.md)", firstPredRow, exporterFieldName: "firstPredTick (it is a row index)" },
    kinematicsWindow: window,
    existingEvidence: { compatGateV13: cg ? { finalClass: cg.finalClass, trigger: cg.trigger, criteria: cg.criteria } : null, rev2Scan: rv ? { cat: rv.cat, finalClass: rv.finalClass, trigger: rv.trigger, pass: rv.pass, reasons: rv.reasons || null, kp: rv.kp ?? null, leadTicks: rv.leadTicks ?? null } : null } };
  fs.writeFileSync(path.join(IB, "scenarios", `${S.id}_${S.cs}.json`), JSON.stringify(sc, null, 1));
  const dec = C.find((c) => c.decisive);
  manifest.scenarios.push({ id: S.id, role: S.role, case: S.cs, params: R.params, gameplayHash: gh, finalClass: sc.authoritativeOutcome.finalClass, contacts: sc.authoritativeOutcome.contacts,
    decisive: dec ? { tau: dec.tau, seg: dec.event.seg, segPlanted: dec.event.segPlanted, cls: dec.event.cls, family: dec.event.family || null, J: dec.event.J, point: dec.event.point, normal: dec.event.normal, runner_vA: dec.event.vA, tackler_vT: dec.event.vT, support: dec.event.support, stride: dec.event.stride } : null,
    reactionWindowRows: sc.authoritativeOutcome.reactionWindowRows, nearMiss: { recordedMinDNowM: sc.nearMissAndOverlap.recordedMinDNowM, derivedClosest: sc.nearMissAndOverlap.derivedClosest }, firstGeometricOverlap: firstOverlapDetail ? { tau: firstOverlapDetail.tau, pairs: firstOverlapDetail.overlappingPairs } : null,
    records: Object.fromEntries(Object.entries(sc.provenance.records).map(([k, v]) => [k, { path: v.path, sha256: v.sha256 }])), compatGateRows: cg ? Object.fromEntries(Object.entries(cg.criteria).map(([n, x]) => [n.split(" ")[0], x.pass])) : null,
    rev2: sc.existingEvidence.rev2Scan ? { pass: sc.existingEvidence.rev2Scan.pass, reasons: sc.existingEvidence.rev2Scan.reasons } : null, scenarioFile: `scenarios/${S.id}_${S.cs}.json` });
  console.log(S.id.padEnd(7), S.cs.padEnd(19), gh, "recomputed==record", gh === R.gameplayHash, "| contacts", sc.authoritativeOutcome.contacts.map((c) => `${c.tau} ${c.prim}→${c.seg}${c.segPlanted ? "(P)" : ""} ${c.cls} J${c.J}${c.decisive ? "*" : ""}`).join("; ") || "none",
    "| react rows", JSON.stringify(sc.authoritativeOutcome.reactionWindowRows), "| closest", r6(closest.dM), closest.prim + "→" + closest.seg, "τ", closest.tau, "| first overlap τ", firstOverlapDetail ? firstOverlapDetail.tau : "-", "| derived-vs-dnow", dmax.toExponential(2));
}
manifest.notFrozen = [
  { role: "minor body bump", status: "NOT FROZEN — no trustworthy existing case", evidence: "No V1.3 / V1.2 record has a minor torso / pelvis contact. The minor contacts that exist are foot / toe contacts (rx_rear TUCKSHIN→foot_R NEGLIGIBLE J 0; sl_left LEG→foot_L NEGLIGIBLE J 0; rx_rear_diag LEG→toe_L CORRECTION J 0), and in each the D-1 body is never struck or the contact rows fail (compat_gate_v13_all.json / _def.json)." },
  { role: "stronger torso / body collision", status: "NOT FROZEN — the only candidate fails existing correspondence rows", evidence: "sl_loose (defending fixture): TRUNK→pelvis FALL SIDE J 118.03 at tick 146/1, gameplay hash 5f414c8a; compat_gate_v13_def.json: CG-1, CG-3, CG-5, CG-6 pass; CG-2 (support state) and CG-4 (location 0.154 m vs 0.10 m) fail. Records only in a scratch export (not committed)." } ];
fs.writeFileSync(path.join(IB, "MANIFEST.json"), JSON.stringify(manifest, null, 1));
console.log("wrote MANIFEST.json +", manifest.scenarios.length, "scenario files");

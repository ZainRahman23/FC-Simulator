// ═══ occupy3b2/b2_cases.js — STAGE 3B.2: THE LAB'S CASE LIST — the lower-body problem cases first, directly selectable (§11), then the owner's §8
// stress cases, mirrors and the world turned 37°, then the rest of the §10 matrix. Every case is an existing one (occupy3b/l3_cases.js — the 3B.1
// matrix — and the Stage 3 review set, occupy3/o3_cases.js): identical inputs for OLD STAGE 3 · 3B.1 · 3B.2.
import { L3CASES } from "../occupy3b/l3_cases.js";
import { O3CASES } from "../occupy3/o3_cases.js";
import { labRows } from "../occupy3b/l3_forms.js";
const ALL = new Map(); for (const c of [...L3CASES, ...O3CASES]) if (!ALL.has(c.id)) ALL.set(c.id, c);
const GROUPS = [
  ["3B.2 · LEGS LANDING INTO EACH OTHER (the 22.4 cm cases)", ["both-committed", "croq-win", "bf-into", "face", "in-croq", "croq-early", "headon-jog"]],
  ["3B.2 · RECOVERY STEPS", ["side", "static-jog", "x120-run", "x30-jog", "oblique-firm", "croq-recover", "croq-recover2", "turn-into", "bf-fake"]],
  ["3B.2 · PLANTED FEET (anchors, released plants)", ["croq-between", "in-steer", "carry-walk"]],
  ["3B.2 · BOOT ↔ BOOT", ["carry-jog-l", "static-walk", "headon-walk"]],
  ["3B.2 · CROSSED LEGS", ["x150-jog", "bf-exit", "croq-hip"]],
  ["§8 STRESS CASES", ["bf-past", "croq-close", "carry-jog-def", "x90-jog", "in-bf", "croq-leg", "race", "glance", "overtake"]],
  ["§8 MIRRORED", ["side-m", "headon-jog-m", "x30-jog-m", "in-croq-m", "bf-into-m", "x150-jog-m"]],
];
const used = new Set(), rows = [];
for (const [g, ids] of GROUPS) for (const id of ids) { const c = ALL.get(id); if (!c || used.has(id)) continue; used.add(id); rows.push(Object.assign({}, c, { listGroup: g })); }
const LR = labRows();
for (const r of LR) if (r.rot && !used.has(r.id)) { used.add(r.id); rows.push(Object.assign({}, r, { listGroup: "§8 THE WORLD TURNED 37°" })); }
for (const r of LR) if (!used.has(r.id)) { used.add(r.id); rows.push(Object.assign({}, r, { listGroup: "THE REST OF THE §10 MATRIX · " + (r.listGroup || r.group || "") })); }
for (const [id, c] of ALL) if (!used.has(id)) { used.add(id); rows.push(Object.assign({}, c, { listGroup: "THE REST · " + (c.group || "") })); }
export const B2ROWS = rows;

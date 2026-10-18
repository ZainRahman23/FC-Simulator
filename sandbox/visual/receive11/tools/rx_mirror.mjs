// receive11/tools/rx_mirror.mjs — MIRRORING: a case and its mirror image (pass direction and exit mirrored left ↔ right, the receiver's stride phase
// mirrored — TURN-1.2's init.foot "L" — and a two-footed profile so the preferred foot does not decide) with the execution error off: the action
// selection must choose the mirrored action (same family, mirrored side and foot, same surface, the same contact and handoff ticks, mirrored ideal
// touch) and the authored body path must be the mirror image, up to the handoff (after it DRIBBLE-V1's own preferred-foot rules apply).
// usage: node rx_mirror.mjs out.json
import fs from "fs"; import { makeReceive, PROFILES, RXE } from "./rx_env.mjs"; import { makeCase, DIRS } from "../rx_cases.js";
RXE.sigDir = RXE.sigDir.map(([b]) => [b, 0]); RXE.sigSpeed = RXE.sigSpeed.map(([b]) => [b, 0]);   // (execution error off: the plan is compared, not a draw)
const MIR = { F: "F", FL: "FR", FR: "FL", L: "R", R: "L", RL: "RR", RR: "RL" }, P2 = Object.assign({}, PROFILES.HIGH, { weak_foot: 5 }), DEGr = 180 / Math.PI;
const run = (cs, foot) => { cs.scenario.init = Object.assign({}, cs.scenario.init, { foot }); const S = makeReceive(cs, { seed: 1, player: P2 }); S.run(); return S; };
const rows = []; let ok = 0, n = 0, worst = 0;
for (const [d, a, rs] of [["F", 0, "RUN"], ["FL", 45, "RUN"], ["L", 90, "RUN"], ["F", 120, "JOG"], ["FR", 135, "RUN"], ["F", 180, "JOG"], ["R", 240, "RUN"], ["RL", 315, "RUN"], ["L", 0, "STAND"], ["F", 90, "FAST"]]) {
  const A = run(makeCase({ dir: d, angle: a, rs, ps: "MED", side: "R" }), "R"), mA = (360 - a) % 360, B = run(makeCase({ dir: MIR[d], angle: mA, rs, ps: "MED", side: "L" }), "L");
  const a1 = A.rx.act, b1 = B.rx.act; n++;
  if (!a1 || !b1) { rows.push({ pair: `${d}_${a} / ${MIR[d]}_${mA}`, pass: !a1 && !b1, note: "no action" }); if (!a1 && !b1) ok++; continue; }
  // (a straight-on ordinary exit has no turn side; a case that is its own mirror image (pass from the front, exit 0° / 180°) has two equivalent
  // mirror solutions — the deterministic candidate order picks the same one for both: reported as SELF-SYMMETRIC)
  const selfSym = MIR[d] === d && mA === a, sideOk = a1.fam.kind !== "turning" && Math.abs(a1.dEx) < 1e-9 ? true : a1.sg === -b1.sg;
  const same = a1.fam.id === b1.fam.id && sideOk && a1.F !== b1.F && a1.surface === b1.surface && a1.kc === b1.kc && a1.kh === b1.kh;
  const dIdeal = Math.abs(((a1.ideal.dir + b1.ideal.dir) * DEGr + 540) % 360 - 180);   // mirrored headings: θ_B = −θ_A
  let dPath = 0; const kEnd = a1.kh != null ? a1.kh : a1.kc + 120; for (let k = 0; k <= kEnd && k < A.rec.length; k++) { const p = A.rec[k].P, q = B.rec[k].P; dPath = Math.max(dPath, Math.hypot(p[0] - q[0], (p[1] - 34) + (q[1] - 34))); }
  const pass = selfSym ? a1.fam.id === b1.fam.id && a1.kc === b1.kc : same && dIdeal < 1e-6 && dPath < 1e-6; if (!selfSym) worst = Math.max(worst, dPath); if (pass) ok++;
  rows.push({ pair: `${d}_${a}_${rs} / ${MIR[d]}_${mA}_${rs}`, A: [a1.fam.id, a1.F, a1.sg, a1.surface, a1.kc, a1.kh], B: [b1.fam.id, b1.F, b1.sg, b1.surface, b1.kc, b1.kh], idealMirrorErrDeg: dIdeal, pathMirrorErrM: dPath, selfSymmetric: selfSym, pass });
  console.log(rows[rows.length - 1].pair.padEnd(28), pass ? (selfSym ? "SELF-SYMMETRIC" : "MIRROR") : "DIFFERS", JSON.stringify(rows[rows.length - 1].A), JSON.stringify(rows[rows.length - 1].B), "ideal", dIdeal.toExponential(1), "path", dPath.toExponential(1));
}
fs.writeFileSync(process.argv[2], JSON.stringify({ pass: ok, n, worstPathErrM: worst, rows }, null, 1)); console.log(`mirror pairs ${ok}/${n} exact (worst body-path mirror error ${worst.toExponential(1)} m)`);

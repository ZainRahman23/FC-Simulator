// ═══ turn1/turn1_scenarios.js — TURN-1 test scenarios: a straight run at a ladder speed, then a requested heading change (deterministic inputs) ═══
// Speeds use RUN-1's ladder as the owner named it (RUN1.ladder): LOW 3.0 · JOG 5.5 · FAST RUN 7.8 · ALL-OUT 9.5 m/s. In TURN-1's matrix: JOG = 5.5,
// RUN = 7.8 (RUN-1 "FAST RUN"), SPRINT = 9.5 (RUN-1 "ALL-OUT"), LOW = 3.0 (the slowest RUN-1 regime; there is no RUN-1 walk). Heading 0 = across the
// gameplay camera, left → right; a RIGHT turn (+) heads toward the camera, a LEFT turn (−) away from it.
"use strict";
// eslint-disable-next-line no-var
var T1SCN = (function () {
  const SPEEDS = { LOW: 3.0, JOG: 5.5, RUN: 7.8, SPRINT: 9.5 }, ANGLES = [15, 30, 45, 60, 90, 120, 150, 180];
  const id = (sp, a, side) => `${sp}_${a}${side}`;
  function make(v, turn, tc, extra) {
    const sp = Object.keys(SPEEDS).find(k => Math.abs(SPEEDS[k] - v) < 1e-6) || v.toFixed(1);
    const side = turn >= 0 ? "R" : "L", a = Math.abs(turn);
    return Object.assign({ id: id(sp, a, side), label: `${sp} ${v.toFixed(1)} m/s · ${a}° ${side === "R" ? "RIGHT (toward camera)" : "LEFT (away)"}`, v, heading: 0, init: { v, heading: 0, pos: [18, 34] }, cmds: [{ t: tc, turn }], tCmd: tc, dur: tc + 3.2 }, extra || {});
  }
  const SC = {};
  for (const sp of Object.keys(SPEEDS)) for (const a of ANGLES) for (const s of ["R", "L"]) { const o = make(SPEEDS[sp], s === "R" ? a : -a, 1.0); SC[o.id] = o; }
  // straight controls
  for (const sp of Object.keys(SPEEDS)) SC[`${sp}_STRAIGHT`] = Object.assign(make(SPEEDS[sp], 0, 9), { id: `${sp}_STRAIGHT`, label: `${sp} ${SPEEDS[sp]} m/s · straight (RUN-1.3 control)`, cmds: [], dur: 4.0 });
  return { SPEEDS, ANGLES, make, get: (k) => SC[k] || SC.JOG_90R, list: () => Object.values(SC), all: SC };
})();
if (typeof module !== "undefined" && module.exports) module.exports = T1SCN;

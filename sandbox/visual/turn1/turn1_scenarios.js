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
  // transitions and continuous input (turn values are absolute, relative to the initial heading; + = right)
  const seq = (id, label, v, cmds, dur) => { SC[id] = Object.assign(make(v, 0, 9), { id, label, cmds, dur, tCmd: cmds[0].t }); };
  seq("ZIGZAG_RUN", "RUN 7.8 · cut 60° right, then back 60° left (RUN → CUT → RUN → CUT → RUN)", 7.8, [{ t: 1.0, turn: 60 }, { t: 2.6, turn: 0 }], 5.2);
  seq("ZIGZAG_JOG", "JOG 5.5 · cut 90° right, then 90° left back to the original line", 5.5, [{ t: 1.0, turn: 90 }, { t: 2.5, turn: 0 }], 5.0);
  seq("SLALOM_JOG", "JOG 5.5 · gentle steering: ±15° every 0.8 s", 5.5, [{ t: 0.9, turn: 15 }, { t: 1.7, turn: -15 }, { t: 2.5, turn: 15 }, { t: 3.3, turn: 0 }], 4.8);
  seq("SLALOM_SPRINT", "SPRINT 9.5 · gentle steering: ±12° every 0.9 s", 9.5, [{ t: 0.9, turn: 12 }, { t: 1.8, turn: -12 }, { t: 2.7, turn: 0 }], 4.6);
  seq("CONT_CURVE", "JOG 5.5 · arc 30° right, then (during the curve) 60° left", 5.5, [{ t: 1.0, turn: 30 }, { t: 1.45, turn: -60 }], 4.6);
  seq("CONT_PRE_RETARGET", "RUN 7.8 · 90° right, retargeted to 50° right before the plant", 7.8, [{ t: 1.0, turn: 90 }, { t: 1.25, turn: 50 }], 4.4);
  seq("CONT_PRE_ABANDON", "RUN 7.8 · 90° right, abandoned (back to 10° right) before the plant", 7.8, [{ t: 1.0, turn: 90 }, { t: 1.25, turn: 10 }], 4.4);
  seq("CONT_PRE_FLIP", "JOG 5.5 · 90° right, flipped to 90° left before the plant", 5.5, [{ t: 1.0, turn: 90 }, { t: 1.22, turn: -90 }], 4.6);
  seq("CONT_POST", "JOG 5.5 · 90° right, changed to 130° right after the plant began (committed: ±20°)", 5.5, [{ t: 1.0, turn: 90 }, { t: 1.6, turn: 130 }], 4.6);
  return { SPEEDS, ANGLES, make, get: (k) => SC[k] || SC.JOG_90R, list: () => Object.values(SC), all: SC };
})();
if (typeof module !== "undefined" && module.exports) module.exports = T1SCN;

// vocab1/tools/v_battery.mjs — every library technique requested in its curated entry (both feet), and what happened: PLAYED (its decisive
// contact made) · CANCELLED · REJECTED (with the reasons); the contacts; possession; the body (posed, v_extreme's classification)
//   node v_battery.mjs [--only ID] [--body 1]
import { tryTech } from "./v_try.mjs";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
export const CASES = [
  ["RONALDO_CHOP", "RUN", -90], ["RONALDO_CHOP", "SPRINT", -80], ["CRUYFF", "JOG", -125], ["CRUYFF", "RUN", -120], ["INSIDE_HOOK", "JOG", -150], ["DRAG_BACK", "JOG", 180], ["OUTSIDE_CUT", "RUN", 45],
  ["ELASTICO", "JOG", -45], ["ELASTICO", "RUN", -45], ["REVERSE_ELASTICO", "JOG", 45], ["REVERSE_ELASTICO", "RUN", 45],
  ["SCISSORS", "JOG", -45], ["SCISSORS", "RUN", -45], ["SCISSORS", "SPRINT", -40], ["STEPOVER", "JOG", 45], ["STEPOVER", "RUN", 45], ["DOUBLE_SCISSORS", "JOG", 45],
  ["MATTHEWS", "JOG", 50], ["MATTHEWS", "RUN", 50], ["V_TURN", "JOG", -90], ["V_TURN", "RUN", -110], ["V_TURN", "JOG", -120],   // (ADV-4: the V-pull / L-drag / pull-push folded into V-TURN)
  ["OUTSIDE_HOOK", "JOG", 150], ["STOP_AND_GO", "RUN", 0], ["STOP_AND_GO", "SPRINT", 0], ["STOP_AND_GO", "RUN", 0, { sprint: true }], ["STOP_AND_GO", "SPRINT", 0, { sprint: true }],   // (ADV-4: deaden-and-explode / hesitation (the sprint key) folded into STOP-AND-GO; the fake stop internal)
  ["SHIELD_ROLL", "WALK", 75], ["SHIELD_ROLL", "JOG", 75], ["ROULETTE", "JOG", -90], ["CROQUETA", "RUN", 35], ["CROQUETA", "JOG", -30], ["KNOCK_ON", "SPRINT", 35], ["SOLE_ROLL", "WALK", 100],
  ["FEINT_OUTSIDE_CUT", "RUN", -45], ["FEINT_INSIDE_CUT", "JOG", -40],
];
if ((process.argv[1] || "").endsWith("v_battery.mjs")) { const only = opt("only", null), body = opt("body", "0") === "1"; let n = 0, played = 0;
  for (const [id, mode, ang, xo] of CASES) { if (only && id !== only) continue; for (const foot of ["R", "L"]) { const a = foot === "R" ? ang : -ang, r = tryTech(id, Object.assign({ mode, angle: a, foot }, xo || {})); n++; const sk = r.skill; if (sk && sk.result === "PLAYED") played++;
      const m = body ? measure(r.sim, Math.round(2.0 * 240), 0) : null;
      console.log(`${(id + (xo && xo.sprint ? "+SPR" : "")).padEnd(18)} ${foot} ${mode.padEnd(6)} ${String(a).padStart(4)}° v${r.entry} → ${sk ? sk.result : "—"}${sk && sk.result === "PLAYED" ? ` (${sk.played}, decisive +${sk.after}s)` : sk ? " " + JSON.stringify(sk.rej).slice(0, 110) + " → " + sk.alt : ""} | ${r.contacts.slice(0, 3).join(" / ").slice(0, 120)} | sep ${r.sep} · travel ${r.travel}°${r.exits.length ? " · EXITS " + r.exits : ""}${m ? ` · body normal ${m.N.normal} slow ${m.N.slow}` : ""}`); } }
  console.log(`■ ${played}/${n} PLAYED`); }

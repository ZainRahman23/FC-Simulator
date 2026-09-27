// TACKLED-PLAYER V1 — neighbourhood search for review fixtures (anim off): generates rxCase variants and lists the contact each produces,
// so review pairs can be chosen where the contact is ROBUST (neighbouring geometry gives the same contact), not a centimetre graze.
const { rxCase } = require("./of_react_scenarios.js");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; }, L = (k, d) => opt(k, d).split(",").map(Number);
const SCEN = {};
for (const v of L("--v", process.env.RX_V || "7.5")) for (const ang of L("--ang", process.env.RX_ANG || "90")) for (const ph of L("--ph", process.env.RX_PH || "0.2,0.25,0.3")) for (const off of L("--off", process.env.RX_OFF || "0.3,0.35,0.4,0.45,0.5")) for (const sh of L("--short", "0"))
  SCEN[`s_${v}_${ang}_${ph}_${off}_${sh}`] = rxCase({ v, ang, ph, off, short: sh });
module.exports = { SCEN, keysAt: () => ({}) };

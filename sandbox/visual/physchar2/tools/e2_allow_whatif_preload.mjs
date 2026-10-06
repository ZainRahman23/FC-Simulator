// ═══ physchar2/tools/e2_allow_whatif_preload.mjs — DIAGNOSTIC what-if (e2/E2_OVERNIGHT_REPORT.md §7): sets the planner's tracked-clearance allowance FS.clearAllow (mm, env
// ALLOW="rise,apex,descent"), keyed to the PSTAR5CH servo, so tools/e2_pg.mjs can show what PG-1 would return under a given allowance. NOT a certified allowance (the servo
// validation, e2/SWING_SERVO_VALIDATION_RESULTS_S2.md, did not validate). usage: ALLOW=4.80,6.66,3.17 node --import <abs path>/tools/e2_allow_whatif_preload.mjs tools/e2_pg.mjs …
const { FS } = await import(new URL("../ctrl/v2_footstep.js", import.meta.url)); const a = (process.env.ALLOW || "").split(",").map(Number);
if (a.length === 3 && a.every(isFinite)) FS.clearAllow = { servo: { swingAccFF: true, vffRate: "sr", e2reanchorVel: true }, rise: a[0] / 1000, apex: a[1] / 1000, descent: a[2] / 1000, source: "DIAGNOSTIC what-if" };

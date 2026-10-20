// technical_control15/tools/tc15_review_build.mjs — the LOCAL review page of TECHNICAL-CONTROL-1.5 (never published: the character is a real player's
// model): the research tables (from TECHNIQUE_RESEARCH_AND_SPEC.md), the Ronaldo chop specification with its top-down diagram and the owner's 8-point
// test, the five references (diagram · clips · strip · numbers), the ball-exposure diagnostic, the body's quality, what is not done.
//   node tc15_review_build.mjs <review_artifacts/technical_control15>
import fs from "fs"; import path from "path";
const RA = process.argv[2], E = JSON.parse(fs.readFileSync(path.join(RA, "evidence/TC15_EVIDENCE.json"), "utf8")), MD = fs.readFileSync(path.join(RA, "TECHNIQUE_RESEARCH_AND_SPEC.md"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
// a markdown section's tables (and its bullet / paragraph lines) to HTML
function section(title) { const a = MD.indexOf(title); if (a < 0) return ""; const b = MD.indexOf("\n## ", a + title.length), body = MD.slice(a + title.length, b < 0 ? undefined : b).trim().split("\n"); let out = "", tbl = null, list = 0;
  const flushT = () => { if (tbl) { out += `<div class="tw"><table class="m"><thead><tr>${tbl[0].map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${tbl.slice(2).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; tbl = null; } };
  const flushL = () => { while (list > 0) { out += "</ul>"; list--; } };
  for (const ln of body) { if (/^\|/.test(ln)) { flushL(); const cells = ln.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); (tbl = tbl || []).push(cells); continue; } flushT();
    const m = /^(\s*)- (.*)$/.exec(ln); if (m) { const d = Math.floor(m[1].length / 2) + 1; while (list < d) { out += "<ul>"; list++; } while (list > d) { out += "</ul>"; list--; } out += `<li>${inline(m[2])}</li>`; continue; } flushL();
    if (ln.trim()) out += `<p>${inline(ln.trim())}</p>`; }
  flushT(); flushL(); return out; }
const byId = Object.fromEntries(E.map((e) => [e.id, e])), order = ["CHOP90", "OUTCUT45", "CRUYFF120", "HOOK150", "DRAGBACK180"];
const clip = (f, cap) => `<figure class="v"><video src="../clips/${f}.mp4" controls muted loop playsinline preload="metadata"></video><figcaption>${cap}</figcaption></figure>`;
const lab = (id, v = "quad") => `http://127.0.0.1:8361/sandbox/visual/technical_control15.html?tech=${id}&single=${v}`;
const num = (x, u = "") => (x == null ? "—" : `${x}${u}`);
function refBlock(id, extraClips) { const e = byId[id], c = e.contacts.map((q) => `${q.role} ${q.t >= 0 ? "+" : ""}${q.t.toFixed(2)} s (${q.F} ${q.surface.toLowerCase()}, ${q.speedOut} m/s @ ${q.outDeg}°)`).join(" · ");
  const ex = (k) => Object.entries(e.protection[k].exposedShare).map(([d, v]) => `${d} ${Math.round((1 - v) * 100)}%`).join(", ");
  return `<div class="grid2"><figure class="s"><img src="../diagrams/${id}_topdown.png" alt="${id} top-down"><figcaption>top-down: entry heading up · cyan the centre of mass · white the ball (dots every 0.05 s) · green / magenta right / left footprints and legs · dashed the striking foot's path · pressure lines at +0.05 s</figcaption></figure>
  <div><table class="m"><tbody>
  <tr><th>approach</th><td>${e.approach.speed} m/s → ${e.approach.atDecisiveContact} at the decisive contact → min ${e.approach.min} at ${e.approach.tMin >= 0 ? "+" : ""}${e.approach.tMin} s</td></tr>
  <tr><th>decisive contact</th><td>${e.decisive.F} ${e.decisive.surface.toLowerCase()} (boot hull face on the ball: ${e.decisive.actualFace}) · ball ${e.decisive.ballIn} → ${e.decisive.ballOut} m/s at ${e.decisive.ballOutDeg}° · impulse ${e.decisive.impulseDeg}° · foot heading ${e.decisive.footYawDeg}°</td></tr>
  <tr><th>exit</th><td>body ${e.exit.bodyHeading05}° at +0.5 s · pelvis ${e.exit.pelvisHeading035}° at +0.35 s · on the new line at ${num(e.exit.timeToLine == null ? null : "+" + e.exit.timeToLine, " s")} · ${e.exit.accel} m/s² over 0.5 s · ${e.exit.speed05} m/s at +0.5, ${e.exit.speed10} at +1.0</td></tr>
  <tr><th>contacts</th><td>${c}</td></tr>
  <tr><th>ball and body</th><td>nearest the pelvis ${e.ballNearestPelvis.d} m at +${e.ballNearestPelvis.t} s${e.ballVsSupport && e.ballVsSupport.crossesRunLine ? ` · crosses the support foot's line ${e.ballVsSupport.crossesRunLine.behindHeel} m behind its heel at +${e.ballVsSupport.crossesRunLine.t} s` : ""}</td></tr>
  <tr><th>blocked (reach from …)</th><td>contact: ${ex("contact")}<br>through the stance (0 … +0.25 s): ${ex("protection")}<br>exit (+0.25 … +0.6 s): ${ex("exit")}<br>the technique's pressure side (${esc(e.pressure.from)}): ${e.pressureBlocked.contact} / ${e.pressureBlocked.protection} / ${e.pressureBlocked.exit} — <span class="dim">${esc(e.pressure.note)}</span></td></tr>
  <tr><th>body</th><td>leg clearance min ${e.body.minLegClearanceCm} cm (${e.body.atT} s) · ball vs boots min ${e.body.minBallBootGapCm} cm (${e.body.gapT} s) · hard ROM exceeded ${e.body.romOverHardDeg}°${e.body.romJoint ? " (" + e.body.romJoint + ")" : ""} · ankle orientation error max ${e.body.ankleErrMaxDeg}° · reach adaptation max ${e.body.reachAdaptCm} cm</td></tr>
  </tbody></table><p class="sm"><a href="${lab(id)}">lab: ${id}</a> (views: quad · front 3/4 · rear 3/4 · side · top · run; 1× … 0.1×; the pressure lines on / off)</p></div></div>
  <div class="grid">${clip(id.toLowerCase() + "_quad_1x", `${e.label} — 1× (normal speed) · quad: front 3/4 · rear 3/4 · side · top`)}${clip(id.toLowerCase() + "_quad_05x", `${e.label} — 0.5× · quad`)}${extraClips || ""}</div>
  <figure class="s"><img src="../strips/${id}_quad_strip.jpg" alt="${id} strip"><figcaption>quad stills at −0.12 · −0.04 · 0 · +0.06 · +0.14 · +0.26 s from the decisive contact</figcaption></figure>`; }
const chop = byId.CHOP90, acc = chop.acceptance;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Technique References Review</title>
<style>:root{--bg:#0e1210;--fg:#e8efe9;--dim:#9fb0a5;--card:#161c18;--line:#2a332d;--acc:#ffd45e;--ok:#7dff9b;--bad:#ff8a80}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f7f4;--fg:#18201a;--dim:#5b6a60;--card:#fff;--line:#d9dfd9;--acc:#9a6b00;--ok:#147a2e;--bad:#b3261e}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1500px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:8px 0}h2{font-size:18px;margin:30px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:15px;margin:22px 0 6px}
.dim{color:var(--dim)}.sm{font-size:12px}p,li{max-width:1150px}.tw{overflow-x:auto}table.m{border-collapse:collapse;margin:8px 0;font-size:12.5px}table.m th,table.m td{border:1px solid var(--line);padding:4px 6px;vertical-align:top;text-align:left}table.m th{background:var(--card)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:10px;margin:8px 0}.grid2{display:grid;grid-template-columns:minmax(300px,520px) 1fr;gap:14px;align-items:start}@media (max-width:900px){.grid2{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}
figure{margin:0}figure.v video{width:100%;background:#000;border-radius:4px}figure.s img{width:100%;border-radius:4px}figcaption{font-size:12px;color:var(--dim)}
.note{background:var(--card);border:1px solid var(--line);padding:8px 12px;border-radius:6px}a{color:var(--acc)}code{font-size:11.5px}.pass{color:var(--ok);font-weight:600}.fail{color:var(--bad);font-weight:600}</style></head><body><main>
<h1>TECHNICAL-CONTROL-1.5 — technique reset: research, the Ronaldo chop spec, five elite references (presented for visual approval, not frozen)</h1>
<p class="note">LOCAL review page — the character is a real player's model: never published. <b>I cannot play video in real time</b>: the numbers are measured and the stills were inspected; the motion is yours to judge. Lab: <a href="${lab("CHOP90")}">${lab("CHOP90")}</a>. Nothing frozen; no ratings, styles or other moves were added (owner: "stop after the five elite reference turns").</p>
<h2>1 · What changed</h2>
<p>TECHNICAL-CONTROL-1.4's "Ronaldo chop" was a generic procedural contact labelled as a chop — the ball stayed exposed outside the body (your review). This pass started from research (coaching material — FIFA Training Centre, the FA, Meulensteen, academy session plans; and change-of-direction biomechanics — Dos'Santos, Falch, Vanrenterghem, Smith 2000's force plates for the Cruyff and the drag-back, Premier League turn data) and rebuilt the actions as <b>authored football actions</b>: ENTRY · CONTACT · PROTECTION · EXIT, each step, swing, contact and body channel authored — the engine only executes them (the frozen ball kernel between contacts, DRIBBLE-1's boot hull at each contact, TECHNICAL-CONTROL-1.1's leg chain for the joints, RUN-1's own stride for the running steps). Research notes with every quote and URL: <code>research/R1 … R3</code>; the full write-up: <code>TECHNIQUE_RESEARCH_AND_SPEC.md</code> ([E] a source states it · [I] inferred · [D] our decision).</p>
<h2>2 · The research table (your columns)</h2>${section("## 2. The technique table (owner's columns)")}
<h3>Principles the sources agree on</h3>${section("## 1. Principles the sources agree on")}
<h2>3 · The action map by angle</h2>${section("## 3. The action map by angle")}
<h2>4 · The Ronaldo chop — specification and the 90° reference</h2>
${section("## 4. The Ronaldo chop — action specification")}
<h3>Your acceptance test, measured (<code>tools/tc15_eval.mjs</code>)</h3>
<table class="m"><thead><tr><th>#</th><th>check</th><th>measured</th><th></th></tr></thead><tbody>${acc.tests.map((t) => `<tr><td>${t.n}</td><td>${esc(t.test)}</td><td>${esc(t.value)}</td><td class="${t.pass ? "pass" : "fail"}">${t.pass ? "pass" : "FAIL"}</td></tr>`).join("")}
<tr><td></td><td>fail condition: ${esc(acc.failCondition.test)}</td><td>${esc(acc.failCondition.value)}</td><td class="${acc.failCondition.fail ? "fail" : "pass"}">${acc.failCondition.fail ? "TRIGGERED" : "not triggered"}</td></tr></tbody></table>
<p class="dim sm">${acc.passed} / ${acc.of}. Check 6 is judged on the front line (a defender level-ahead, committed forward — the cue the sources give for the chop); from the right the ball is shielded at the chop but the side opens as the striking leg recovers — shown, not hidden.</p>
${refBlock("CHOP90", clip("chop90_rear34_05x", "Ronaldo chop — 0.5× · rear 3/4") + clip("chop90_front34_05x", "Ronaldo chop — 0.5× · front 3/4") + clip("chop90_side_05x", "Ronaldo chop — 0.5× · side (left)") + clip("chop90_top_05x", "Ronaldo chop — 0.5× · top"))}
<h2>5 · The other four references</h2>${section("## 5. The other four references [D] (as built)")}
${["OUTCUT45", "CRUYFF120", "HOOK150", "DRAGBACK180"].map((id) => `<h3>${esc(byId[id].label)} — ${esc(byId[id].family)}</h3>${refBlock(id)}`).join("\n")}
<h2>6 · The ball-exposure diagnostic</h2>${section("## 6. The ball-exposure diagnostic [D]")}
<h2>7 · What is explicit, inferred, ours</h2>${section("## 7. What is explicit, inferred, and ours")}
<h2>8 · The body: what the numbers say, the limitations</h2>
<table class="m"><thead><tr><th>reference</th><th>leg clearance min</th><th>ball vs boots min</th><th>hard ROM exceeded</th><th>ankle orientation error max</th><th>reach adaptation max</th></tr></thead><tbody>${order.map((id) => { const b = byId[id].body; return `<tr><td>${esc(byId[id].label)}</td><td>${b.minLegClearanceCm} cm at ${b.atT} s</td><td>${b.minBallBootGapCm} cm at ${b.gapT} s</td><td>${b.romOverHardDeg}°${b.romJoint ? " " + b.romJoint + " at " + b.romT + " s" : ""}</td><td>${b.ankleErrMaxDeg}° at ${b.ankleErrT} s</td><td>${b.reachAdaptCm} cm at ${b.reachT} s</td></tr>`; }).join("")}</tbody></table>
<ul><li>Leg clearance is TECHNICAL-CONTROL-1.3's capsule measure (conservative radii; TECHNICAL-CONTROL-1.3 flagged below −1.2 cm). Residual touches of 1.5 – 3 cm remain in the reversals (the swinging foot past the pivoting foot) and a few centimetres of boot against the ball right after some touches — visible only frame by frame, if at all.</li>
<li>The ankle orientation error is what the joint chain could not reach of an authored foot orientation (it saturates inside the anatomical ranges — the foot shown is the reachable one): ≤ 23° in the cuts and the Cruyff, 26 – 31° in the hook and the drag-back (the foot whipped round the ball / onto it).</li>
<li>The reach adaptation (the pelvis moved toward a planted leg at full stretch) is ≤ 9 cm, mostly in the run-up's longest stance.</li></ul>
<h2>9 · What is not done, and your decisions</h2>
<ul><li><b>Not integrated.</b> The five references are stand-alone authored actions in their own lab, on the same rig, ball kernel, boot hull, leg chain and running stride. They do not yet run inside TECHNICAL-CONTROL-1.2 / 1.3's carry simulation (the planner does not select them). After your approval, the integration replaces TECHNICAL-CONTROL-1.4's technique definitions.</li>
<li><b>Ratings.</b> Ball Control 99 is the ideal launch (no execution error), and Dribbling and Agility are the elite timings. The rating curves come only after the techniques are approved, as you asked.</li>
<li><b>One side, one foot.</b> Each reference is right-footed and one-sided. Mirroring is mechanical once approved.</li>
<li><b>Decisions for you:</b>
<ul><li>the chop's angle: the ball goes 82° and the body 90° (the coaching range is 45–60° to "slightly back");</li>
<li>whether the chop's striking foot should land crossed behind the plant leg (the classic photo), rather than stepping round it. Behind it there is no room once the body has turned over the plant foot without the legs intersecting; it would need the hips to stay forward longer;</li>
<li>for 150°, the inside hook (built) or the outside hook (it turns toward the kicking foot, with simpler leg mechanics);</li>
<li>the drag-back's turn side (the sources disagree; built: toward the dragging foot);</li>
<li>whether the reach-from-the-right opening after the chop matters for your use of it.</li></ul></li></ul>
<p class="dim sm">Files: sandbox/visual/technical_control15/ (tc15_ref.js the engine · tc15_tech.js the five techniques · tc15_viewer.js + technical_control15.html the lab · tools/ the evidence, the diagrams, the captures) · review_artifacts/technical_control15/ (research/, TECHNIQUE_RESEARCH_AND_SPEC.md, diagrams/, clips/, strips/, evidence/, review/).</p>
</main></body></html>`;
fs.writeFileSync(path.join(RA, "review/TECHNICAL_CONTROL15_REVIEW.html"), html); console.log("ok", html.length);

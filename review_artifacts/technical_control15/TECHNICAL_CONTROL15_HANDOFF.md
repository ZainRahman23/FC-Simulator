# TECHNICAL-CONTROL-1.5: handoff

## Where things are

**The engine: `sandbox/visual/technical_control15/tc15_ref.js`** (`RefSim`)
- `new RefSim({ E, M4, skel, colliders }, technique).run()` builds a technique and records each 240 Hz tick:
  - the posed skin and joints;
  - the ball;
  - the feet;
  - the leg angles and their range exceedance;
  - the ball-vs-boot gaps;
  - the leg clearances (`r.clr`);
  - the ball exposure (`r.exp`).
- Build order:
  - the centre of mass (speed / travel-heading keys);
  - the ball (the kernel; each contact's launch authored or solved to the next contact);
  - the stances;
  - the swings (RUN-1's stride, or waypoints; the contact pose on DRIBBLE-1's boot hull).
- Posing:
  - pelvis and trunk from the authored channels plus the running cycle;
  - legs by TECHNICAL-CONTROL-1.1's chain;
  - the planted heel rises past 20° of dorsiflexion;
  - the pelvis moves toward a leg at full stretch.
- Waypoint frames: `rel: "ball"` (the contact's ball), `"ballNow"` (the ball at that time), `"pelvis"` ([forward, right, h] in the pelvis frame),
  `"com"`, `"stance"` (the other foot) and `"O"` (the origin = the centre of mass at the decisive contact).
- Local frame: [ahead, + right] from the entry heading; + heading = a right turn.

**The five techniques: `sandbox/visual/technical_control15/tc15_tech.js`**
- `CHOP90`, `OUTCUT45`, `CRUYFF120`, `HOOK150`, `DRAGBACK180`.
- Each carries:
  - its phases and the centre-of-mass keys;
  - the posture channels;
  - the run-up (`carryTouches`, `ballStart`);
  - the contacts with swing specs;
  - the stances (`runSt` — RUN-1's stride; `atSt` — authored places);
  - the pressure side.
- Comments mark the research basis: [E], [I] and [D].

**The lab: `sandbox/visual/technical_control15.html` + `tc15_viewer.js`**
- URL parameters: `?tech=…&single=quad|fF34|fR34|fSide|fSideR|topF|fRun&rate=…&exp=0&dbg=1`.
- `dbg=1` draws the leg segments.
- The capture hook is `window.TC15`.

**Tools: `sandbox/visual/technical_control15/tools/`**

| Tool | Purpose |
|---|---|
| `tc15_env.mjs` | Node rig + colliders; `makeRef(id)` |
| `tc15_probe.mjs <id>` | quick numbers: contacts, stances, centre of mass, minimum clearances / gaps, reach, ankle error |
| `tc15_eval.mjs <out.json>` | the evidence for all five, plus the chop's 8-point acceptance test |
| `tc15_protect.mjs` | exposure summaries |
| `tc15_diagram.mjs <id> <out.svg>` | the top-down vector diagram from the reference's own data |
| `tc15_svgpng.cjs` | SVG → PNG |
| `tc15_capture.cjs` | frame-exact capture: clips; stills / strips with `--rel` from the decisive contact |
| `tc15_clips.sh`, `clip_lists/tc15_clips.txt` | the 14 clips |
| `tc15_strips.sh` | the five strips (two at a time: the local server) |
| `tc15_review_build.mjs <ra>` | the local review page |

## Reproduce

```
cd sandbox/visual/technical_control15/tools
node tc15_eval.mjs ../../../../review_artifacts/technical_control15/evidence/TC15_EVIDENCE.json
for id in CHOP90 OUTCUT45 CRUYFF120 HOOK150 DRAGBACK180; do node tc15_diagram.mjs $id <ra>/diagrams/${id}_topdown.svg; done      # (the windows / times used: see the report)
S=<scratch with node_r + ffmpeg> zsh tc15_clips.sh clip_lists/tc15_clips.txt <ra>/clips 3
S=<scratch> zsh tc15_strips.sh <ra>/strips
node tc15_review_build.mjs <ra>
```

The lab server must be serving the repository at `127.0.0.1:8361`.

## How a technique was tuned (for the next one)

**The approach:**
1. Author the centre of mass first.
2. Place the support foot relative to the ball at the decisive contact. Check that the support foot can push the body the way the path turns:
   the body must be on the far side of the foot.

**The run-up:**
1. Keep the ball ahead of the feet: touch 0.09 s before the landing, and land the touching foot with a short lead.
2. The last braking step lands to the left of a slowing ball.

**Waypoints:**
- The striking foot's waypoints in `ballNow` (the moving ball) keep the boot off the ball.
- Waypoints in `pelvis` control which side of the other leg the foot passes.
- In a turn toward the support foot's side, the free leg must go round the FRONT of the support foot once the body has turned over it.
- A standing foot that pivots on its forefoot swings its heel: start the pivot after the ball has gone past.

**Checks:**
- `tc15_probe.mjs` (clearances, gaps) and the top-down diagram after each change.
- Stills via `tc15_capture.cjs --rel`.

## Open and next

Not integrated, no ratings, no mirroring (see the report §3).

**Owner decisions:**
- the chop's angle (82° ball / 90° body);
- the chop's striking-foot landing (crossover round the plant foot, or crossed behind);
- 150°: inside or outside hook;
- the drag-back's turn side;
- the chop's right-side exposure.

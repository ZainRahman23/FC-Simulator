# E2 preregistration, version 2 (audit-corrected; FROZEN FOR REVIEW; no E2 implementation or run)

**Supersedes** `E2_PREREGISTRATION.md` (v1, kept). **Architecture:** `E2_DESIGN_v2.md`.

**Configuration:** PSTAR5 = PSTAR4 + the E2 options (planner, DCM reference layer, explicit swing, step sequencer, `xiRef2D` where the DCM layer does not supply ξ_ref).

**Order after approval:**
1. Implement default-off.
2. KV0 and PSTAR4 hash identity.
3. Re-run the planning certification of §3 with the **implemented** law.
4. A declared smoke run at a non-test step.
5. Freeze tools and harness definitions.
6. Official run.
7. Results.

No criterion changes after any result. Failed runs are kept. "Provisional" values are preregistered gates now; they may be revised only by a documented decision **before** the official run.

## 1. Test set

| set | runs | protocol |
|---|---|---|
| **S-F** forward step | 8 bodies × swing L / R = 16 | settle → transfer 4 s → release (TOUCHING ≥ 0.5 s) → planned step 0.10 m forward, seed swing 0.60 s, apex 0.025 m at α 0.5 → measured touchdown → acceptance → DCM DS transfer to the new midpoint → ≥ 4 s settle |
| **S-L** lateral step | 16 | as S-F, 0.08 m outward |
| **S-RATE** | S-F, S-L × {V2-REF, V2-165-62, V2-198-92} × L × {180, 480} Hz = 12 | as above |
| **S-P** disturbed steps | S-F × {V2-REF, V2-165-62, V2-198-92} × L × 5 N·s thorax push {lateral toward the swing side, forward} × **{50 ms before the swing command, 50 % swing, 80 % swing, at measured contact, 50 ms after LOAD_ACCEPT}** = 30 | as S-F |
| **S-LOW** early-contact probe | S-F × the 3 bodies × L with apex 8 mm = 3 | checks the bounded early-contact handling |
| **S-LATE** late / failed-contact probe | S-F × the 3 bodies × L with the foothold commanded 10 mm above the turf = 3 | checks the bounded late-contact / failed-touchdown handling (no declared contact) |
| **R-B** recovery steps (E2 obligations) | V2-165-62 L 240 / 180 / 480 Hz, R 240 Hz = 4 | the frozen E1b P15 protocol with the common planner |
| **R-A** class-A regression | the 19 class-A P15 runs | in place (T-A, PSTAR4 behaviour); E1b closure must still hold |
| **DET** | repeats of V2-REF S-F L, V2-165-62 R-B L 240 Hz | same-rate bitwise identity |
| **W** | V2-REF S-F L, V2-REF S-L R, V2-165-62 R-B L 240 Hz | browser = Node |
| **E1** | E1a (10) + the E1b closing set under PSTAR5 | E1a PASS; E1b closing evaluation PASS |
| **G** | G0–G3 battery with the PSTAR5 flags | V3.1 … V3.10 |

## 2. Criteria for planned steps (S-F, S-L, S-RATE, S-P, S-LOW, S-LATE)

| # | criterion | threshold |
|---|---|---|
| E2-1 | transfer and release | stance share ≥ 0.95 and swing-foot load < 1 % BW before the swing command; release only by the lifecycle |
| E2-2 | **physical liftoff** | exactly one measured LIFTOFF → AIRBORNE (touching pieces 0, load < 0.05 N) after the swing command, within 0.3 s; none before it |
| E2-3 | **controlled swing, no scuff** | tracking error ≤ 5 mm RMS / 10 mm max; yaw ≤ 2°; tilt ≤ 3°. **No turf contact of any boot piece** (toe, heel, side) between liftoff and 60 % of the swing. Swept-geometry clearance ≥ 5 mm between 20 % and 80 % (lowest of all boot hull points minus the tracking envelope). S-LOW: scuff / early contact allowed but handled (§2a) |
| E2-4 | **placement (provisional secondary target)** | horizontal distance between the swing foot's sole origin at its first SUPPORT tick and the final commanded foothold ≤ **10 mm**; heading difference ≤ **2°** |
| E2-5 | **measured touchdown** | exactly one TOUCHDOWN after ≥ 60 % of the swing. No state re-entered within 60 ms of physical time; no TOUCHDOWN → AIRBORNE rebound. Impact peak ≤ 25 % BW (E1a-12). At first contact: normal foot velocity ≤ **0.15 m/s** and tangential ≤ **0.05 m/s** (provisional). Impulse over the first 50 ms reported. Penetration (lowest hull point below the turf) ≤ **2 mm** |
| E2-6 | **load acceptance, realised** | LOAD_ACCEPT exactly once. Realised landed-foot share within 0.10 of the requested share throughout the ramp. LOAD_ACCEPT → SUPPORT within T_r + 0.1 s (no delayed or failed loading). Load tracking within 0.10 of the request from 1 s after the transfer ends (E1a-13) |
| E2-7 | **stance-foot slip (provisional secondary target)** | horizontal displacement of the stance foot's sole origin from the swing command to the end: **peak ≤ 1.0 mm**, accumulated path ≤ **2.0 mm**, yaw ≤ 0.5°. The stance foot never leaves SUPPORT |
| E2-8 | balance | ξ inside the stance region with ≥ 1 cm margin during the swing (S-P: no fall; abort / re-plan allowed and reported) |
| E2-9 | torque continuity | E1b-7: applied ≤ 10 N·m (25 in the 2 contact-onset ticks), commanded ≤ 30 N·m. Off 240 Hz: applied × max(1, 240/hz), commanded × 240/hz |
| E2-10 | **energy audit** | ledger closure residual ≤ +0.05 J per tick, Σ+ ≤ 0.5 J (E1a-8). **Motor work, external work, passive / implicit dissipation and the residual reported separately.** No "energy never increases" criterion |
| E2-11 | **capacity and saturation** | no over-capacity event. Saturation ≤ 5 % of swing ticks per axis, and **longest continuous saturation ≤ 50 ms** (provisional) |
| E2-12 | **predicted vs actual DCM** | \|ξ_pred − ξ_meas\| at planned touchdown ≤ **30 mm**, at LOAD_ACCEPT ≤ 30 mm, at the end of the settle ≤ 15 mm (provisional). ξ_pred = the plan at the decision tick, re-initialised at contact per design |
| E2-13 | final stable support, **no delayed fall** | ≥ 4 s after the transfer: both SUPPORT; ξ within 1.5 cm of its target; pelvis yaw within 1°; leg twists within 2° (E1a-14); step length / width within 1 cm of the command; no fall or abort at any time |
| E2-14 | knee envelope / path | E1a-16 / E1a-17 |
| E2-15 | **rates** | at 180 / 480 Hz every criterion holds (rate rule of E2-9), **and the classification is stable**: same pass / fail per criterion and same lifecycle event sequence. Physical convergence reported: placement, touchdown time and peak DCM error vs 240 Hz (provisional ≤ 3 mm, ≤ 10 ms, ≤ 5 mm). No bitwise identity across rates |
| E2-16 | morphology | all S-F / S-L on 8 bodies × L / R pass E2-1 … 15 |
| E2-17 | **CoP feasibility of the reference** | the plan's VRP and the implied CoP p* lie inside the realisable support region (s-weighted) at every tick, or the excursion is clamped and logged. Clamped excursions > 5 mm for > 20 ms are a failure (provisional) |
| E2-18 | **valid footholds after every adjustment** | every planner output (each re-plan) is inside the certified reach and valid landing geometry (no crossover, gap ≥ 10 mm); the final foothold and its swing path re-certified online. Zero violations |

**§2a Bounded contact handling** (S-LOW, S-LATE, and any occurrence):
- **Early contact before 60 %:** the foot is not accepted until the gate, or until the planner certifies the contact location from the measured state. No fall, no unplanned support change.
- **Late contact:** at most 0.3 s hold; no declared contact.
- **Failed touchdown:** NO_CERTIFIED_ONE_STEP re-plan from the measured state; never a declared contact.
- Outcome reported per case.

## 3. Planning gates (before any recovery case counts)

| # | gate |
|---|---|
| PG-1 | the online planner returns CERTIFIED_ONE_STEP with the nominal foothold for every undisturbed commanded step |
| PG-2 | for each of the 4 obligations, the planner **with the implemented E2 law** returns CERTIFIED_ONE_STEP. If it returns NO_CERTIFIED_ONE_STEP, that obligation is reported as such and **not** counted as an E2 pass. The planning-only result (`research/E2_REACH_AND_SNAPSHOTS.md`) is CERTIFIED only under the DCM-plan law, so this gate is real |
| PG-3 | every chosen foothold and swing path passes online certification |

## 4. Criteria for recovery steps (R-B)

| # | criterion | threshold |
|---|---|---|
| R-1 | recovered by stepping | no fall (including delayed); both feet SUPPORT at the end; classified **"recovered by stepping"** |
| R-2 | no unplanned support change | the old stance foot never AIRBORNE; its peak displacement ≤ **5 mm** (provisional secondary target, as E2-7's definition) |
| R-3 | capture-aware placement | the final foothold inside timed safe capture region ∩ certified reach ∩ valid geometry (planner verdict CERTIFIED_ONE_STEP); landed within 20 mm of it |
| R-4 | touchdown and acceptance | E2-5 and E2-6, with the recovery plan's ramp; LOAD_ACCEPT only on sustained contact (TA-1); bilateral within 2 s of the abort |
| R-5 | integrity | E2-9, E2-10, E2-11, E2-12, E2-17, E2-18 |
| R-6 | prediction | the predicted capture slack at the decision and the measured DCM margin at full support, both reported. Measured ξ inside the realisable support at full support |

**R-A (class A):** the E1b closing evaluation, unchanged.

## 5. Four-way P15 reporting

recovered without changing foothold / step required / recovered by stepping / fell. **NO_CERTIFIED_ONE_STEP is reported in addition** wherever the planner gives it (it is not "physically impossible").

## 6. Decision rule

**E2 PASS requires:**
- PG-1 … 3;
- every planned-step run passes §2;
- every R-B run passes §4;
- R-A, DET, W, E1 and G pass.

Any substantive failure → stop and report, no tuning. Mechanical tool defects → erratum and re-evaluation on the same runs.

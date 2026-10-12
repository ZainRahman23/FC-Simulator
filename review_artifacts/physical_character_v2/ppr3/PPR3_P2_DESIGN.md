# PPR-3 P2: continuous delayed postural control (design, after S2 was qualified; before P2's qualification)

**S2 qualified unchanged** (18 / 18; `evidence/PPR3_S2V_CANDIDATE.json`, commit ca7674b5) and is the plant here.

P2 (`scripts/ppr3_ctrl.mjs`, candidate `params/PPR3_P2_CANDIDATE.json`) is the nervous system's feedback on past sensed state. It is separate from S2 and runs every step from t = 0, before and regardless of any disturbance. It has no trigger and no contact, force, label, outcome or future input.

## 1. Causality by construction, and by test

**Construction.** Each step P2 (i) computes a sensor sample of the current body state into a ring buffer, then (ii) calls its control function with a frozen view that contains **only** each channel's sample at that channel's delay. The control function never receives the current state. Every command is logged with the sample index each channel used. Samples before t = 0 are the entry sample, i.e. the body has been standing still.

**Test** (two identical worlds, one pushed). On the design-stage check (moderate forward push at t = 2 s):
- the body state differs from the first step (4.2 ms);
- P2's commands are **bit-identical** until step onset + 1 + 6, the neck channel's 25 ms delay applied to the first state containing the push (29.2 ms);
- activation differs from that same step;
- the first neural torque > 0.1 N·m appears at 75 ms.

The qualification repeats this test for every push (criterion P5).

## 2. Sensors (body states only: what proprioception plus vestibular estimation provide)

- **COM:** whole-body position relative to the ankle midpoint (horizontal), and its velocity.
- **Segmental posture:** for the hip (upper body over the hips), lumbar, thoracic and neck, the horizontal offset of the supported mass's COM from its joint, and its rate.
- **Joint angles and rates** (proprioception).

No foot-load channel is used; it is optional in the instruction and was not needed.

## 3. Channels, delays, gains

| Channel | Acts on | Delay | Gains | Basis |
|---|---|---|---|---|
| **COM** (ankle / hip strategies, frontal load / unload) | legs only: ankle df / inv, knee flex, hip flex / abd, via the static Jacobian transpose J_f of a virtual COM force (`ppr3_statics.mjs`) | **100 ms** (24 steps) | AP: K_P 1.196, K_D 0.45 s, K_I 0.17 s⁻¹ (× mgh / h², h = 0.892 m). ML: K_P 2.39, K_D 0.764 s, K_I 0.289 s⁻¹ | COM → EMG delay 88–128 ms [M] (Welch & Ting; van der Kooij & Peterka; Pasma; Kiemel). Total stiffness = **1.475 × the mode's gravitational stiffness** (mid of human 1.3–1.65 mgh [MODEL], Peterka 2002 / Maurer & Peterka 2005) − S2's measured sway-band (3 s) intrinsic stiffness (AP 0.279, ML 0.115 mgh). The ML mode's gravitational stiffness is **measured**: 1,380 N/m for the wide-stance four-bar, 1.70 × mg/h; the AP value, 811 N/m, equals mg/h. K_D = 0.45 s × the same gravitational stiffness [MODEL]. K_I from Peterka 2002 (0.17 s⁻¹), scaled likewise |
| **Segmental posture** (hip: flexion only; lumbar, thoracic, neck: flexion and lateral bending) | the channel's own joint(s) | **75 ms** (hip / trunk); **25 ms** (neck) | K_P 1.3, K_D 0.45 s (× the static load sensitivity J_d to the supported mass's horizontal offset) | Hip / trunk loops 66–79 ms [M]; vestibulocollic reflex EMG 22–25 ms [M]. K_P 1.3 is the active gain identified in humans [MODEL]. It is not reduced by intrinsic stiffness, because muscle stiffness acts on relative joint angles while gravity loads absolute offsets in a chain (§5) |
| **Knee squat mode** | knee flexion | 75 ms | K_P 0.2, K_D 0.45 s (× 57.3 N·m/rad, the squat mode's gravitational stiffness, measured) | S2's knee is intrinsically stable at low frequency (quasi-static 99 > 57 N·m/rad). 0.2 is the floor so every channel keeps active feedback [D] |
| **Joint posture** on axes with no task role and no gravitational restoring torque: hip / knee / spine / neck axial rotation, shoulders, elbows | those axes | 75 ms | K = 0.85 × the axis's entry short-range stiffness (the share lost to stress relaxation, 1 − f_res); D = 2·0.2·√(K·I) | Proprioceptive postural regulation [E/D]. Without it, motor noise random-walks these modes until the posture gives way (§5). **A frozen-pose element:** it targets the entry configuration, delayed and capped at muscle level |
| **Motor noise** (force level) | every actuated axis | — | SD = 2.5 % × √(F⁺² + F⁻²) of the entry muscle forces, low-pass τ 0.1 s, seeded (deterministic) | Force CV 2.53 ± 1.6 % in young adults [M] (Tracy et al. 2005, Muscle & Nerve, PMID 15986419). Bandwidth [D]. Identical in twin worlds, so causality is unaffected |

**EMG → force dynamics:** V2's own activation dynamics (first order, 15 / 50 ms). This is the fast option in the literature's unresolved conflict (≈ 40 ms first order, Welch & Ting, vs a 0.2–0.3 s second-order filter). The second-order filters were fitted in models without other activation dynamics, so adding one on top double-counts the lag (§5).

## 4. What P2 is not

- **No collision trigger** and no event logic.
- **No stepping.** The feet move only through contact mechanics and the ankle.
- **No instantaneous path.** Every input is delayed ≥ 25 ms (neck) or ≥ 75–100 ms (everything else). Activation lags further.
- **No PVP input.**

## 5. Design-stage iterations (disclosed; each addressed a diagnosed cause)

All of these ran with the frozen S2, before P2's freeze. **Pushes from the qualification battery were not run** on the final candidate, except the one moderate forward push used for the causality chronology in §1, where only the chronology was read. Undisturbed standing and two small impulse responses (2 N·s forward, 4 N·s lateral) were used during design.

1. **First rule-derived controller** (each channel's gain = 1.3 − S2 intrinsic at 1 s; COM through all joints; tilt-angle sensing; 2nd-order EMG filter 15 rad/s): falls laterally at ≈ 7 s.
2. **ML COM gain from the ML intrinsic stiffness** (1.15 instead of AP's 1.0): still diverges. Not the cause.
3. **Intrinsic stiffness acts on relative angles; gravity loads absolute offsets in a chain.** Segment gains raised to the human active 1.3: slower trunk C-curve, still unstable.
4. **Sensing bug:** a segment's rotation was read from its joint → COM line, which under-reads by (1 − (r̂·â)²) ≈ 0.5–0.7 in this forward-leaning stance. Corrected; still unstable.
5. **COM channel restricted to the legs, and segments sensed by horizontal COM offset** (what gravity acts on) instead of tilt: a lateral oscillation appears.
6. **Channel roles separated** (hip posture channel in flexion only; frontal hip load / unload by the COM channel): stable noise-free for 20 s.
7. **Motor noise added:** falls at ≈ 13 s. Axial rotations and arms random-walk (only relaxing intrinsic stiffness holds them), so the joint-posture channel was added on those axes only. Applied to all axes it destabilised the balance loops.
8. **COM gains against S2's sway-band (3 s) intrinsic stiffness, total target mid-range 1.475:** still falls.
9. **Impulse responses showed a linear oscillatory instability that more K_D made worse,** i.e. too much loop lag. The explicit 2nd-order EMG filter was removed (V2's activation dynamics are the EMG → force element). Both loops then became stable and well damped (2 N·s forward: peak 5.1 mm at 0.5 s, decays).
10. **ML gravitational stiffness measured** (four-bar 1,380 N/m = 1.70 × mg/h; the AP value equals mg/h) and the ML gains scaled to it: lateral loop well damped. Stands 30 s with noise, but drifts slowly (15 mm).
11. **Integral term (Peterka 2002, K_I 0.17 s⁻¹):** stands 60 s with noise, COM within ±5.6 mm AP and ±1.5 mm ML, joints ≤ 3.7°.

**What was seen of the final candidate before the freeze:** 60 s undisturbed with noise gave COM RMS 1.86 mm AP and 0.62 mm ML, COP RMS 4.9 / 5.5 mm. The U4 bands in the preregistration were set from the human values (× [0.25, 3]) with these values known; this is disclosed.

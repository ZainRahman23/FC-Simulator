# BODY FEINT V2 — research summary and checklist

The owner's instruction (verbatim in `sources/`) names Lionel Messi as the main reference. **No Messi footage was stepped through for this work.** I cannot play video in real time, and no clip was supplied for this milestone. Nothing here claims to replicate Messi.

The model rests on two sources: published biomechanics of deceptive sidesteps, and a standard coaching description of the football body feint. Messi's feints are the target *style*: small, quick, whole-body, with the ball barely moving. The numbers below are not taken from him.

## 1. What the sources say

### Deceptive sidestep: Brault, Bideau, Kulpa & Craig (2012)

*"Detecting Deception in Movement: The Case of the Side-Step in Rugby"*, PLoS ONE 7(6): e37494. Motion-captured rugby players performed genuine and deceptive sidesteps, and expert and novice defenders judged them.

- **Exaggerated deceptive cues.** In a deceptive sidestep the attacker *exaggerates* the cues that point the false way:
  - head yaw;
  - upper-trunk yaw (the shoulders turned further than the hips);
  - the out-foot placement (the false step wide).
- **Minimised honest signal.** The attacker *minimises* the honest one: the lateral displacement of the centre of mass toward the false side stays small.
- **What experts read.** Expert defenders were not fooled as often, because they read the centre of mass and its momentum, not the head or the shoulders.
- **The design rule taken from it.** The lie is told by the segments; the centre of mass moves only as far as the support needs. A feint that throws the whole body sideways is not deceptive, it is just a slower change of direction.

### The football body feint (the "lunge", Coerver-style coaching description)

1. **Sell it.** Approach the defender with the ball close, then step and lunge with the fake-side foot to the side.
2. **Load it.** The weight goes onto that leg; the head and shoulders go with it, and the shoulder on that side drops as the foot plants.
3. **Reverse.** Push off the false step.
4. **Take it out.** Take the ball away the other way, about 45°, with the *outside* of the other foot.
5. **Burst.** Accelerate into the space.

The ball is not moved during the lie. The only touches are the carry touch that sets it and the outside touch that takes it away.

### Synthesis for this engine

- **The support is real.** The false step is an authored stance: wide, toe out, knee flexed under load. The authoritative root (the centre of mass the support and the possession model use) shifts toward it. No visual-only root offset is used.
- **Segments exaggerated, centre of mass minimal:**
  - the shoulder line drops toward the fake;
  - the upper trunk twists further than the pelvis;
  - the head turns toward the fake;
  - the arms go asymmetric.
- **Hips release first on the exit.** The pelvis turns to the new line while the shoulders still lag toward the fake, then catch up.
- **A cost.** The body sheds speed into the false step (jog 3.2 → 2.6 m/s) and re-accelerates on the rated curves: A99-C turning, Agility B, D38 ball-on. There is no bonus.
- **A quiet ball.** One set touch in stride, the outside touch out, one exit touch with the laces. Nothing in between.

## 2. Checklist: research → BODY FEINT V2 (measured, jog FAKE LEFT → EXIT RIGHT, `evidence/feint_measure.txt`)

| # | From the sources | BODY FEINT V2 | OLD (VOCAB-1) |
|---|---|---|---|
| 1 | False step wide on the fake side, toe out | ankle 0.23 m outside the pelvis, toe-out 24° | none |
| 2 | Weight loaded on it (support knee flexed) | knee 75° at the load | — |
| 3 | Centre of mass toward the fake, *small* | pelvis 0.12 m toward the fake (walk 0.08, run 0.13); the approach never drifts toward the exit, ≤ 8 cm toward the fake | 0.03 m |
| 4 | Shoulder drops toward the fake as the foot plants | 13° shoulder-line drop | 1° |
| 5 | Upper trunk turned toward the fake more than the hips | trunk vs hips 20°, pelvis 9° | 4°, 7° |
| 6 | Head turned toward the fake | 14° | 0° |
| 7 | Arms take part (asymmetric) | hands 0.62 m apart fore-aft | 0.58 m (the plain swing) |
| 8 | Push off the false step; hips lead the exit | pelvis turns first, shoulders follow (trunk keys −15° → +3°) | — |
| 9 | Ball out ≈ 45° with the outside of the other foot | the exit-side foot's OUTSIDE at 45°, then a laces exit touch | outside redirect (no lie) |
| 10 | Burst after it | 2.6 → 3.2 m/s within 1 s on D38 / A99-C | no speed change (no cost) |
| 11 | Ball quiet during the lie | no touch between the set touch and the outside touch | — |
| 12 | Mirror-exact both ways | FAKE RIGHT → LEFT identical numbers (left-footed twin) | — |

### Not matched, or not claimed

- **No defender is modelled**, so "fooled" is not scored, as the owner instructed.
- **Messi's timing and amplitude are not measured.** The false phase here (false step plant → touch) is about 0.3 s at a jog. Whether that reads as elite at 1× is the owner's call.
- **Request latency.** At a jog the request → touch is 0.70–1.02 s, depending on the stride phase. The shortest entry (opened at the false step) is used only when its approach does not steer toward the true exit first. A steer toward the exit is a tell (see the report §4).

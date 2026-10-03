# User decision, 2026-10-03: heel-rise investigation accepted; V2-G1 accepted as passed

Verbatim (the user's message, as pasted):

---

Claude's causal analysis is much stronger than merely saying "the physics looks okay."
The key finding is that the foot is not being pushed into plantarflexion by the ankle. During the main heel-rise interval, the ankle contributes −1.03 J, meaning it is absorbing energy, while the shank/leg transmits +2.75 J into the foot through the ankle joint. The turf also removes ~0.21 J. So the foot's energy is coming from the collapsing leg above it, not from a hidden calf-like spring.
The sequence now makes sense:
1 m fall
   ↓
feet impact
   ↓
~196 J translational KE removed
   ↓
much of remaining motion becomes segment rotation
   ↓
knees fold rapidly
   ↓
pelvis drops ~57 cm
   ↓
feet become almost unloaded
   ↓
toe remains planted
   ↓
folding shank pulls ankle/heel upward
   ↓
foot rotates around planted toe

That is quite different from the interpretation I was initially worried about:
flat foot
   ↓
mysterious ankle/ground torque
   ↓
heel gets launched upward

Claude has essentially ruled that second explanation out.
The counterfactuals are particularly persuasive. Turning off elastic ankle tissue, the end stop, or all ankle tissue produces essentially identical behavior until the heel is already 235–238 mm high. Turning off pose coupling is bit-identical. Disabling foot self-contact doesn't eliminate it. Changing the foot representation changes the magnitude by only ~15%. And 480/720 Hz plus 300 iterations converge to almost exactly the same ~232–240 mm rise.
So this doesn't look like a solver accident either.
The surprising part is really the severity of the test
There's a sentence in Claude's report that explains why the motion looks so violent:
54 kN in one tick, about 69× body weight.

We're dropping a completely passive, rigid-footed, rigid-grounded articulated human one metre onto its feet, with no shoe/heel/midsole compliance and no active muscular landing strategy.
That's an extraordinarily harsh landing.
A real footballer wouldn't passively hit the ground like our mannequin does. Before contact they'd already be flexing/positioning the legs, and after contact active eccentric muscle action would manage the landing. Shoes and biological tissue would also absorb energy.
Our G1 mannequin deliberately has none of that active control.
So:
the weird-looking collapse isn't supposed to be a realistic human landing animation.
It's a mechanical torture test of the passive plant.
And that is exactly what G1 is supposed to be.
One detail I particularly like
Claude found that the rise stops naturally once the foot becomes a loaded strut.
At that point the ground reaction passes within 6.8 mm of the ankle, and the ~70.2° foot pitch happens to be almost exactly the geometric ~70.84° orientation where a vertical force through this boot passes through the ankle.
That's a very nice physical explanation for why it stops rising where it does. It's not an arbitrary constraint suddenly arresting it.
Then the later ~238 mm peak is associated with the second impact—knees reaching full flexion, buttocks coming onto the heels, forearms approaching the turf—and that pushes the ankle briefly past its plantarflexion hard limit. That's already part of the transient G1 excursion data rather than the cause of the initial heel rise.
So I would formally close this investigation
We've now done something useful for future debugging: the foot/ankle probe Claude added should stay.
That instrumentation—CoP, ground force, CoP-to-ankle line, individual boot-piece contacts and torque decomposition—is going to be extremely valuable later for:
- heel strike;
- toe-off;
- walking;
- acceleration;
- braking;
- planting;
- cutting;
- kicking.
I'd tell Claude:
The heel-rise investigation is accepted.
I agree with the conclusion that the observed heel rise in the passive 1 m feet-first drop is mechanically explained by the collapsing leg transmitting energy through the ankle joint into an almost-unloaded foot whose toe remains planted, rather than by active/passive ankle propulsion, end-stop energy injection, hidden support, or a numerical launch.
Make no simulation change as a result of this investigation.
Preserve permanently:
- HEEL_RISE_REPORT.md;
- the foot/ankle measurement probe;
- CoP/contact-wrench instrumentation;
- per-boot-piece contact instrumentation;
- ankle torque/work decomposition;
- the diagnostic passive-joint switches;
- the viewer probe overlay;
- the counterfactual results.
Record the heel-rise investigation as supporting evidence for the G1 passive-physics validation.
Also record clearly that the 1 m passive feet-first drop is a mechanical stress test, not a target model of a controlled human landing: the current test has no active anticipatory/eccentric landing control and no shoe/midsole compliance.
Do not tune the body to make this passive fall look more human.
The existing G1 technical debt remains unchanged.
I now accept V2-G1 as passed.
Update the decision record/handoff accordingly and make a local checkpoint commit if needed. Do not push.
Then STOP. Do not begin G2 yet.
Report only the final G1 checkpoint state, commit/hash, whether the tree is clean, and the review URL.

FOCUSED VISUAL FIX — FEET / ANKLES / LOWER-LEG IK
The new TECHNICAL-CONTROL behavior is directionally correct, but the feet and ankles still look visibly unnatural/robotic during fast dribbling.
Do NOT retune Ball Control, Dribbling, Agility, touch frequency, ball separation, technical-action selection, styles, or authoritative ball contacts yet.
Keep the fast feet and quick touches. Fix how the human leg reaches those contacts.
The current diagnostic improvement in foot-target positional error is not sufficient. A foot can reach within a few centimetres of the correct contact while still having an anatomically bad ankle/foot pose.
Treat the leg as a coordinated chain:
pelvis
→ hip
→ thigh
→ knee
→ shin
→ ankle
→ foot
→ contact surface

Do NOT solve most of the remaining contact error by twisting/snapping the ankle or rotating the foot at the last moment.
The hierarchy should be approximately:
1. root/pelvis positioning
2. hip rotation and leg swing
3. knee flexion/extension
4. ankle adjustment
5. small final foot/contact-surface correction
The ankle should be the last small correction, not the primary way of reaching the ball.
Add anatomically sensible limits for:
- ankle dorsiflexion/plantarflexion;
- inversion/eversion;
- foot yaw relative to shin;
- knee direction;
- hip rotation;
- knee extension.
Avoid visible:
- ankle folding;
- foot twisting sideways underneath the shin;
- toe suddenly pointing at the ball;
- foot snapping orientation immediately before contact;
- knee bending in an incompatible direction;
- shin/foot rotational discontinuities;
- hyperextended straight legs;
- foot orientation changing instantly after contact.
Contact surface matters.
If the action says:
inside foot

orient the whole leg sufficiently that the inside surface naturally meets the ball.
Do not leave the leg facing forward and rotate only the ankle 70° to expose the inside.
Likewise:
outside foot
sole
instep

should each have a recognizable leg/hip preparation.
For very fast contacts, begin preparing the next contact leg before the current contact completes where appropriate. Elite fast feet should come from overlapping preparation, not instantaneous pose changes:
current foot contacts
while
next hip/leg is already preparing
↓
weight transfer
↓
next contact

Preserve the rapid contact cadence.
Also make the support foot believable. During a technical touch, one leg cannot perform an extreme reach while the other foot remains in an incompatible frozen running pose. The support leg should accept weight, flex appropriately, and permit the pelvis to move toward the contact.
Add a short pre-contact wind-up and post-contact follow-through to each foot action. These can be very short at Dribbling 99, but they must exist. Avoid:
running pose
→ instant contact pose
→ running pose

Prefer:
running stride
→ contact preparation
→ contact
→ natural follow-through
→ next stride/action

For rapid double touches, blend them as one coherent technical sequence rather than two independently solved IK events.
Do not change the authoritative ball to accommodate the skeleton.
If a scheduled contact cannot be reached with a plausible anatomical pose, first try:
- pelvis/root adaptation;
- stride adjustment;
- hip preparation;
- support-foot adjustment;
- earlier leg preparation.
If it still cannot be reached plausibly, flag the action/contact schedule as visually infeasible rather than grotesquely deforming the ankle.
Build a dedicated feet/ankles review mode with close cameras showing:
front 3/4
rear 3/4
side
foot-level close-up
0.5×
0.25×
frame strips around every contact

Prioritize:
- straight high-speed dribbling;
- rapid inside touches;
- rapid outside touches;
- inside→outside;
- outside→inside;
- double touch;
- drag/push;
- 60° cut;
- 90° cut;
- 120–180° tight turns;
- dominant-foot repeated touches.
Use 99/99/99 first, because we want to preserve the fastest cadence while making it human.
Then verify 80/80/80 and 50/50/50.
Add diagnostics for:
ankle angular velocity
ankle angular acceleration
foot yaw relative to shin
ankle flexion
ankle inversion/eversion
knee angle
hip rotation
contact-surface orientation
support-foot slip
pelvis-to-contact reach

Don't optimize merely for low positional IK error.
The main acceptance criterion is visual:
At full speed, the feet should look fast and skillful. At slow motion, every contact should still look like something a human ankle, knee and hip could plausibly perform.

Preserve all current TECHNICAL-CONTROL gameplay results unless an authoritative contact is genuinely impossible to represent anatomically.
Do not freeze after this pass. Present the corrected foot/ankle motion for visual review.

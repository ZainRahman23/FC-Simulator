# Owner instruction — 22 Oct 2026, ≈ 16:18 EEST (verbatim)

TECHNICAL CONTROL — FOUR HIGH-VALUE DRIBBLING SOLUTIONS
The Cruyff/Ronaldo Chop hierarchy is looking good. Continue that exact design philosophy with four additional advanced techniques:
1. LA CROQUETA
2. V-PULL / V-TURN
3. MATTHEWS / INSIDE-OUT
4. STOP-AND-GO / DEADEN-AND-PUSH

Focus ONLY on these four families in this pass.

Do not add defenders.
Do not build Dribbling ratings yet.
Do not add more flashy/manual skills.

Default test player remains:
S99
Acc99-D38
A99-C
Agility Scale B
D99
BC99
Carry-B
CONTROLLED

CORE DESIGN RULE
Follow what we just established with:
HOOK → CRUYFF / RONALDO CHOP

A basic action remains the safe/general solution.

The advanced technique should win only when it provides a real football advantage:
earlier useful contact
less unnecessary braking
better ball placement
better body protection
faster useful exit
better momentum retention
better direction change
faster control return

Do NOT make advanced moves win merely because they are named skill moves.
1. LA CROQUETA
Build/refine Croqueta into a genuinely valuable across-body transfer.

Core football purpose:
Move the ball rapidly from one side of the body to the other while the body continues through the gap, without requiring the whole body to rotate around the ball first.

Mechanically:
first inside-foot manipulation
→ ball crosses body
→ opposite foot receives/continues
→ useful exit

It should be especially valuable for:
lateral lane changes
diagonal exits
ball on wrong side of body
compact changes of lane
future pressure escape

Compare it against:
ordinary inside redirect
ordinary outside redirect
carry + reposition

Croqueta should win only where transferring the ball across the body genuinely produces the better outcome.

Support both directions/mirrors.

Do not make it two arbitrary rapid touches. The body/support sequence must explain the transfer.
2. V-PULL / V-TURN
Build a coherent V-turn family.

Core purpose:
Pull the ball away from the current line, then immediately redirect it into a new diagonal/sideways line without requiring a full brake-turn-recollect sequence.

Rough structure:
approach
→ sole/appropriate pull backward
→ redirect outward
→ exit

Useful region should likely include:
low/moderate speed
approximately 60–150° redirection
stop/reversal situations
compact direction resets

Research/measure the actual useful envelope rather than hard-coding those numbers.

Compare against:
braking touch → ordinary redirect
hook
drag-back
Cruyff

V-turn should provide a distinct advantage when the ball can be pulled and redirected more efficiently than completely reorganizing the body.

Treat V-pull/V-turn variants as one parameterized family where possible, not several catalogue moves.
3. MATTHEWS / INSIDE-OUT
Build a compact same-foot:
inside cue
→ outside exit

family.

Core purpose:
Present an inside movement cue and rapidly take the ball outside with the same foot.

This is partly deceptive, but it must also have a real technical advantage before defenders exist:
compact lane change
same-foot ball manipulation
reduced body reorganization
rapid outside exit

Do not make this purely a cosmetic body feint.

The ball should genuinely execute the characteristic:
inside implication/manipulation
→ outside continuation

but avoid unnecessary extra ball displacement merely to make the move visually obvious.

Compare against:
ordinary outside cut
inside → outside ordinary two-action sequence
compact redirect

If Matthews has no measurable advantage without a defender in some state, that's okay. Do not artificially buff it.

Build it so defender deception can later make it more valuable.
4. STOP-AND-GO / DEADEN-AND-PUSH
This is extremely important.

Core purpose:
Convert forward momentum into a controlled hesitation/deadening action and then relaunch efficiently without requiring a long stop-settle-restart sequence.

Structure approximately:
moving carry
→ controlled deaden/hesitation
→ body reorganizes
→ decisive push
→ D38 acceleration

Useful for:
sprint → hesitation → sprint
run → stop → new line
stop → explode
speed change
future defender manipulation

Compare against:
ordinary braking touch
full stop
gather → acceleration

It should not magically preserve momentum while supposedly stopping.

Its advantage should be:
better preparation for the subsequent push
earlier useful relaunch
ball already positioned for acceleration

D38 should govern the actual physical acceleration after the exit.
NO HARD PACE BUCKETS
Do not implement:
jog = V-turn
run = Croqueta
sprint = Matthews

etc.

Use:
current speed
ball geometry
support
desired exit
technique feasibility
predicted outcome

to determine which solution is appropriate.
BASIC SOLUTIONS MUST REMAIN
A player without an available advanced solution must still be able to use:
carry
inside/outside cut
hook
braking touch
gather
ordinary redirect

safely.

This is important for future Dribbling ratings.

Eventually:
lower Dribbling
→ advanced solution less feasible
→ basic solution wins

NOT:
lower Dribbling
→ attempt advanced move
→ randomly lose ball.

AUTO BEHAVIOR
These four are candidates for automatic Technical Control selection.

For now classify them provisionally as:
CROQUETA        AUTO + MANUAL
V-TURN          AUTO + MANUAL
MATTHEWS        AUTO + MANUAL
STOP-AND-GO     AUTO + MANUAL

But you may recommend a different classification after testing.

B4 should choose them only when their predicted football outcome genuinely beats the simpler alternatives.

No skill-move probability.

No random selection.
B5 / EARLY CONTROL RETURN
Apply the same lesson as Cruyff/Chop:

once the decisive manipulation has happened and a physically valid continuation exists:
return meaningful control quickly.

Do not hold the player until decorative animation recovery completes.

Measure:
request → decisive contact
decisive contact → useful exit
decisive contact → control returned

MULTIPLE ENTRY VARIANTS ARE NOT SEPARATE PLAYER-FACING MOVES
Follow the new Cruyff architecture.

If Croqueta/V-turn/etc. need:
abbreviated
running
low-speed
high-speed
alternate-support

entries, implement them internally.

The player-facing vocabulary should remain:
CROQUETA
V-TURN
MATTHEWS
STOP-AND-GO

Technical Control chooses the shortest valid physical entry.
DO NOT FORCE AN ADVANCED MOVE AFTER EXCESSIVE PREPARATION IN AUTO
Important distinction:

MANUAL request:

if the technique isn't immediately feasible but can be safely prepared, the player may preserve control, prepare, then execute it.

AUTO/B4:

preparation time is part of the score.

If:
Croqueta requires 0.8 s of setup

while:
ordinary redirect works immediately,

the ordinary redirect should generally win.

Do not make AUTO decide:
“Croqueta is elite, therefore brake until I can do it.”

REQUIRED COMPARISONS
Build direct 1× side-by-side comparisons:
CROQUETA
vs best ordinary lateral/diagonal solution

V-TURN
vs hook / braking redirect / drag-back

MATTHEWS
vs ordinary outside redirect

STOP-AND-GO
vs brake → settle → accelerate

Use identical entry states.

Show:
request → useful movement
ball trajectory
body trajectory
minimum speed
exit speed
control-return time
preparation time

TEST SPEEDS
Test each family across all physically relevant:
walk
jog
run
sprint

Do not require every move to work at every pace.

If a move is physically inappropriate at sprint:
reject it / score another solution higher.

Do not distort the body to make the catalogue larger.
CHAINING
Test at least:
Croqueta → accelerate
Croqueta → outside cut

V-turn → accelerate
V-turn → Croqueta

Matthews → outside exit → accelerate

Stop-and-go → D38 sprint
Stop-and-go → 45° exit

The decisive action should flow into the next action rather than completing a canned animation first.
INTEGRITY
Preserve:
CONTROLLED possession
no missed contacts
deterministic replay
ball simulation authority

Track:
foot jumps
leg crossings
knee pops
support discontinuities
ball/contact separation

Do not accept a faster technique if it introduces visibly broken legs.
DRIBBLING LAB
Update the review lab with a focused:
ADVANCED AUTO SOLUTIONS

section.

I want prominent cards for:
CROQUETA
V-TURN
MATTHEWS
STOP-AND-GO
CRUYFF
RONALDO CHOP

with:
PLAY
COMPARE
MIRROR
AUTO
TRY
1× / 0.5× / 0.25×

For each move, explain in one sentence:
Why is this better than the basic solution in this particular replay?

STOP FOR OWNER REVIEW
Do not add:
stepovers
elastico
roulette
defenders
Dribbling rating

in this pass.

Stop once these four technique families are robust enough for direct owner review.
TARGET
Add four genuinely useful advanced football solutions—not four new animations. Croqueta, V-turn, Matthews and Stop-and-Go should improve the player's ability to manipulate the ball in the same way Cruyff and Ronaldo Chop now improve on simpler hooks: better solutions when the state supports them, while ordinary techniques remain safe fallbacks.

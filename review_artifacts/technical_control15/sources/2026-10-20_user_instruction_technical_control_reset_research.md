# Owner instruction — 2026-10-20 (after TECHNICAL-CONTROL-1.4 was presented and visually reviewed), verbatim

Yes. I think we should stop telling Claude how to implement individual moves from our current assumptions. The latest result shows that the underlying action definitions are wrong.
The supposed Ronaldo chop is the clearest example. A proper Ronaldo chop is specifically a high-speed direction-change action where the inside of the striking foot chops the ball behind the opposite/front leg, and that opposite leg helps shield the ball from the defender. Multiple coaching references describe it as a rapid ~90° change of direction, though the exact exit can vary with approach and contact geometry. YouTube
More broadly, efficient protected dribbling is not simply “shortest geometric path for the ball.” Coaching guidance consistently emphasizes using the far foot, body between opponent and ball, low/side-on body position, and acceleration after the turn. Football Coach Hub
So I'd give Claude a research-first reset:
TECHNICAL CONTROL RESET — RESEARCH REAL PROTECTED/FAST DRIBBLING TECHNIQUES, THEN REBUILD THE ACTIONS
STOP implementing the current cut/chop assumptions.
TC1.4 has improved contact efficiency, but I have visually reviewed it and the actual football techniques are still wrong.
In particular:
The current action labelled "Ronaldo chop" is NOT a Ronaldo chop.

The ball remains exposed rather than being chopped tightly behind/across the opposite leg. Do not keep tuning this incorrect action.
Before changing implementation again, conduct a focused football-technique research phase.
Research objective
Research:
What are the fastest and most efficient ways elite footballers protect the ball while changing direction at speed?

I want the action library derived from real football biomechanics/technique rather than our current procedural assumptions.
Use:
- high-quality coaching sources;
- FIFA/FA/UEFA material where available;
- biomechanical/sports-science literature where useful;
- slow-motion professional footage;
- reputable technique demonstrations.
Separate what sources explicitly support from our own implementation/design decisions.
Research at minimum:
- outside-foot cut;
- inside-foot cut;
- Ronaldo chop;
- Cruyff turn;
- drag-back;
- hook turn;
- sole roll/drag;
- double touch / La Croqueta;
- body-feint + exit;
- protected forward carry.
For each technique determine:
useful incoming speed
useful direction-change range
ball position before action
support/standing foot
contact foot
contact surface
ball path relative to legs
body/COM movement
shielding relationship
number of authoritative ball contacts
preparation requirement
exit direction
exit acceleration
situations where technique is inappropriate

Protection is part of technique selection
We are currently optimizing too much for:
fastest path to requested direction

Add another fundamental objective:
BALL PROTECTION

A technically good action should try to keep:
player's body / leg

between:
likely pressure side

and:
ball

where the technique naturally permits it.
Even before real defenders are integrated, define the geometry correctly so this can later consume a defender/pressure vector.
Do not invent hidden tackle resistance.
Protection must emerge from actual:
ball position
leg position
body position

RONALDO CHOP — REBUILD FROM ZERO
Delete/supersede the current conceptual chop definition.
Research the real technique first.
The reference action is approximately:
player moving at speed

opposite/front leg travels across/in front of ball
↓
body commits through the action
↓
striking foot uses INSIDE surface
↓
ball is chopped BEHIND / ACROSS the opposite leg
↓
opposite leg/body shields the ball during the redirection
↓
player changes direction sharply
↓
immediate acceleration out

The ball should visibly travel through/across the player's stance behind the shielding leg.
If the ball remains outside and exposed throughout the action, it is not the move we want.
Do not call such an action a Ronaldo chop.
Ronaldo chop direction
Treat the Ronaldo chop primarily as a sharp ~90° high-speed direction-change technique.
Research how much practical variation exists around that.
I expect something conceptually like:
~70–110°
→ strong Ronaldo-chop territory

potentially somewhat beyond that depending on approach/body geometry.
Do not lock those numbers from this prompt. Research and visually calibrate them.
I am also open to the chop being useful for somewhat larger turns if the actual technique remains biomechanically/visually correct.
But do NOT stretch one Ronaldo-chop animation into 150–180° simply because the planner wants a large turn.
Use a different real technique when appropriate.
A 120°, 150° AND 180° TURN DO NOT NEED THE SAME MOVE
This is another conceptual correction.
Stop trying to make:
Ronaldo chop

our generic "large turn" solution.
Research the most efficient real football solutions by geometry.
We may end up with something approximately like:
modest direction change
→ outside/inside cut

sharp ~90° change at speed
→ Ronaldo chop where stance/foot geometry fits

larger reversal
→ Cruyff / hook / drag / other appropriate turn

full reversal
→ dedicated reversal technique

But derive the actual action map from research and visual testing.
EFFICIENCY ≠ FEWEST CONTACTS AT ALL COSTS
Another correction:
Do not optimize merely for:
minimum number of contacts

Optimize for:
fast
+
controlled
+
protected
+
biomechanically plausible
+
good exit

Sometimes one contact is optimal.
Sometimes two coordinated contacts are faster/safer than one exposed contact.
The key is:
No unnecessary contacts.

not:
Always minimize contacts mathematically.

BALL EXPOSURE METRIC
Add a provisional geometric protection diagnostic.
For every technique measure the ball relative to:
body centre
support leg
contact leg
hypothetical pressure direction

Build a simple visualization showing where an opponent approaching from:
front
left
right
rear-left
rear-right

would have a direct line to the ball.
Do NOT turn this into gameplay/tackle probability yet.
It is a technique diagnostic.
BUILD EACH ACTION AS AN AUTHORED FOOTBALL ACTION
For each researched technique define:
ENTRY
preparation/body setup

CONTACT
authoritative ball contact(s)

PROTECTION
body/leg relationship to ball

EXIT
body direction + acceleration + ball lane

Animation must represent the actual technique.
Do not start with a generic procedural leg target and then label the result "Cruyff" or "Ronaldo chop."
DRIBBLING RATING COMES AFTER THE TECHNIQUES ARE CORRECT
First build the 99 reference for every technique.
At:
BC99
D99
A99

each move should look like an elite footballer executing that real technique.
Only after those references are visually approved should Dribbling determine:
how late the action can be selected
how quickly the footwork can execute
which sophisticated actions are feasible
preparation requirement
recovery/continuation speed

Do not build rating curves around incorrect base techniques.
PRESERVE ATTRIBUTE RESPONSIBILITIES
Still:
Ball Control
→ precision of authoritative ball contact

Dribbling
→ technical execution speed / coordination / sophistication

Agility
→ body reorientation / braking / acceleration

FIRST DELIVERABLE IS RESEARCH + VISUAL SPEC, NOT CODE
Before rebuilding TC again, present a concise research-backed table:
TECHNIQUE
IDEAL USE
TURN RANGE
SPEED
CONTACT FOOT/SURFACE
BALL PATH
SHIELDING MECHANISM
CONTACT COUNT
BODY ACTION
EXIT

Then specifically provide a Ronaldo Chop action specification with diagrams/top-down vectors showing:
incoming player direction
standing/shielding leg path
striking-foot path
ball before contact
ball path THROUGH/BEHIND stance
body COM path
exit direction

THEN IMPLEMENT ONLY A SMALL VALIDATION SET
Once the research/spec is complete, implement only these elite 99 references:
45° efficient cut
90° Ronaldo chop
120° best researched technique
150° best researched technique
180° best researched reversal

Do not assume which technique handles 120/150/180 until the research is complete.
Show each at:
normal speed
0.5×
front 3/4
rear 3/4
side
top

RONALDO CHOP ACCEPTANCE TEST
For the 90° reference, I specifically want to see:
1. player approaching at useful speed;
2. shielding/opposite leg moves across/in front;
3. striking foot comes behind/across it;
4. inside of striking foot contacts ball;
5. ball visibly travels behind/across the shielding leg through the stance;
6. body blocks the obvious pressure line to the ball;
7. player lands/orients toward the new line;
8. immediate acceleration out.
If the ball simply gets kicked externally around the player's body, FAIL the action.
DO NOT EXPAND THE LIBRARY YET
Stop after the five elite reference turns.
I want to visually approve that we now understand the actual football techniques before we add ratings, styles or more moves.
Preserve the good TC1.2 carry work and TC1.3 transition/clearance work wherever compatible.
Do not preserve TC1.4's technique definitions merely for compatibility.
Football correctness takes priority over provisional implementation.

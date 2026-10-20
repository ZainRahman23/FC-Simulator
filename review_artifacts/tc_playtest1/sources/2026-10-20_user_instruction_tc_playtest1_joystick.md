PLAYTEST-1 — ADD CONTINUOUS ON-SCREEN MOVEMENT JOYSTICK
Add a large draggable virtual joystick to the existing PLAYTEST-1 dribbling sandbox.
Do not change the Technical Control simulation, technique resolver, ball physics, attributes, animations, or existing WASD behavior. This is an input/UI addition only.
Joystick UI
Place a virtual joystick on the left side of the gameplay screen, similar to a mobile football-game movement stick.
It should consist of:
outer circular movement area
+
draggable inner thumb stick

Make it large enough to control precisely with a mouse/trackpad.
It should remain visible during normal gameplay but be reasonably unobtrusive.
Interaction
I should be able to:
click/touch inside joystick
↓
drag in any direction
↓
player requests that movement direction continuously

Releasing the mouse/finger should return the stick to centre and produce:
movement input = zero

Support:
mouse
trackpad/pointer
touch

using pointer events where practical.
Capture the pointer while dragging so moving outside the joystick circle does not accidentally release control.
TRUE ANALOG DIRECTION
This is the main reason for adding it.
Do NOT quantize the joystick to:
N
NE
E
SE
S
SW
W
NW

Give Technical Control a continuous normalized 2D movement vector:
x = -1 ... +1
y = -1 ... +1

Therefore I can request:
7°
23°
41°
68°
97°
137°
etc.

The existing technical-action resolver should then determine how to satisfy that direction.
This is particularly important for testing whether our techniques behave as continuous football solutions rather than angle buckets.
STICK MAGNITUDE
Use distance from the centre as analog movement magnitude.
Conceptually:
centre
→ no movement

small displacement
→ walk / very low requested speed

medium displacement
→ jog/run

outer region
→ run

But do not automatically make the outer edge sprint for now.
Sprint should remain a separate intent because I need to be able to distinguish:
full directional input

from:
sprint requested

SPRINT CONTROL
Add a convenient on-screen:
SPRINT

button near the joystick.
While held:
joystick direction
+
SPRINT

should behave exactly like the corresponding existing:
Shift + WASD

sprint request.
Support mouse/touch hold.
Keep Shift working too.
OPTIONAL RUN/WALK CONTROL
If the current sandbox already distinguishes walk/run modes cleanly, expose those beside the joystick as well.
Do not redesign movement-speed mechanics for this task.
CAMERA-RELATIVE INPUT
The joystick should use the same movement-reference convention as WASD currently uses.
If WASD is camera-relative:
joystick up
= camera forward

If WASD is world-relative, match that instead.
Do not create different movement semantics between keyboard and joystick.
KEYBOARD + JOYSTICK
Keep WASD fully functional.
Only one movement source should author the effective movement vector at a time.
A sensible rule is:
most recently active input source wins

so I can seamlessly switch:
WASD
↔ joystick

without reloading.
Do not add the two vectors together.
VISUAL FEEDBACK
While dragging, show:
stick direction
stick magnitude
requested movement vector

Optionally show the exact angle:
73°

in the diagnostics HUD.
This is useful for testing technique selection.
IMPORTANT PLAYTEST USE
I specifically want to be able to:
sprint forward
↓
smoothly rotate joystick toward 30°
↓
45°
↓
60°
↓
75°
↓
90°

and observe how the Technical Control resolver changes its football solution.
Likewise I should be able to snap:
forward
→ 90° right

or:
forward
→ 150°

and test the elite cuts/turns naturally.
DO NOT TURN THE JOYSTICK INTO AN ANIMATION SELECTOR
The joystick only says:
I WANT TO MOVE THIS WAY

It does NOT say:
PLAY RONALDO CHOP

Technical Control remains responsible for choosing:
ordinary carry
outside cut
inside cut
Ronaldo chop
Cruyff
hook
drag-back
etc.

based on the actual football state.
REPLAY SUPPORT
Record the joystick's actual continuous input vector in the existing replay buffer.
When I press Q to replay the last technique, visualize the recorded stick position/vector alongside the existing input display.
Replaying the same joystick input history must reproduce the same authoritative result.
DEADZONE
Add a small central deadzone so tiny pointer movements don't make the player jitter.
Keep it small enough that fine movement remains possible.
Make the value visible in diagnostics/configuration rather than burying it.
NO GAMEPLAY CHANGES
Verify that equivalent inputs produce identical authoritative results:
WASD forward
vs
joystick exactly forward

WASD diagonal
vs
joystick equivalent normalized diagonal

where the requested vectors are equivalent.
The joystick must not modify:
Dribbling
Ball Control
Agility
technique scoring
touch timing
ball physics
player movement capability

DELIVERABLE
Update the existing:
tc_playtest1.html

rather than creating an unrelated sandbox.
Give me the updated local URL and a very short controls summary.
Do not freeze anything.
The goal is simply:
I can grab a joystick on the left side of the screen and continuously steer my 99/99/99 player through arbitrary angles, while Technical Control decides how the footballer actually manipulates the ball.

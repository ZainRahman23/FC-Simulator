STOP the current PLAYTEST-1.2R implementation work for a moment. Important correction about the baseline.
I just personally played the current tc_playtest1.html, and that is the bad/slower/jankier version I want to revert AWAY from.
So regardless of what the labels/version names say, do not treat the currently playable page as the baseline I approved.
I want to restore the playable state from immediately BEFORE my instruction:
“sometimes when you change direction too fast, the feet get tangled up or they lose control of the ball, fix this so it feels like 100% control”

In other words, restore the version that existed after the analog joystick had been implemented and verified, but before the rapid-direction-control / zero-loss replanning work.
The checkpoint I mean is the joystick implementation whose report said approximately:
joystick added to existing PLAYTEST-1
continuous analog angles
stick magnitude = walk/jog/run
separate sprint control
WASD ↔ joystick equivalence
Q replay records stick position

smooth sprint rotation 0→90° = ordinary carry corrections
held 60° sprint = outside cut
snap 90° sprint = Ronaldo chop
snap 150° sprint = drag-back
run 137° = inside hook

and was committed locally as:
88573ef0

Verify that commit/history rather than relying on the PLAYTEST-1.2 naming.
Restore that exact gameplay/controller/body behavior as the baseline, while keeping the joystick UI.
Call that:
BASELINE-88573ef0

or another unambiguous name.
Do NOT overwrite it again.
I want a direct playable URL where I can verify that this is actually the earlier version I remember.
IMPORTANT
Do not yet apply:
rapid-direction zero-loss replanning
stricter in-flight commitment changes
new landing constraints
body-zero rules
extra foot-order/gait constraints

from the later work.
First restore 88573ef0's actual behavior.
Preserve the analog joystick itself.
THEN
Once the historical baseline is restored and playable, continue the FC-responsive-dribbling research separately.
Any future experimental responsive version must be built beside this restored baseline, never on top of it:
RESTORED BASELINE
vs
RESPONSIVENESS EXPERIMENT

I need one-click A/B switching so I can always return to the known version.
Do not infer which version I preferred from labels like PLAYTEST-1.2. Use Git history/commit 88573ef0 and verify the actual relevant files/state.
Stop as soon as the restored baseline is playable and give me its URL so I can confirm it feels like the version I mean. Then resume the research/experimental branch only after that baseline is secured.

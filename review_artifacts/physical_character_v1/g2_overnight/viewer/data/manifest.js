window.FG_MANIFEST = {
 "scenarios": [
  {
   "title": "Late shortening at an identical state \u2014 inherited swing vs executor X",
   "desc": "The same body state, the same commanded step (0.27 m, width 0.29 m, single support 0.42 s), then the foothold moved 8 cm SHORTER 0.2 s into the step. Bench over 3 starts \u00d7 2 steps: the inherited swing lands \u2248 0.57 of the change (sd 0.4 cm), X \u2248 0.7 (sd 1.5 cm) \u2014 X re-plans from the actual foot and descends only once its plan has arrived; its outcome is less predictable, which is why it is not adopted.",
   "cols": [
    {
     "key": "swBase",
     "name": "Inherited walking swing (with yesterday's pelvis-rate internal model)"
    },
    {
     "key": "swX",
     "name": "Swing executor X (pc_swingx.js: re-planned from the actual foot, reach set, arrival-gated descent)"
    }
   ],
   "win": [
    -0.15,
    0.6
   ],
   "t0": 0.0,
   "runs": {
    "swBase": {
     "file": "swBase_R0.6.js",
     "anchor": 4.0542,
     "side": "R",
     "sub": "start R@0.6 \u00b7 step 4 (R) \u00b7 hash abcfdd8f",
     "caption": "liftoff 0.100 s \u00b7 touchdown 0.438 s at 1 of the swing"
    },
    "swX": {
     "file": "swX_R0.6.js",
     "anchor": 4.0542,
     "side": "R",
     "sub": "start R@0.6 \u00b7 step 4 (R) \u00b7 hash 402be688",
     "caption": "liftoff 0.108 s \u00b7 touchdown 0.400 s at 0.84 of the swing"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "A typical failing start (R@0.5) \u2014 the controller vs the oracle placement searches",
   "desc": "Left: the unified controller (best configuration of yesterday's review). Watch the stance foot after each heel strike: the CoP stays at the heel for 0.2\u20130.3 s while the body passes over it, so the body speeds up; once a step starts with the capture point ahead of the sole centre the steps cannot catch it (runaway). Middle: the MYOPIC ORACLE (a diagnostic, not a controller) \u2014 each step command chosen by trying a grid of commands in the deterministic simulator from the identical state and keeping the best next-step state; it lasts longer, then the same speed creep. Right: the DEPTH-2 BEAM ORACLE \u2014 each step chosen by its best two-step outcome; it holds the walk for its whole 28-step search (then the controller takes over and falls).",
   "vd": 0.5,
   "cols": [
    {
     "key": "ctrl",
     "name": "Unified controller (mU1 maps, continuous in-swing re-decision)"
    },
    {
     "key": "oracle",
     "name": "ORACLE, myopic (diagnostic: the simulator as a perfect model, best next-step state)"
    },
    {
     "key": "oracle2",
     "name": "ORACLE, depth-2 beam (diagnostic: best two-step outcome)"
    }
   ],
   "win": [
    -0.3,
    19.0
   ],
   "t0": -0.3,
   "runs": {
    "ctrl": {
     "file": "ctrl_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash db794057",
     "caption": "9 upright touchdowns \u00b7 forward speed (after the first quarter) 0.64 \u00b1 0.22 m/s \u00b7 falls at 7.22 s"
    },
    "oracle": {
     "file": "oracle_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash 3401b5a8",
     "caption": "17 upright touchdowns \u00b7 forward speed (after the first quarter) 0.62 \u00b1 0.18 m/s \u00b7 falls at 10.57 s"
    },
    "oracle2": {
     "file": "oracle2_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash a29a743c",
     "caption": "28 upright touchdowns \u00b7 forward speed (after the first quarter) 0.64 \u00b1 0.13 m/s \u00b7 falls at 19.52 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "The sustained start (L@0.6) \u2014 the controller vs the oracle placement searches",
   "desc": "The one start on which the controller walks all 40 steps of the test (the fall after the last step is the end of the test \u2014 stopping is not controlled). Middle / right: the myopic and the depth-2 beam oracle from the same start (diagnostics: the simulator as a perfect model).",
   "vd": 0.5,
   "cols": [
    {
     "key": "ctrl",
     "name": "Unified controller (mU1 maps, continuous in-swing re-decision)"
    },
    {
     "key": "oracle",
     "name": "ORACLE, myopic (diagnostic: the simulator as a perfect model, best next-step state)"
    },
    {
     "key": "oracle2",
     "name": "ORACLE, depth-2 beam (diagnostic: best two-step outcome)"
    }
   ],
   "win": [
    -0.3,
    22.45
   ],
   "t0": -0.3,
   "runs": {
    "ctrl": {
     "file": "ctrl_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash a634adce",
     "caption": "40 upright touchdowns \u00b7 forward speed (after the first quarter) 0.52 \u00b1 0.10 m/s \u00b7 falls at 23.07 s"
    },
    "oracle": {
     "file": "oracle_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash 98501fcb",
     "caption": "17 upright touchdowns \u00b7 forward speed (after the first quarter) 0.60 \u00b1 0.14 m/s \u00b7 falls at 11.25 s"
    },
    "oracle2": {
     "file": "oracle2_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash 8a884d34",
     "caption": "34 upright touchdowns \u00b7 forward speed (after the first quarter) 0.66 \u00b1 0.16 m/s \u00b7 falls at 20.67 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  }
 ]
};

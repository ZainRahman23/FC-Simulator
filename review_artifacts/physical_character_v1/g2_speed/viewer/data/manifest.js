window.FG_MANIFEST = {
 "scenarios": [
  {
   "title": "Full walk R@0.5",
   "desc": "The whole walk, same start, side by side. The top trace is the forward COM speed (dashed: 0.5 m/s, the regulated walk's target). Baseline: the speed creeps up until a step at the reach limit ends in a toe catch. Speed-regulated: the speed is held near the target for several steps \u2014 the walk still ends (by a stall or a runaway; see the failure tab).",
   "vd": 0.5,
   "cols": [
    {
     "key": "base",
     "name": "Baseline \u2014 Controller A (M8A), placement only"
    },
    {
     "key": "reg",
     "name": "Speed-regulated \u2014 capture-point tracking through the ground reaction + speed-derived target (0.5 m/s)"
    }
   ],
   "win": [
    -0.3,
    5.65
   ],
   "t0": -0.3,
   "runs": {
    "base": {
     "file": "base_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash 5780483c",
     "caption": "10 upright touchdowns \u00b7 forward speed (after the first quarter) 0.53 \u00b1 0.20 m/s \u00b7 falls at 6.17 s"
    },
    "reg": {
     "file": "reg_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash 6bac05a5",
     "caption": "6 upright touchdowns \u00b7 forward speed (after the first quarter) 0.48 \u00b1 0.21 m/s \u00b7 falls at 4.92 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed, then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "Full walk L@0.6",
   "desc": "The whole walk, same start, side by side. The top trace is the forward COM speed (dashed: 0.5 m/s, the regulated walk's target). Baseline: the speed creeps up until a step at the reach limit ends in a toe catch. Speed-regulated: the speed is held near the target for several steps \u2014 the walk still ends (by a stall or a runaway; see the failure tab).",
   "vd": 0.5,
   "cols": [
    {
     "key": "base",
     "name": "Baseline \u2014 Controller A (M8A), placement only"
    },
    {
     "key": "reg",
     "name": "Speed-regulated \u2014 capture-point tracking through the ground reaction + speed-derived target (0.5 m/s)"
    }
   ],
   "win": [
    -0.3,
    6.9167000000000005
   ],
   "t0": -0.3,
   "runs": {
    "base": {
     "file": "base_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash b373d22e",
     "caption": "12 upright touchdowns \u00b7 forward speed (after the first quarter) 0.81 \u00b1 0.31 m/s \u00b7 falls at 7.53 s"
    },
    "reg": {
     "file": "reg_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash 43fc16c5",
     "caption": "11 upright touchdowns \u00b7 forward speed (after the first quarter) 0.68 \u00b1 0.26 m/s \u00b7 falls at 7.53 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed, then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "The terminal failure",
   "desc": "Each walk's first swing that touched down early (or its last step). Baseline: the speed has crept to \u2248 0.8 m/s, the request sits at its 0.30 m bound, the trailing leg is straight and the toe meets the turf mid-swing. Regulated: the classifier attributes every fall to a time-infeasible swing (too much travel for the air time) or to a stall.",
   "vd": 0.5,
   "cols": [
    {
     "key": "base",
     "name": "Baseline \u2014 Controller A (M8A), placement only"
    },
    {
     "key": "reg",
     "name": "Speed-regulated \u2014 capture-point tracking through the ground reaction + speed-derived target (0.5 m/s)"
    }
   ],
   "win": [
    -0.5,
    0.7
   ],
   "t0": 0.0,
   "runs": {
    "base": {
     "file": "base_R0.5.js",
     "anchor": 5.6375,
     "side": "R",
     "sub": "start R@0.5 \u00b7 step 8 (R)",
     "caption": "touchdown at 0.57 of the planned swing"
    },
    "reg": {
     "file": "reg_R0.5.js",
     "anchor": 4.4,
     "side": "L",
     "sub": "start R@0.5 \u00b7 step 5 (L)",
     "caption": "touchdown at 0.65 of the planned swing"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed, then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "Swing: identical requests",
   "desc": "The same open-loop request (no controller decisions) through three swing executions. Watch the swing foot in the close-up and the toe-clearance trace: the existing swing lags then lands \u2248 7 cm past its target (its trajectory runs 50 ms behind real time); the late delay compensation lands \u2248 3 cm past; the generic swing anchors at the measured liftoff but starts from rest and lags.",
   "cols": [
    {
     "key": "swOld",
     "name": "Existing swing (clocked from the step start, 50 ms behind real time)"
    },
    {
     "key": "swLead",
     "name": "Existing swing + late delay compensation (walk.swingLead \"late\")"
    },
    {
     "key": "swGen",
     "name": "Generic swing (pc_swing.js, liftoff-anchored, delay-led) \u2014 not adopted"
    }
   ],
   "win": [
    -0.15,
    0.55
   ],
   "t0": 0.0,
   "runs": {
    "swOld": {
     "file": "swOld_R0.5.js",
     "anchor": 2.0917,
     "side": "L",
     "sub": "open loop: every step commanded 0.28 m forward, 0.26 m wide, T 0.42 s \u00b7 step 1",
     "caption": "liftoff 0.100 s after the step start \u00b7 touchdown 0.429 s at 0.92 of the swing"
    },
    "swLead": {
     "file": "swLead_R0.5.js",
     "anchor": 2.0625,
     "side": "L",
     "sub": "open loop: every step commanded 0.28 m forward, 0.26 m wide, T 0.42 s \u00b7 step 1",
     "caption": "liftoff 0.104 s after the step start \u00b7 touchdown 0.396 s at 0.97 of the swing"
    },
    "swGen": {
     "file": "swGen_R0.5.js",
     "anchor": 2.0292,
     "side": "L",
     "sub": "open loop: every step commanded 0.28 m forward, 0.26 m wide, T 0.42 s \u00b7 step 1",
     "caption": "liftoff 0.079 s after the step start \u00b7 touchdown 0.388 s at 0.98 of the swing"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed, then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  }
 ]
};

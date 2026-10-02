window.FG_MANIFEST = {
 "scenarios": [
  {
   "title": "Sustained walk \u2014 start L@0.6",
   "desc": "The same start, side by side. The unified controller walks all 40 steps of the test at a steady \u2248 0.5 m/s (steps 0.25\u20130.28 m); the old walker's speed creeps up until a step at its reach limit ends in a toe catch. (The test's 40 steps end at \u2248 22 s; stopping is not controlled yet \u2014 G2c \u2014 so the fall after the last step is the end of the test, not a walking failure.)",
   "vd": 0.5,
   "cols": [
    {
     "key": "base",
     "name": "Controller A (the G2b walker, M8A maps) \u2014 placement only, its target a \u2248 0.63 m/s state"
    },
    {
     "key": "uni",
     "name": "Unified controller \u2014 one target from vd 0.5: stance orbit (funnel) + double-support target + joint map placement under this inner loop, internal-model swing"
    }
   ],
   "win": [
    -0.3,
    22.45
   ],
   "t0": -0.3,
   "runs": {
    "base": {
     "file": "base_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash 8fa017c",
     "caption": "12 upright touchdowns \u00b7 forward speed (after the first quarter) 0.81 \u00b1 0.31 m/s \u00b7 falls at 7.53 s"
    },
    "uni": {
     "file": "uni_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash 9584c432",
     "caption": "40 upright touchdowns \u00b7 forward speed (after the first quarter) 0.52 \u00b1 0.10 m/s \u00b7 falls at 23.07 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "A typical start \u2014 R@0.5",
   "desc": "The other five starts end the unified walk after 6\u201311 steps: a short / long step pair around steps 3\u20136 starts a forward runaway (or a stall), and the late corrections the controller asks for cannot be executed by the swing. This is the open problem.",
   "vd": 0.5,
   "cols": [
    {
     "key": "base",
     "name": "Controller A (the G2b walker, M8A maps) \u2014 placement only, its target a \u2248 0.63 m/s state"
    },
    {
     "key": "uni",
     "name": "Unified controller \u2014 one target from vd 0.5: stance orbit (funnel) + double-support target + joint map placement under this inner loop, internal-model swing"
    }
   ],
   "win": [
    -0.3,
    6.699999999999999
   ],
   "t0": -0.3,
   "runs": {
    "base": {
     "file": "base_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash 806de82f",
     "caption": "10 upright touchdowns \u00b7 forward speed (after the first quarter) 0.53 \u00b1 0.20 m/s \u00b7 falls at 6.17 s"
    },
    "uni": {
     "file": "uni_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash adf10f2f",
     "caption": "9 upright touchdowns \u00b7 forward speed (after the first quarter) 0.64 \u00b1 0.22 m/s \u00b7 falls at 7.22 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "Swing delay \u2014 matched state",
   "desc": "Identical body state and request (Controller A's own step 4 from R@0.6). Left: the inherited swing \u2014 its hip velocity target uses the 50 ms-old pelvis pitch rate; the pelvis pitches in reaction to the hip's own torque, so the foot runs ahead of its command (up to 7.7 cm) and lands 6.4 cm long. Right: the same swing with the internal forward model of the pelvis rate (learned online from the delayed measurements, realistic latency kept): +1.0 cm.",
   "cols": [
    {
     "key": "swOld",
     "name": "Inherited swing (delayed pelvis rate in the velocity target)"
    },
    {
     "key": "swModel",
     "name": "Internal-model swing (expected pelvis pitch rate at the command's phase)"
    }
   ],
   "win": [
    -0.15,
    0.6
   ],
   "t0": 0.0,
   "runs": {
    "swOld": {
     "file": "swOld_R0.6.js",
     "anchor": 3.8417,
     "side": "R",
     "sub": "start R@0.6 \u00b7 step 4 (R) \u00b7 hash 4772230b",
     "caption": "liftoff 0.067 s \u00b7 touchdown 0.408 s at 0.94 of the swing"
    },
    "swModel": {
     "file": "swModel_R0.6.js",
     "anchor": 3.8417,
     "side": "R",
     "sub": "start R@0.6 \u00b7 step 4 (R) \u00b7 hash bfbee7a9",
     "caption": "liftoff 0.067 s \u00b7 touchdown 0.421 s at 0.97 of the swing"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "Late lengthening (+8 cm at 0.2 s) \u2014 matched state",
   "desc": "Identical state, the same step commanded, then its foothold moved 8 cm forward 0.2 s into the step. Left: the inherited descent runs on its clock \u2014 the foot (trailing its path by a few cm) reaches the turf 5 cm short. Right: the arrival-gated descent holds a 5 cm floor until the foot is within 4 cm of its landing point: +0.8 cm. A late SHORTENING is still executed only \u2248 40 % (the foot's momentum carries it past).",
   "cols": [
    {
     "key": "rtBase",
     "name": "Inherited descent (on the swing's clock)"
    },
    {
     "key": "rtGate",
     "name": "Arrival-gated descent (opt-in descentGate)"
    }
   ],
   "win": [
    -0.15,
    0.6
   ],
   "t0": 0.0,
   "runs": {
    "rtBase": {
     "file": "rtBase_R0.5.js",
     "anchor": 3.3667,
     "side": "L",
     "sub": "start R@0.5 \u00b7 step 3 (L) \u00b7 hash 1921bff1",
     "caption": "liftoff 0.117 s \u00b7 touchdown 0.392 s at 0.94 of the swing"
    },
    "rtGate": {
     "file": "rtGate_R0.5.js",
     "anchor": 3.3667,
     "side": "L",
     "sub": "start R@0.5 \u00b7 step 3 (L) \u00b7 hash 16c505a1",
     "caption": "liftoff 0.117 s \u00b7 touchdown 0.504 s at 1 of the swing"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  }
 ]
};

window.FG_MANIFEST = {
 "scenarios": [
  {
   "title": "1 \u00b7 The oracle's fragility \u2014 the SAME depth-2 search, L@0.6",
   "desc": "Both columns are the depth-2 beam oracle (the simulator as a perfect model; three best first steps each followed by a search of the next). Left: commands committed exactly. Right: the committed foothold rounded to 0.1 mm (yesterday's engine) \u2014 this reproduces yesterday's 34 steps bit for bit. The two walks share every decision up to step 4; a 0.1 mm difference then decides between 13 and 34 upright steps. The long walks of the oracle are a fragile path, not a robust strategy.",
   "vd": 0.5,
   "cols": [
    {
     "key": "exact",
     "name": "Depth-2 beam oracle, exact commits"
    },
    {
     "key": "round",
     "name": "Depth-2 beam oracle, commits rounded to 0.1 mm (= yesterday's 34)"
    }
   ],
   "win": [
    -0.3,
    20.049999999999997
   ],
   "t0": -0.3,
   "runs": {
    "exact": {
     "file": "beamExact_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash eea420f7",
     "caption": "13 upright touchdowns \u00b7 forward speed (after the first quarter) 0.50 \u00b1 0.13 m/s \u00b7 falls at 10.52 s"
    },
    "round": {
     "file": "beamRound_L0.6.js",
     "anchor": 1.6,
     "side": "L",
     "follow": true,
     "sub": "start L@0.6 \u00b7 hash f457ce42",
     "caption": "34 upright touchdowns \u00b7 forward speed (after the first quarter) 0.66 \u00b1 0.16 m/s \u00b7 falls at 20.67 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "2 \u00b7 What the good oracle preserves \u2014 R@0.5: the controller vs the best oracle (Gu)",
   "desc": "Left: the unified controller \u2014 it walks a short, quick gait (double support \u2248 0.21 s, the COM \u2248 19 cm behind the landing foot at touchdown) and creeps faster stride after stride until it cannot catch itself. Right: the best oracle (two steps ahead, candidates = the controller's own decision \u00b1 offsets \u222a the speed-scaled nominal gait) \u2014 long commanded steps (\u2248 0.35 m), a long braking double support (\u2248 0.30 s, the COM \u2248 25 cm behind the landing foot at touchdown), the capture point at the step start held at \u2248 0 \u00b1 3 cm, and a much slower speed drift (+0.016 m/s per stride vs +0.035\u20130.040 for searches around the controller's own decision) \u2014 slower, not zero. On this start it holds all 40 searched steps (including a recovery from a 0.69 m/s excursion at steps 9\u201312); after the search horizon the controller takes over and the walk ends a few steps later. On L@0.6 the same search crept and collapsed after 29 \u2014 not yet robust.",
   "vd": 0.5,
   "cols": [
    {
     "key": "ctrl",
     "name": "Unified controller"
    },
    {
     "key": "gu",
     "name": "ORACLE Gu (depth 2, nominal \u222a feedback candidates; 40 searched steps)"
    }
   ],
   "win": [
    -0.3,
    26.55
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
    "gu": {
     "file": "gu40_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 hash 69032d39",
     "caption": "45 upright touchdowns \u00b7 forward speed (after the first quarter) 0.62 \u00b1 0.12 m/s \u00b7 falls at 27.07 s"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  },
  {
   "title": "3 \u00b7 The Physical Stepper live (held-out) \u2014 R@0.6",
   "desc": "Right: the opt-in Physical Stepper deciding in the controller from the feedback view \u2014 a quadratic surrogate (trained on the oracle data of the OTHER five starts) predicts each candidate's next step start; two transitions searched, the first executed; each step's support contact event is classified from the sensed touchdown (ACHIEVED / MISSED; the step interrupted by the fall stays EXECUTING \u2014 history is not repaired). Its prediction error (\u2248 4 cm median on the capture point) is larger than the margins it must choose between; it walks no better than the controller.",
   "vd": 0.5,
   "cols": [
    {
     "key": "ctrl",
     "name": "Unified controller"
    },
    {
     "key": "stepper",
     "name": "Physical Stepper (horizon 2, surrogate held out from this start)"
    }
   ],
   "win": [
    -0.3,
    7.8833
   ],
   "t0": -0.3,
   "runs": {
    "ctrl": {
     "file": "ctrl_R0.6.js",
     "anchor": 1.6,
     "side": "R",
     "follow": true,
     "sub": "start R@0.6 \u00b7 hash 62df2a60",
     "caption": "11 upright touchdowns \u00b7 forward speed (after the first quarter) 0.53 \u00b1 0.14 m/s \u00b7 falls at 7.82 s"
    },
    "stepper": {
     "file": "stepper_R0.6.js",
     "anchor": 1.6,
     "side": "R",
     "follow": true,
     "sub": "start R@0.6 \u00b7 hash a4f22d59",
     "caption": "13 upright touchdowns \u00b7 forward speed (after the first quarter) 0.49 \u00b1 0.09 m/s \u00b7 falls at 8.50 s \u00b7 contact events ACHIEVED 10, MISSED 2, EXECUTING 1"
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; an outline turns green when that foot carries > 5 % BW). Traces: forward COM speed (dashed: the requested 0.5 m/s), then the focus foot's heel height, toe clearance, ankle plantar-flexion torque (dashed \u00b1150 N\u00b7m) and vertical load; \u25b2 liftoff, \u25bc touchdown. All runs are deterministic replays."
  }
 ]
};

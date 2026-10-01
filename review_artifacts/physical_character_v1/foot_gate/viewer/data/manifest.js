window.FG_MANIFEST = {
 "scenarios": [
  {
   "title": "Ordinary step",
   "desc": "An ordinary step from a MATCHED state: for each foot, the identification transition closest to a 0.24 m previous step at 0.45 m/s (same dithered Controller-A design, every transition kept). Time 0 = the trailing foot's swing start. Watch the trailing foot's late stance, toe-off and swing.",
   "win": [
    -0.45,
    0.6
   ],
   "t0": 0.0,
   "runs": {
    "F0": {
     "file": "ident_F0_i65.js",
     "anchor": 2.6625,
     "side": "R",
     "sub": "identification run 65 (seed 72, own round-1 maps), step 2: previous step 0.238 m, speed 0.44 m/s",
     "caption": "late stance: heel up to 13.0 cm \u00b7 ankle \u03c4 peak 134 N\u00b7m\nliftoff: hindfoot pitch -26\u00b0 (\u2212 = toes down)\nswing: min toe clearance 4.5 cm \u00b7 airborne 0.25 s \u00b7 touchdown at 0.97 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F1": {
     "file": "ident_F1_i24.js",
     "anchor": 2.6083,
     "side": "R",
     "sub": "identification run 24 (seed 72, own round-1 maps), step 2: previous step 0.240 m, speed 0.45 m/s",
     "caption": "late stance: heel up to 3.4 cm \u00b7 ankle \u03c4 peak 117 N\u00b7m\nliftoff: hindfoot pitch -5\u00b0 (\u2212 = toes down)\nswing: min toe clearance 7.1 cm \u00b7 airborne 0.26 s \u00b7 touchdown at 0.97 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F2": {
     "file": "ident_F2_i56.js",
     "anchor": 2.2375,
     "side": "R",
     "sub": "identification run 56 (seed 72, own round-1 maps), step 2: previous step 0.241 m, speed 0.45 m/s",
     "caption": "late stance: heel up to 5.1 cm \u00b7 ankle \u03c4 peak 109 N\u00b7m \u00b7 MTP peak 10\u00b0\nliftoff: hindfoot pitch -10\u00b0 (\u2212 = toes down)\nswing: min toe clearance 3.9 cm \u00b7 airborne 0.29 s \u00b7 touchdown at 0.93 of the planned swing\noutcome: swing completed, but down within two steps",
     "verdict": {
      "cls": "bad",
      "txt": "swing completed, but down within two steps"
     }
    },
    "F2h": {
     "file": "ident_F2h_i428.js",
     "anchor": 2.2667,
     "side": "R",
     "sub": "identification run 428 (seed 72, own round-1 maps), step 2: previous step 0.242 m, speed 0.47 m/s",
     "caption": "late stance: heel up to 5.0 cm \u00b7 ankle \u03c4 peak 117 N\u00b7m \u00b7 MTP peak 9\u00b0\nliftoff: hindfoot pitch -15\u00b0 (\u2212 = toes down)\nswing: min toe clearance 7.5 cm \u00b7 airborne 0.29 s \u00b7 touchdown at 0.98 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  },
  {
   "title": "Long step",
   "desc": "A LONG step from a matched state: the transition closest to a 0.40 m previous step at 0.62 m/s. Time 0 = the trailing (rear) foot's swing start; the long step it must recover from has just landed. At this state F0 fails 29 % of swings, F1 20 %, F2 99 %, F2h 35 % (state cells, n 84\u2013132).",
   "win": [
    -0.5,
    0.55
   ],
   "t0": 0.0,
   "runs": {
    "F0": {
     "file": "ident_F0_i363.js",
     "anchor": 3.125,
     "side": "L",
     "sub": "identification run 363 (seed 72, own round-1 maps), step 3: previous step 0.391 m, speed 0.61 m/s",
     "caption": "late stance: heel up to 16.5 cm \u00b7 ankle \u03c4 peak 141 N\u00b7m\nliftoff: hindfoot pitch -27\u00b0 (\u2212 = toes down)\nswing: min toe clearance 2.2 cm \u00b7 airborne 0.26 s \u00b7 touchdown at 0.94 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F1": {
     "file": "ident_F1_i594.js",
     "anchor": 4.05,
     "side": "L",
     "sub": "identification run 594 (seed 72, own round-1 maps), step 5: previous step 0.401 m, speed 0.61 m/s",
     "caption": "late stance: heel up to 9.3 cm \u00b7 ankle \u03c4 peak 146 N\u00b7m\nliftoff: hindfoot pitch -26\u00b0 (\u2212 = toes down)\nswing: min toe clearance 8.0 cm \u00b7 airborne 0.30 s \u00b7 touchdown at 1.00 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F2": {
     "file": "ident_F2_i360.js",
     "anchor": 2.6958,
     "side": "L",
     "sub": "identification run 360 (seed 72, own round-1 maps), step 3: previous step 0.395 m, speed 0.61 m/s",
     "caption": "late stance: heel up to 25.4 cm \u00b7 ankle \u03c4 peak 115 N\u00b7m \u00b7 MTP peak 23\u00b0\nliftoff: hindfoot pitch -44\u00b0 (\u2212 = toes down)\nswing: re-contact almost at once \u00b7 airborne 0.00 s \u00b7 touchdown at 0.53 of the planned swing\noutcome: swing FAILED",
     "verdict": {
      "cls": "bad",
      "txt": "swing FAILED"
     }
    },
    "F2h": {
     "file": "ident_F2h_i152.js",
     "anchor": 2.7333,
     "side": "L",
     "sub": "identification run 152 (seed 72, own round-1 maps), step 3: previous step 0.401 m, speed 0.65 m/s",
     "caption": "late stance: heel up to 15.5 cm \u00b7 ankle \u03c4 peak 131 N\u00b7m \u00b7 MTP peak 24\u00b0\nliftoff: hindfoot pitch -35\u00b0 (\u2212 = toes down)\nswing: min toe clearance 4.2 cm \u00b7 airborne 0.24 s \u00b7 touchdown at 0.81 of the planned swing\noutcome: swing completed, but down within two steps",
     "verdict": {
      "cls": "bad",
      "txt": "swing completed, but down within two steps"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  },
  {
   "title": "Heel rise / late stance",
   "desc": "The same long-step runs, zoomed on the trailing foot's LATE STANCE: time 0 = its liftoff. Rigid feet pivot on their front edge (F0 0.28 m, F1 0.20 m ahead of the ankle); the articulated foot rolls over its MTP (0.15 m) with the toe flat. Compare heel height, ankle torque (dashed line = the 150 N\u00b7m limit) and the hindfoot pitch at liftoff.",
   "win": [
    -0.45,
    0.12
   ],
   "t0": -0.2,
   "runs": {
    "F0": {
     "file": "ident_F0_i363.js",
     "anchor": 3.275,
     "side": "L",
     "sub": "identification run 363 (seed 72, own round-1 maps), step 3: previous step 0.391 m, speed 0.61 m/s",
     "caption": "late stance: heel up to 16.5 cm \u00b7 ankle \u03c4 peak 141 N\u00b7m\nliftoff: hindfoot pitch -27\u00b0 (\u2212 = toes down)\nswing: min toe clearance 2.2 cm \u00b7 airborne 0.26 s \u00b7 touchdown at 0.94 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F1": {
     "file": "ident_F1_i594.js",
     "anchor": 4.1417,
     "side": "L",
     "sub": "identification run 594 (seed 72, own round-1 maps), step 5: previous step 0.401 m, speed 0.61 m/s",
     "caption": "late stance: heel up to 9.3 cm \u00b7 ankle \u03c4 peak 146 N\u00b7m\nliftoff: hindfoot pitch -26\u00b0 (\u2212 = toes down)\nswing: min toe clearance 8.0 cm \u00b7 airborne 0.30 s \u00b7 touchdown at 1.00 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F2": {
     "file": "ident_F2_i360.js",
     "anchor": 2.9,
     "side": "L",
     "sub": "identification run 360 (seed 72, own round-1 maps), step 3: previous step 0.395 m, speed 0.61 m/s",
     "caption": "late stance: heel up to 25.4 cm \u00b7 ankle \u03c4 peak 115 N\u00b7m \u00b7 MTP peak 23\u00b0\nliftoff: hindfoot pitch -44\u00b0 (\u2212 = toes down)\nswing: re-contact almost at once \u00b7 airborne 0.00 s \u00b7 touchdown at 0.53 of the planned swing\noutcome: swing FAILED",
     "verdict": {
      "cls": "bad",
      "txt": "swing FAILED"
     }
    },
    "F2h": {
     "file": "ident_F2h_i152.js",
     "anchor": 2.825,
     "side": "L",
     "sub": "identification run 152 (seed 72, own round-1 maps), step 3: previous step 0.401 m, speed 0.65 m/s",
     "caption": "late stance: heel up to 15.5 cm \u00b7 ankle \u03c4 peak 131 N\u00b7m \u00b7 MTP peak 24\u00b0\nliftoff: hindfoot pitch -35\u00b0 (\u2212 = toes down)\nswing: min toe clearance 4.2 cm \u00b7 airborne 0.24 s \u00b7 touchdown at 0.81 of the planned swing\noutcome: swing completed, but down within two steps",
     "verdict": {
      "cls": "bad",
      "txt": "swing completed, but down within two steps"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  },
  {
   "title": "Toe-scuff failure",
   "desc": "The EXACT failure of the current walker: Controller A (F0's maps) from start R@0.5. F0's speed creeps from step 7 (speed error +0.03 \u2192 +0.15 \u2192 +0.44 m/s); the forward foothold request sits at its 0.30 m bound; the achieved step is 0.35\u20130.43 m; the next swing starts from a fully straight trailing leg (100 %) and the toe meets the turf at 57 % of the swing. The other feet, under the same maps, reach the same failure sooner (F0's maps mis-predict their stance dynamics). Time 0 = the failing swing's start.",
   "win": [
    -0.5,
    0.7
   ],
   "t0": 0.0,
   "runs": {
    "F0": {
     "file": "walk_same_F0_R0.5.js",
     "anchor": 5.6375,
     "side": "R",
     "sub": "Controller A with F0's maps (Part 1), start R@0.5 \u2014 step 8, the first swing that touched down early",
     "caption": "late stance: heel up to 18.8 cm \u00b7 ankle \u03c4 peak 150 N\u00b7m\nliftoff: hindfoot pitch -36\u00b0 (\u2212 = toes down)\nswing: min toe clearance 1.6 cm \u00b7 airborne 0.10 s \u00b7 touchdown at 0.57 of the planned swing",
     "verdict": {
      "cls": "bad",
      "txt": "touchdown at 0.57 of the swing"
     }
    },
    "F1": {
     "file": "walk_same_F1_R0.5.js",
     "anchor": 3.2417,
     "side": "L",
     "sub": "Controller A with F0's maps (Part 1), start R@0.5 \u2014 step 3, the first swing that touched down early",
     "caption": "late stance: heel up to 13.4 cm \u00b7 ankle \u03c4 peak 150 N\u00b7m\nliftoff: hindfoot pitch -35\u00b0 (\u2212 = toes down)\nswing: min toe clearance 4.5 cm \u00b7 airborne 0.21 s \u00b7 touchdown at 0.77 of the planned swing",
     "verdict": {
      "cls": "bad",
      "txt": "touchdown at 0.77 of the swing"
     }
    },
    "F2": {
     "file": "walk_same_F2_R0.5.js",
     "anchor": 3.1542,
     "side": "R",
     "sub": "Controller A with F0's maps (Part 1), start R@0.5 \u2014 step 4, the first swing that touched down early",
     "caption": "late stance: heel up to 15.4 cm \u00b7 ankle \u03c4 peak 125 N\u00b7m \u00b7 MTP peak 23\u00b0\nliftoff: hindfoot pitch -29\u00b0 (\u2212 = toes down)\nswing: min toe clearance 1.0 cm \u00b7 airborne 0.15 s \u00b7 touchdown at 0.67 of the planned swing",
     "verdict": {
      "cls": "bad",
      "txt": "touchdown at 0.67 of the swing"
     }
    },
    "F2h": {
     "file": "walk_same_F2h_R0.5.js",
     "anchor": 3.2208,
     "side": "R",
     "sub": "Controller A with F0's maps (Part 1), start R@0.5 \u2014 step 4, the first swing that touched down early",
     "caption": "late stance: heel up to 16.3 cm \u00b7 ankle \u03c4 peak 130 N\u00b7m \u00b7 MTP peak 21\u00b0\nliftoff: hindfoot pitch -30\u00b0 (\u2212 = toes down)\nswing: min toe clearance 1.7 cm \u00b7 airborne 0.30 s \u00b7 touchdown at 0.80 of the planned swing",
     "verdict": {
      "cls": "bad",
      "txt": "touchdown at 0.80 of the swing"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  },
  {
   "title": "Maximum viable step",
   "desc": "The MAXIMUM viable step at a matched speed (0.55\u20130.75 m/s): of all transitions that continued (swing completed AND upright two steps later), the 95th-percentile previous-step length \u2014 F0 0.42 m, F1 0.39 m, F2 0.32 m, F2h 0.38 m (continuation after steps \u2265 0.40 m: F0 59 %, F1 38 %, F2 0 %, F2h 21 %). Each column replays the transition nearest that length. Time 0 = the trailing foot's swing start.",
   "win": [
    -0.5,
    0.6
   ],
   "t0": 0.0,
   "runs": {
    "F0": {
     "file": "ident_F0_i146.js",
     "anchor": 3.7,
     "side": "R",
     "sub": "identification run 146 (seed 72, own round-1 maps), step 4: previous step 0.417 m, speed 0.71 m/s",
     "caption": "late stance: heel up to 12.2 cm \u00b7 ankle \u03c4 peak 136 N\u00b7m\nliftoff: hindfoot pitch -23\u00b0 (\u2212 = toes down)\nswing: min toe clearance 5.2 cm \u00b7 airborne 0.33 s \u00b7 touchdown at 0.91 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F1": {
     "file": "ident_F1_i268.js",
     "anchor": 5.2833,
     "side": "L",
     "sub": "identification run 268 (seed 72, own round-1 maps), step 7: previous step 0.386 m, speed 0.69 m/s",
     "caption": "late stance: heel up to 7.2 cm \u00b7 ankle \u03c4 peak 139 N\u00b7m\nliftoff: hindfoot pitch -23\u00b0 (\u2212 = toes down)\nswing: min toe clearance 5.0 cm \u00b7 airborne 0.28 s \u00b7 touchdown at 1.00 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F2": {
     "file": "ident_F2_i348.js",
     "anchor": 2.2583,
     "side": "R",
     "sub": "identification run 348 (seed 72, own round-1 maps), step 2: previous step 0.319 m, speed 0.68 m/s",
     "caption": "late stance: heel up to 6.1 cm \u00b7 ankle \u03c4 peak 116 N\u00b7m \u00b7 MTP peak 11\u00b0\nliftoff: hindfoot pitch -14\u00b0 (\u2212 = toes down)\nswing: min toe clearance 4.9 cm \u00b7 airborne 0.30 s \u00b7 touchdown at 0.94 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    },
    "F2h": {
     "file": "ident_F2h_i322.js",
     "anchor": 2.5708,
     "side": "L",
     "sub": "identification run 322 (seed 72, own round-1 maps), step 3: previous step 0.379 m, speed 0.67 m/s",
     "caption": "late stance: heel up to 10.3 cm \u00b7 ankle \u03c4 peak 111 N\u00b7m \u00b7 MTP peak 10\u00b0\nliftoff: hindfoot pitch -19\u00b0 (\u2212 = toes down)\nswing: min toe clearance 4.0 cm \u00b7 airborne 0.24 s \u00b7 touchdown at 0.91 of the planned swing\noutcome: continued",
     "verdict": {
      "cls": "good",
      "txt": "continued"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  },
  {
   "title": "Controller-A walk \u2014 own maps",
   "desc": "Part 2 (the SEPARATED recalibration): each foot walks with Controller A fitted to ITS OWN identification data (round 2) and its own measured first step; the controller structure, bounds and inner loop are unchanged. Start R@0.5 for every foot. Six-start means: F0 9.5, F1 5.0, F2 5.0, F2h 6.2 upright steps (F0 with its reference maps: 11.2).",
   "win": [
    -0.3,
    7.1667000000000005
   ],
   "t0": -0.3,
   "runs": {
    "F0": {
     "file": "walk_own_F0_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 11 upright steps (fell at 7.67 s) \u00b7 six starts: mean 9.5, 6\u201312",
     "caption": "walking speed 0.47 m/s \u00b7 WBAM range 0.049 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.029 N\u00b7s",
     "verdict": {
      "cls": "good",
      "txt": "11 steps"
     }
    },
    "F1": {
     "file": "walk_own_F1_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 5 upright steps (fell at 4.10 s) \u00b7 six starts: mean 5.0, 5\u20135",
     "caption": "walking speed 0.37 m/s \u00b7 WBAM range 0.063 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.024 N\u00b7s",
     "verdict": {
      "cls": "bad",
      "txt": "5 steps"
     }
    },
    "F2": {
     "file": "walk_own_F2_R0.5.js",
     "anchor": 1.1042,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 6 upright steps (fell at 4.12 s) \u00b7 six starts: mean 5.0, 4\u20136",
     "caption": "walking speed 0.54 m/s \u00b7 WBAM range 0.079 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.035 N\u00b7s",
     "verdict": {
      "cls": "bad",
      "txt": "6 steps"
     }
    },
    "F2h": {
     "file": "walk_own_F2h_R0.5.js",
     "anchor": 1.1,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 7 upright steps (fell at 4.55 s) \u00b7 six starts: mean 6.2, 5\u20137",
     "caption": "walking speed 0.64 m/s \u00b7 WBAM range 0.058 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.046 N\u00b7s",
     "verdict": {
      "cls": "bad",
      "txt": "7 steps"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  },
  {
   "title": "Controller-A walk \u2014 F0's maps",
   "desc": "Part 1 (the EQUIVALENT controller): every foot walks with F0's Controller A (maps m8a), start R@0.5. Six-start means: F0 11.2, F1 4.0, F2 4.3, F2h 5.3 upright steps.",
   "win": [
    -0.3,
    5.65
   ],
   "t0": -0.3,
   "runs": {
    "F0": {
     "file": "walk_same_F0_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 10 upright steps (fell at 6.16 s) \u00b7 six starts: mean 11.2, 9\u201313",
     "caption": "walking speed 0.45 m/s \u00b7 WBAM range 0.050 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.038 N\u00b7s",
     "verdict": {
      "cls": "good",
      "txt": "10 steps"
     }
    },
    "F1": {
     "file": "walk_same_F1_R0.5.js",
     "anchor": 1.5,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 4 upright steps (fell at 3.80 s) \u00b7 six starts: mean 4.0, 4\u20134",
     "caption": "walking speed 0.51 m/s \u00b7 WBAM range 0.043 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.028 N\u00b7s",
     "verdict": {
      "cls": "bad",
      "txt": "4 steps"
     }
    },
    "F2": {
     "file": "walk_same_F2_R0.5.js",
     "anchor": 1.1042,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 5 upright steps (fell at 3.67 s) \u00b7 six starts: mean 4.3, 4\u20135",
     "caption": "walking speed 0.75 m/s \u00b7 WBAM range 0.087 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.030 N\u00b7s",
     "verdict": {
      "cls": "bad",
      "txt": "5 steps"
     }
    },
    "F2h": {
     "file": "walk_same_F2h_R0.5.js",
     "anchor": 1.1,
     "side": "R",
     "follow": true,
     "sub": "start R@0.5 \u00b7 5 upright steps (fell at 3.87 s) \u00b7 six starts: mean 5.3, 5\u20136",
     "caption": "walking speed 0.60 m/s \u00b7 WBAM range 0.066 m/s (human 0.014 \u00b1 0.003) \u00b7 ledger residual \u2264 0.026 N\u00b7s",
     "verdict": {
      "cls": "bad",
      "txt": "5 steps"
     }
    }
   },
   "foot": "Collider view, side projection onto the walking direction (viewer on the character's left: left leg dark, right leg light; the F2 toe body amber; an outline turns green when that foot carries > 5 % BW). The rendered boot mesh is not drawn \u2014 this is what the physics touches. Traces: the focus foot (the column's trailing / swing foot) \u2014 heel height, toe clearance (lowest front point; for F2 the toe body), MTP angle, ankle plantar-flexion torque (dashed: \u00b1150 N\u00b7m limit), vertical load; \u25b2 liftoff, \u25bc touchdown with the swing fraction. All runs are deterministic replays (hashes identical to the stored measurement files)."
  }
 ]
};

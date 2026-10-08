# runs (DIAGNOSTIC — not qualification)

| run | kind | body | first | steps DONE | first failure (step, phase) | end s | hash |
|---|---|---|---|---|---|---|---|
| cf1_V2-165-62_L.json.gz | forward | V2-165-62 | L | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 20.3208 | cb96f729 |
| cf1_V2-165-62_R.json.gz | forward | V2-165-62 | R | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 20.3458 | 3eb0b370 |
| cf1_V2-198-92_L.json.gz | forward | V2-198-92 | L | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 20.4917 | 7219b09b |
| cf1_V2-198-92_R.json.gz | forward | V2-198-92 | R | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 20.5208 | a6326990 |
| cf1_V2-REF_L.json.gz | forward | V2-REF | L | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 20.3708 | 43a0565c |
| cf1_V2-REF_R.json.gz | forward | V2-REF | R | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 20.375 | cee49e0b |
| cf1_V2-long-legs_L.json.gz | forward | V2-long-legs | L | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 19.7542 | 116e1090 |
| cf1_V2-long-legs_R.json.gz | forward | V2-long-legs | R | 1 / 20 | step 2, STEP: sequencer NOCERT: NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support) | 19.7792 | ab12f4f7 |
| cf1lat_V2-165-62_L.json.gz | lateral | V2-165-62 | L | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.675 | 1b2eb9c7 |
| cf1lat_V2-165-62_R.json.gz | lateral | V2-165-62 | R | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.675 | 1fcd4fc7 |
| cf1lat_V2-198-92_L.json.gz | lateral | V2-198-92 | L | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.7583 | 911ee10e |
| cf1lat_V2-198-92_R.json.gz | lateral | V2-198-92 | R | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.7583 | 5d254ee4 |
| cf1lat_V2-REF_L.json.gz | lateral | V2-REF | L | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.6917 | 70079733 |
| cf1lat_V2-REF_R.json.gz | lateral | V2-REF | R | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.6917 | 7708dfa4 |
| cf1lat_V2-long-legs_L.json.gz | lateral | V2-long-legs | L | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.4083 | 77cb3b84 |
| cf1lat_V2-long-legs_R.json.gz | lateral | V2-long-legs | R | 1 / 20 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.4083 | 03224559 |

# per completed step

| run | step | swing | lift delay s | φ contact | clr min (φ 0.2–0.8) mm | apex mm | swing track max mm | TD v down / horiz m/s | foothold err mm | step len mm | stance slip mm | stance tilt° | ξ SS margin mm | ξ support margin mm | p* outside mm | CoP outside mm | pelvis tilt max° | leg hard margin° | sat axis-ticks | Δτ0 max N·m | E+ J | E max/tick J | done ξ err mm | done |v| m/s | re-plans | liftoff re-cert |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cf1_V2-165-62_L | 1 | L | 0.125 | 0.910 | 6.50 | 30.2 | 1.47 | 0.046 / 0.039 | 1.22 | 98.9 | 0.01 | 0.00 | 38.0 | 25.2 | 0.0 | 0.0 | 5.06 | 12.45 | 0 | 8.1 | 0.0356 | 0.0034 | 4.9 | 0.011 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-165-62_L | 2 | R | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 39.0 | 0.0 | 0.0 | 3.31 | 13.99 | 0 | 0.4 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-165-62_R | 1 | R | 0.125 | 0.910 | 6.50 | 30.2 | 1.47 | 0.046 / 0.039 | 1.21 | 98.9 | 0.01 | 0.00 | 38.0 | 25.2 | 0.0 | 0.0 | 5.06 | 12.46 | 0 | 8.0 | 0.0351 | 0.0035 | 4.9 | 0.011 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-165-62_R | 2 | L | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 39.0 | 0.0 | 0.0 | 3.31 | 13.99 | 0 | 0.4 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-198-92_L | 1 | L | 0.121 | 0.910 | 6.54 | 30.2 | 1.47 | 0.047 / 0.039 | 1.28 | 98.8 | 0.01 | 0.00 | 45.5 | 28.4 | 0.0 | 0.0 | 4.54 | 11.85 | 1 | 15.9 | 0.0526 | 0.0057 | 4.9 | 0.013 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-198-92_L | 2 | R | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 46.6 | 0.0 | 0.0 | 2.81 | 13.99 | 0 | 1.7 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-198-92_R | 1 | R | 0.121 | 0.910 | 6.54 | 30.2 | 1.47 | 0.047 / 0.039 | 1.28 | 98.8 | 0.00 | 0.00 | 45.5 | 28.4 | 0.0 | 0.0 | 4.54 | 11.85 | 1 | 15.8 | 0.0526 | 0.0058 | 4.9 | 0.013 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-198-92_R | 2 | L | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 46.6 | 0.0 | 0.0 | 2.81 | 13.99 | 0 | 1.6 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-REF_L | 1 | L | 0.121 | 0.910 | 6.53 | 30.2 | 1.44 | 0.047 / 0.040 | 1.22 | 98.9 | 0.01 | 0.00 | 41.9 | 26.9 | 0.0 | 0.0 | 4.77 | 12.08 | 1 | 11.7 | 0.0443 | 0.0043 | 4.9 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-REF_L | 2 | R | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 42.9 | 0.0 | 0.0 | 3.03 | 13.99 | 0 | 0.5 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-REF_R | 1 | R | 0.121 | 0.910 | 6.53 | 30.2 | 1.44 | 0.047 / 0.040 | 1.22 | 98.9 | 0.01 | 0.00 | 41.9 | 26.9 | 0.0 | 0.0 | 4.77 | 12.08 | 1 | 11.7 | 0.0439 | 0.0044 | 4.9 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-REF_R | 2 | L | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 42.9 | 0.0 | 0.0 | 3.03 | 13.99 | 0 | 0.5 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-long-legs_L | 1 | L | 0.125 | 0.910 | 6.51 | 30.2 | 1.83 | 0.036 / 0.021 | 1.90 | 98.3 | 0.01 | 0.00 | 41.8 | 26.7 | 0.0 | 0.0 | 5.18 | 11.99 | 1 | 14.0 | 0.0465 | 0.0061 | 4.0 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-long-legs_L | 2 | R | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 42.9 | 0.0 | 0.0 | 3.03 | 13.99 | 0 | 0.5 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1_V2-long-legs_R | 1 | R | 0.125 | 0.910 | 6.51 | 30.2 | 1.83 | 0.036 / 0.021 | 1.92 | 98.2 | 0.01 | 0.00 | 41.8 | 26.7 | 0.0 | 0.0 | 5.18 | 11.99 | 1 | 14.1 | 0.0456 | 0.0062 | 4.0 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| cf1_V2-long-legs_R | 2 | L | — | — | — | — | 0.00 | — | — | 0.0 | 0.00 | 0.00 | — | 42.9 | 0.0 | 0.0 | 3.03 | 13.99 | 0 | 0.5 | 0.0000 | 0.0000 | — | — | 0 | — |
| cf1lat_V2-165-62_L | 1 | L | 0.125 | 0.917 | 6.77 | 30.2 | 2.09 | 0.045 / 0.024 | 3.36 | 77.8 | 0.00 | 0.00 | 36.0 | 18.6 | 0.0 | 15.6 | 4.35 | 11.58 | 9 | 12.4 | 0.0215 | 0.0040 | 12.7 | 0.016 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-165-62_R | 1 | R | 0.125 | 0.917 | 6.77 | 30.2 | 2.09 | 0.045 / 0.024 | 3.36 | 77.8 | 0.01 | 0.00 | 36.0 | 18.6 | 0.0 | 15.4 | 4.35 | 11.57 | 9 | 12.4 | 0.0217 | 0.0042 | 12.7 | 0.016 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-198-92_L | 1 | L | 0.121 | 0.924 | 6.84 | 30.2 | 2.37 | 0.041 / 0.040 | 2.55 | 78.3 | 0.01 | 0.00 | 43.4 | 21.4 | 0.0 | 25.6 | 3.93 | 11.03 | 12 | 32.0 | 0.0356 | 0.0037 | 13.7 | 0.019 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-198-92_R | 1 | R | 0.121 | 0.924 | 6.84 | 30.2 | 2.37 | 0.041 / 0.040 | 2.51 | 78.3 | 0.00 | 0.00 | 43.4 | 21.4 | 0.0 | 25.0 | 3.93 | 11.03 | 12 | 31.7 | 0.0354 | 0.0043 | 13.7 | 0.019 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-REF_L | 1 | L | 0.121 | 0.917 | 6.82 | 30.2 | 2.10 | 0.047 / 0.031 | 2.88 | 78.1 | 0.01 | 0.00 | 39.8 | 20.1 | 0.0 | 26.9 | 4.12 | 11.22 | 10 | 20.2 | 0.0269 | 0.0036 | 13.1 | 0.018 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-REF_R | 1 | R | 0.121 | 0.917 | 6.82 | 30.2 | 2.10 | 0.047 / 0.031 | 2.89 | 78.1 | 0.00 | 0.00 | 39.8 | 20.1 | 0.0 | 26.5 | 4.12 | 11.22 | 9 | 20.2 | 0.0278 | 0.0041 | 13.1 | 0.018 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-long-legs_L | 1 | L | 0.125 | 0.924 | 6.84 | 30.2 | 2.84 | 0.034 / 0.028 | 2.65 | 78.3 | 0.01 | 0.00 | 39.9 | 19.6 | 0.0 | 8.1 | 4.45 | 10.88 | 8 | 26.4 | 0.0334 | 0.0051 | 10.8 | 0.017 | 0 | CERTIFIED_ONE_STEP |
| cf1lat_V2-long-legs_R | 1 | R | 0.125 | 0.924 | 6.84 | 30.2 | 2.84 | 0.034 / 0.028 | 2.61 | 78.3 | 0.01 | 0.00 | 39.9 | 19.5 | 0.0 | 7.9 | 4.45 | 10.88 | 8 | 26.4 | 0.0339 | 0.0051 | 10.8 | 0.017 | 0 | CERTIFIED_ONE_STEP |

# state handed to each commanded step (the decision tick)

| run | step | verdict | dx / dy m | T s | slack s | swing rel. stance (fwd, lat) m | ξ rel. stance (fwd, lat) m | ξ stance margin mm | |v_COM| m/s | pelvis yaw rel. stance° | feet yaw diff° | pelvis tilt° | stance share |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cf1_V2-165-62_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.019, -0.157 | 0.038, -0.002 | 39.0 | 0.002 | -7.10 | -14.04 | 3.07 | 1.000 |
| cf1_V2-165-62_L | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.115, 0.132 | 0.038, 0.002 | 39.0 | 0.002 | 7.25 | 14.13 | 3.31 | 1.000 |
| cf1_V2-165-62_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.019, 0.157 | 0.038, 0.002 | 39.0 | 0.002 | 7.09 | 14.01 | 3.07 | 1.000 |
| cf1_V2-165-62_R | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.116, -0.132 | 0.038, -0.002 | 39.0 | 0.002 | -7.25 | -14.11 | 3.31 | 1.000 |
| cf1_V2-198-92_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.023, -0.189 | 0.046, -0.002 | 46.5 | 0.002 | -7.09 | -14.00 | 2.62 | 1.000 |
| cf1_V2-198-92_L | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.119, 0.164 | 0.046, 0.002 | 46.6 | 0.002 | 7.27 | 14.06 | 2.81 | 1.000 |
| cf1_V2-198-92_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.023, 0.189 | 0.046, 0.002 | 46.5 | 0.002 | 7.09 | 14.00 | 2.62 | 1.000 |
| cf1_V2-198-92_R | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.119, -0.164 | 0.046, -0.002 | 46.6 | 0.002 | -7.27 | -14.06 | 2.81 | 1.000 |
| cf1_V2-REF_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, -0.173 | 0.042, -0.002 | 42.9 | 0.002 | -7.09 | -14.01 | 2.82 | 1.000 |
| cf1_V2-REF_L | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.117, 0.149 | 0.042, 0.002 | 42.9 | 0.002 | 7.27 | 14.08 | 3.03 | 1.000 |
| cf1_V2-REF_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, 0.173 | 0.042, 0.002 | 42.9 | 0.002 | 7.09 | 14.01 | 2.82 | 1.000 |
| cf1_V2-REF_R | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.117, -0.149 | 0.042, -0.002 | 42.9 | 0.002 | -7.27 | -14.07 | 3.03 | 1.000 |
| cf1_V2-long-legs_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, -0.173 | 0.042, -0.002 | 42.9 | 0.002 | -7.09 | -14.01 | 2.79 | 1.000 |
| cf1_V2-long-legs_L | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.117, 0.148 | 0.042, 0.002 | 42.9 | 0.002 | 7.26 | 14.07 | 3.03 | 1.000 |
| cf1_V2-long-legs_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, 0.173 | 0.042, 0.002 | 42.9 | 0.002 | 7.09 | 14.01 | 2.79 | 1.000 |
| cf1_V2-long-legs_R | 2 | NO_CERTIFIED_ONE_STEP | — / — | — | — | -0.117, -0.148 | 0.042, -0.002 | 42.9 | 0.002 | -7.26 | -14.07 | 3.03 | 1.000 |
| cf1lat_V2-165-62_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.019, -0.157 | 0.038, -0.002 | 39.0 | 0.002 | -7.10 | -14.04 | 3.07 | 1.000 |
| cf1lat_V2-165-62_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.019, 0.157 | 0.038, 0.002 | 39.0 | 0.002 | 7.09 | 14.01 | 3.07 | 1.000 |
| cf1lat_V2-198-92_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.023, -0.189 | 0.046, -0.002 | 46.5 | 0.002 | -7.09 | -14.00 | 2.62 | 1.000 |
| cf1lat_V2-198-92_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.023, 0.189 | 0.046, 0.002 | 46.5 | 0.002 | 7.09 | 14.00 | 2.62 | 1.000 |
| cf1lat_V2-REF_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, -0.173 | 0.042, -0.002 | 42.9 | 0.002 | -7.09 | -14.01 | 2.82 | 1.000 |
| cf1lat_V2-REF_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, 0.173 | 0.042, 0.002 | 42.9 | 0.002 | 7.09 | 14.01 | 2.82 | 1.000 |
| cf1lat_V2-long-legs_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, -0.173 | 0.042, -0.002 | 42.9 | 0.002 | -7.09 | -14.01 | 2.79 | 1.000 |
| cf1lat_V2-long-legs_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, 0.173 | 0.042, 0.002 | 42.9 | 0.002 | 7.09 | 14.01 | 2.79 | 1.000 |

# load-split geometry at the first failure (the controller's G3 share rule: p* projected on the line between the feet's region centroids)

| run | stance centroid (x, z) m | ξ_ref (x, z) m | p* (x, z) m | projected stance share (p*) | commanded share (stance, other) | measured Fz / BW (L, R) |
|---|---|---|---|---|---|---|
| cf1_V2-165-62_L | -0.0700, 0.1040 | -0.0700, 0.1061 | -0.0696, 0.1032 | 0.9955 | 1.0000, 0.0000 | 0.9982, 0.0018 |
| cf1_V2-165-62_R | 0.0701, 0.1041 | 0.0701, 0.1062 | 0.0697, 0.1032 | 0.9954 | 1.0000, 0.0000 | 0.0018, 0.9981 |
| cf1_V2-198-92_L | -0.0868, 0.1134 | -0.0868, 0.1074 | -0.0862, 0.1152 | 1.0014 | 1.0000, 0.0000 | 0.9985, 0.0017 |
| cf1_V2-198-92_R | 0.0868, 0.1135 | 0.0868, 0.1074 | 0.0862, 0.1152 | 1.0013 | 1.0000, 0.0000 | 0.0017, 0.9988 |
| cf1_V2-REF_L | -0.0787, 0.1089 | -0.0787, 0.1068 | -0.0782, 0.1094 | 0.9991 | 1.0000, 0.0000 | 0.9983, 0.0017 |
| cf1_V2-REF_R | 0.0786, 0.1089 | 0.0786, 0.1068 | 0.0782, 0.1094 | 0.9990 | 1.0000, 0.0000 | 0.0017, 0.9983 |
| cf1_V2-long-legs_L | -0.0783, 0.1085 | -0.0783, 0.1064 | -0.0778, 0.1090 | 0.9992 | 1.0000, 0.0000 | 0.9983, 0.0017 |
| cf1_V2-long-legs_R | 0.0783, 0.1085 | 0.0783, 0.1064 | 0.0778, 0.1090 | 0.9989 | 1.0000, 0.0000 | 0.0017, 0.9983 |
| cf1lat_V2-165-62_L | -0.1607, 0.0129 | -0.1607, 0.0129 | -0.1563, 0.0131 | 0.9820 | 0.9820, 0.0180 | 0.9837, 0.0163 |
| cf1lat_V2-165-62_R | 0.1607, 0.0129 | 0.1607, 0.0129 | 0.1564, 0.0131 | 0.9821 | 0.9821, 0.0179 | 0.0162, 0.9838 |
| cf1lat_V2-198-92_L | -0.1779, 0.0230 | -0.1779, 0.0230 | -0.1730, 0.0232 | 0.9823 | 0.9823, 0.0177 | 0.9839, 0.0161 |
| cf1lat_V2-198-92_R | 0.1780, 0.0230 | 0.1780, 0.0230 | 0.1730, 0.0232 | 0.9823 | 0.9823, 0.0177 | 0.0161, 0.9839 |
| cf1lat_V2-REF_L | -0.1696, 0.0182 | -0.1696, 0.0182 | -0.1650, 0.0183 | 0.9824 | 0.9824, 0.0176 | 0.9840, 0.0160 |
| cf1lat_V2-REF_R | 0.1696, 0.0181 | 0.1696, 0.0181 | 0.1650, 0.0183 | 0.9823 | 0.9823, 0.0177 | 0.0161, 0.9839 |
| cf1lat_V2-long-legs_L | -0.1697, 0.0186 | -0.1697, 0.0186 | -0.1663, 0.0187 | 0.9869 | 0.9869, 0.0131 | 0.9879, 0.0121 |
| cf1lat_V2-long-legs_R | 0.1697, 0.0186 | 0.1697, 0.0186 | 0.1663, 0.0187 | 0.9869 | 0.9869, 0.0131 | 0.0121, 0.9879 |

# CF-1 between-steps transfers (counterfactual)

| run | step | DCM travel m | ξ err max mm | ξ support margin min mm | p* margin to stance at share ≥ 0.85, min mm | would-abort (suspension needed) | release after s | trailing Fz / BW at decision | ξ err at decision mm |
|---|---|---|---|---|---|---|---|---|---|
| cf1_V2-165-62_L | 1 | 0.083 | 4.36 | 38.2 | 8.77 | no | 1.238 | 0.0015 | 0.35 |
| cf1_V2-165-62_L | 2 | 0.095 | 8.62 | 38.2 | 2.18 | no | 2.146 | 0.0017 | 0.32 |
| cf1_V2-165-62_R | 1 | 0.083 | 4.36 | 38.2 | 8.78 | no | 1.238 | 0.0015 | 0.35 |
| cf1_V2-165-62_R | 2 | 0.095 | 8.63 | 38.2 | 2.16 | no | 2.171 | 0.0018 | 0.31 |
| cf1_V2-198-92_L | 1 | 0.100 | 5.10 | 45.6 | 10.73 | no | 1.321 | 0.0015 | 0.51 |
| cf1_V2-198-92_L | 2 | 0.113 | 9.48 | 45.7 | 4.99 | no | 2.237 | 0.0017 | 0.49 |
| cf1_V2-198-92_R | 1 | 0.100 | 5.10 | 45.6 | 10.73 | no | 1.321 | 0.0015 | 0.51 |
| cf1_V2-198-92_R | 2 | 0.113 | 9.48 | 45.7 | 4.99 | no | 2.267 | 0.0017 | 0.47 |
| cf1_V2-REF_L | 1 | 0.091 | 4.68 | 42.0 | 9.90 | no | 1.258 | 0.0015 | 0.43 |
| cf1_V2-REF_L | 2 | 0.104 | 8.98 | 42.1 | 3.95 | no | 2.179 | 0.0017 | 0.41 |
| cf1_V2-REF_R | 1 | 0.091 | 4.68 | 42.0 | 9.90 | no | 1.258 | 0.0015 | 0.43 |
| cf1_V2-REF_R | 2 | 0.104 | 8.98 | 42.1 | 3.95 | no | 2.183 | 0.0017 | 0.40 |
| cf1_V2-long-legs_L | 1 | 0.091 | 3.91 | 42.0 | 10.87 | no | 0.967 | 0.0015 | 0.45 |
| cf1_V2-long-legs_L | 2 | 0.103 | 7.50 | 42.1 | 5.68 | no | 1.850 | 0.0017 | 0.39 |
| cf1_V2-long-legs_R | 1 | 0.091 | 3.91 | 42.0 | 10.87 | no | 0.967 | 0.0015 | 0.45 |
| cf1_V2-long-legs_R | 2 | 0.103 | 7.50 | 42.1 | 5.67 | no | 1.875 | 0.0017 | 0.38 |
| cf1lat_V2-165-62_L | 1 | 0.083 | 4.36 | 38.2 | 8.77 | no | 1.238 | 0.0015 | 0.35 |
| cf1lat_V2-165-62_L | 2 | 0.134 | 23.60 | 45.8 | -27.88 | yes: 26.7 mm at 16.8 s (TRANSFER) | never released | 0.0163 (end) | — |
| cf1lat_V2-165-62_R | 1 | 0.083 | 4.36 | 38.2 | 8.78 | no | 1.238 | 0.0015 | 0.35 |
| cf1lat_V2-165-62_R | 2 | 0.134 | 23.62 | 45.7 | -27.90 | yes: 26.72 mm at 16.8 s (TRANSFER) | never released | 0.0163 (end) | — |
| cf1lat_V2-198-92_L | 1 | 0.100 | 5.10 | 45.6 | 10.73 | no | 1.321 | 0.0015 | 0.51 |
| cf1lat_V2-198-92_L | 2 | 0.153 | 24.07 | 54.7 | -25.63 | yes: 24.31 mm at 16.8833 s (TRANSFER) | never released | 0.0162 (end) | — |
| cf1lat_V2-198-92_R | 1 | 0.100 | 5.10 | 45.6 | 10.73 | no | 1.321 | 0.0015 | 0.51 |
| cf1lat_V2-198-92_R | 2 | 0.153 | 24.08 | 54.7 | -25.65 | yes: 24.33 mm at 16.8833 s (TRANSFER) | never released | 0.0162 (end) | — |
| cf1lat_V2-REF_L | 1 | 0.091 | 4.68 | 42.0 | 9.90 | no | 1.258 | 0.0015 | 0.43 |
| cf1lat_V2-REF_L | 2 | 0.144 | 23.69 | 50.3 | -26.50 | yes: 25.25 mm at 16.8167 s (TRANSFER) | never released | 0.0160 (end) | — |
| cf1lat_V2-REF_R | 1 | 0.091 | 4.68 | 42.0 | 9.90 | no | 1.258 | 0.0015 | 0.43 |
| cf1lat_V2-REF_R | 2 | 0.144 | 23.70 | 50.3 | -26.53 | yes: 25.28 mm at 16.8167 s (TRANSFER) | never released | 0.0161 (end) | — |
| cf1lat_V2-long-legs_L | 1 | 0.091 | 3.91 | 42.0 | 10.87 | no | 0.967 | 0.0015 | 0.45 |
| cf1lat_V2-long-legs_L | 2 | 0.141 | 19.97 | 49.4 | -21.78 | yes: 20.51 mm at 16.5333 s (TRANSFER) | never released | 0.0121 (end) | — |
| cf1lat_V2-long-legs_R | 1 | 0.091 | 3.91 | 42.0 | 10.87 | no | 0.967 | 0.0015 | 0.45 |
| cf1lat_V2-long-legs_R | 2 | 0.141 | 19.98 | 49.4 | -21.80 | yes: 20.53 mm at 16.5333 s (TRANSFER) | never released | 0.0121 (end) | — |

# refused commanded decisions: the planner's nominal swing, bounded leg IK per path sample (soft box = the planner's; hard = anatomical limits)

| run | step | goal rel. stance (lat, fwd) m | refused samples φ | soft-box excess of the hard solution (worst) | hard-limit IK max residual | hip→foot max / leg length m |
|---|---|---|---|---|---|---|
| cf1_V2-165-62_L | 2 | 0.133, 0.001 | 0.1, 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":5.25} at φ 0.4 | 8.3e-16 | 0.770 / 0.785 |
| cf1_V2-165-62_R | 2 | -0.133, 0.001 | 0.1, 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":5.25} at φ 0.4 | 8.6e-16 | 0.770 / 0.785 |
| cf1_V2-198-92_L | 2 | 0.165, 0.001 | 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":2.65} at φ 0.4 | 6.4e-16 | 0.928 / 0.943 |
| cf1_V2-198-92_R | 2 | -0.165, 0.001 | 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":2.65} at φ 0.4 | 9.5e-16 | 0.928 / 0.943 |
| cf1_V2-REF_L | 2 | 0.150, 0.001 | 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":3.82} at φ 0.4 | 8.8e-16 | 0.851 / 0.866 |
| cf1_V2-REF_R | 2 | -0.150, 0.001 | 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":3.82} at φ 0.4 | 7.4e-16 | 0.851 / 0.866 |
| cf1_V2-long-legs_L | 2 | 0.149, 0.002 | 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":3.19} at φ 0.4 | 9.5e-16 | 0.894 / 0.910 |
| cf1_V2-long-legs_R | 2 | -0.149, 0.002 | 0.2, 0.3, 0.4, 0.5, 0.6 | {"ankle.df":3.19} at φ 0.4 | 6.4e-16 | 0.894 / 0.910 |

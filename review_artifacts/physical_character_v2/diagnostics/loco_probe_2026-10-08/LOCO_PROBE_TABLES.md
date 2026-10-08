# runs (DIAGNOSTIC — not qualification)

| run | kind | body | first | steps DONE | first failure (step, phase) | end s | hash |
|---|---|---|---|---|---|---|---|
| p1_V2-165-62_L.json.gz | forward | V2-165-62 | L | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.2292 | 71ae0b1a |
| p1_V2-165-62_R.json.gz | forward | V2-165-62 | R | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.2292 | 59aa9a35 |
| p1_V2-198-92_L.json.gz | forward | V2-198-92 | L | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.2792 | b3ed8536 |
| p1_V2-198-92_R.json.gz | forward | V2-198-92 | R | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.2833 | 19a96c96 |
| p1_V2-REF_L.json.gz | forward | V2-REF | L | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.2333 | c6536a96 |
| p1_V2-REF_R.json.gz | forward | V2-REF | R | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 20.2333 | 9d0d895f |
| p1_V2-long-legs_L.json.gz | forward | V2-long-legs | L | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 19.4333 | 10abd2d2 |
| p1_V2-long-legs_R.json.gz | forward | V2-long-legs | R | 1 / 2 | step 2, RELEASE: unload time-out: the swing foot never TOUCHING ≥ 0.5 s within 3 s (state SUPPORT, share 1.000) | 19.4333 | 34418bb1 |
| p1lat_V2-165-62_L.json.gz | lateral | V2-165-62 | L | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 15.6917 | 6508e4e1 |
| p1lat_V2-165-62_R.json.gz | lateral | V2-165-62 | R | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 15.6917 | 2532f490 |
| p1lat_V2-198-92_L.json.gz | lateral | V2-198-92 | L | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 15.7458 | cfd513f8 |
| p1lat_V2-198-92_R.json.gz | lateral | V2-198-92 | R | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 15.75 | 3f20744b |
| p1lat_V2-REF_L.json.gz | lateral | V2-REF | L | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 15.6958 | a0b5dbdd |
| p1lat_V2-REF_R.json.gz | lateral | V2-REF | R | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 15.6958 | 84d86f78 |
| p1lat_V2-long-legs_L.json.gz | lateral | V2-long-legs | L | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 14.8958 | d9fea0c3 |
| p1lat_V2-long-legs_R.json.gz | lateral | V2-long-legs | R | 1 / 20 | step 2, TRANSFER: supervisor abort (stance-only CoP test) in TRANSFER | 14.8958 | d99856e3 |

# per completed step

| run | step | swing | lift delay s | φ contact | clr min (φ 0.2–0.8) mm | apex mm | swing track max mm | TD v down / horiz m/s | foothold err mm | step len mm | stance slip mm | stance tilt° | ξ SS margin mm | ξ support margin mm | p* outside mm | CoP outside mm | pelvis tilt max° | leg hard margin° | sat axis-ticks | Δτ0 max N·m | E+ J | E max/tick J | done ξ err mm | done |v| m/s | re-plans | liftoff re-cert |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p1_V2-165-62_L | 1 | L | 0.125 | 0.910 | 6.51 | 30.2 | 1.45 | 0.047 / 0.040 | 1.21 | 98.9 | 0.01 | 0.00 | 38.0 | 26.1 | 0.0 | 0.0 | 5.06 | 12.45 | 1 | 7.8 | 0.0353 | 0.0036 | 4.8 | 0.011 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-165-62_R | 1 | R | 0.125 | 0.910 | 6.51 | 30.2 | 1.45 | 0.047 / 0.040 | 1.21 | 98.9 | 0.01 | 0.00 | 38.0 | 26.1 | 0.0 | 0.0 | 5.06 | 12.45 | 1 | 7.7 | 0.0354 | 0.0037 | 4.9 | 0.011 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-198-92_L | 1 | L | 0.121 | 0.910 | 6.52 | 30.2 | 1.50 | 0.045 / 0.037 | 1.27 | 98.8 | 0.01 | 0.00 | 45.7 | 25.9 | 0.0 | 0.0 | 4.53 | 11.89 | 2 | 15.2 | 0.0528 | 0.0068 | 5.1 | 0.013 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-198-92_R | 1 | R | 0.121 | 0.910 | 6.52 | 30.2 | 1.50 | 0.045 / 0.037 | 1.26 | 98.9 | 0.01 | 0.00 | 45.7 | 25.9 | 0.0 | 0.0 | 4.53 | 11.89 | 2 | 15.3 | 0.0533 | 0.0069 | 5.1 | 0.013 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-REF_L | 1 | L | 0.121 | 0.910 | 6.52 | 30.2 | 1.45 | 0.047 / 0.039 | 1.22 | 98.9 | 0.01 | 0.00 | 41.9 | 25.9 | 0.0 | 0.0 | 4.77 | 12.09 | 1 | 11.6 | 0.0443 | 0.0047 | 4.9 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-REF_R | 1 | R | 0.121 | 0.910 | 6.52 | 30.2 | 1.45 | 0.047 / 0.039 | 1.22 | 98.9 | 0.01 | 0.00 | 41.9 | 25.9 | 0.0 | 0.0 | 4.77 | 12.09 | 1 | 11.5 | 0.0437 | 0.0048 | 4.9 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-long-legs_L | 1 | L | 0.125 | 0.910 | 6.50 | 30.2 | 1.84 | 0.035 / 0.019 | 1.65 | 98.5 | 0.01 | 0.00 | 41.8 | 25.9 | 0.0 | 0.0 | 5.17 | 11.99 | 1 | 13.8 | 0.0469 | 0.0062 | 4.1 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| p1_V2-long-legs_R | 1 | R | 0.125 | 0.910 | 6.50 | 30.2 | 1.84 | 0.035 / 0.019 | 1.67 | 98.5 | 0.01 | 0.00 | 41.8 | 25.9 | 0.0 | 0.0 | 5.17 | 11.99 | 1 | 13.8 | 0.0460 | 0.0062 | 4.1 | 0.012 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-165-62_L | 1 | L | 0.125 | 0.917 | 6.78 | 30.1 | 2.10 | 0.046 / 0.025 | 3.30 | 77.8 | 0.00 | 0.00 | 35.9 | 18.6 | 0.0 | 13.6 | 4.35 | 11.57 | 9 | 12.5 | 0.0213 | 0.0041 | 12.7 | 0.016 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-165-62_R | 1 | R | 0.125 | 0.917 | 6.78 | 30.1 | 2.10 | 0.046 / 0.025 | 3.26 | 77.9 | 0.01 | 0.00 | 35.9 | 18.6 | 0.0 | 13.5 | 4.35 | 11.57 | 9 | 12.5 | 0.0208 | 0.0042 | 12.7 | 0.016 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-198-92_L | 1 | L | 0.121 | 0.924 | 6.83 | 30.2 | 2.32 | 0.039 / 0.036 | 2.48 | 78.3 | 0.01 | 0.00 | 43.6 | 21.4 | 0.0 | 21.4 | 3.93 | 11.03 | 11 | 30.2 | 0.0364 | 0.0050 | 13.7 | 0.019 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-198-92_R | 1 | R | 0.121 | 0.924 | 6.83 | 30.2 | 2.32 | 0.039 / 0.036 | 2.49 | 78.3 | 0.00 | 0.00 | 43.6 | 21.4 | 0.0 | 21.5 | 3.93 | 11.03 | 12 | 30.2 | 0.0359 | 0.0050 | 13.7 | 0.019 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-REF_L | 1 | L | 0.121 | 0.917 | 6.82 | 30.2 | 2.09 | 0.047 / 0.031 | 2.90 | 78.1 | 0.01 | 0.00 | 39.9 | 20.0 | 0.0 | 26.4 | 4.12 | 11.22 | 9 | 20.0 | 0.0281 | 0.0034 | 13.1 | 0.018 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-REF_R | 1 | R | 0.121 | 0.917 | 6.82 | 30.2 | 2.08 | 0.047 / 0.031 | 2.86 | 78.1 | 0.00 | 0.00 | 39.9 | 20.0 | 0.0 | 25.9 | 4.12 | 11.22 | 9 | 20.0 | 0.0270 | 0.0039 | 13.1 | 0.018 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-long-legs_L | 1 | L | 0.125 | 0.917 | 6.84 | 30.2 | 2.65 | 0.048 / 0.039 | 2.97 | 78.2 | 0.01 | 0.00 | 39.8 | 19.5 | 0.0 | 17.8 | 4.44 | 10.89 | 8 | 24.1 | 0.0336 | 0.0052 | 10.8 | 0.017 | 0 | CERTIFIED_ONE_STEP |
| p1lat_V2-long-legs_R | 1 | R | 0.125 | 0.917 | 6.84 | 30.2 | 2.65 | 0.048 / 0.039 | 2.91 | 78.2 | 0.01 | 0.00 | 39.8 | 19.5 | 0.0 | 17.6 | 4.44 | 10.89 | 8 | 24.1 | 0.0331 | 0.0053 | 10.8 | 0.017 | 0 | CERTIFIED_ONE_STEP |

# state handed to each commanded step (the decision tick)

| run | step | verdict | dx / dy m | T s | slack s | swing rel. stance (fwd, lat) m | ξ rel. stance (fwd, lat) m | ξ stance margin mm | |v_COM| m/s | pelvis yaw rel. stance° | feet yaw diff° | pelvis tilt° | stance share |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p1_V2-165-62_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.019, -0.157 | 0.040, -0.002 | 38.9 | 0.002 | -7.10 | -14.01 | 3.07 | 1.000 |
| p1_V2-165-62_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.019, 0.157 | 0.040, 0.002 | 38.9 | 0.002 | 7.10 | 14.01 | 3.07 | 1.000 |
| p1_V2-198-92_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.023, -0.189 | 0.040, -0.001 | 46.7 | 0.002 | -7.07 | -14.00 | 2.61 | 1.000 |
| p1_V2-198-92_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.023, 0.189 | 0.040, 0.001 | 46.7 | 0.002 | 7.07 | 14.00 | 2.61 | 1.000 |
| p1_V2-REF_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, -0.173 | 0.040, -0.001 | 43.0 | 0.002 | -7.08 | -14.01 | 2.81 | 1.000 |
| p1_V2-REF_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, 0.173 | 0.040, 0.001 | 43.0 | 0.002 | 7.08 | 14.01 | 2.81 | 1.000 |
| p1_V2-long-legs_L | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, -0.173 | 0.040, -0.002 | 42.7 | 0.002 | -7.11 | -14.01 | 2.77 | 1.000 |
| p1_V2-long-legs_R | 1 | CERTIFIED_ONE_STEP | 0.100 / 0.000 | 0.60 | 0.500 | -0.021, 0.173 | 0.040, 0.002 | 42.7 | 0.002 | 7.11 | 14.01 | 2.77 | 1.000 |
| p1lat_V2-165-62_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.019, -0.157 | 0.040, -0.002 | 38.9 | 0.002 | -7.10 | -14.01 | 3.07 | 1.000 |
| p1lat_V2-165-62_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.019, 0.157 | 0.040, 0.002 | 38.9 | 0.002 | 7.10 | 14.01 | 3.07 | 1.000 |
| p1lat_V2-198-92_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.023, -0.189 | 0.040, -0.001 | 46.7 | 0.002 | -7.07 | -14.00 | 2.61 | 1.000 |
| p1lat_V2-198-92_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.023, 0.189 | 0.040, 0.001 | 46.7 | 0.002 | 7.07 | 14.00 | 2.61 | 1.000 |
| p1lat_V2-REF_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, -0.173 | 0.040, -0.001 | 43.0 | 0.002 | -7.08 | -14.01 | 2.81 | 1.000 |
| p1lat_V2-REF_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, 0.173 | 0.040, 0.001 | 43.0 | 0.002 | 7.08 | 14.01 | 2.81 | 1.000 |
| p1lat_V2-long-legs_L | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, -0.173 | 0.040, -0.002 | 42.7 | 0.002 | -7.11 | -14.01 | 2.77 | 1.000 |
| p1lat_V2-long-legs_R | 1 | CERTIFIED_ONE_STEP | 0.000 / 0.080 | 0.60 | 0.500 | -0.021, 0.173 | 0.040, 0.002 | 42.7 | 0.002 | 7.11 | 14.01 | 2.77 | 1.000 |

# load-split geometry at the first failure (the controller's G3 share rule: p* projected on the line between the feet's region centroids)

| run | stance centroid (x, z) m | ξ_ref (x, z) m | p* (x, z) m | projected stance share (p*) | commanded share (stance, other) | measured Fz / BW (L, R) |
|---|---|---|---|---|---|---|
| p1_V2-165-62_L | -0.0701, 0.1040 | -0.0700, 0.0569 | -0.0698, 0.0568 | 0.8581 | 0.8581, 0.1419 | 0.8582, 0.1418 |
| p1_V2-165-62_R | 0.0700, 0.1041 | 0.0700, 0.0569 | 0.0698, 0.0568 | 0.8580 | 0.8580, 0.1420 | 0.1419, 0.8581 |
| p1_V2-198-92_L | -0.0868, 0.1135 | -0.0867, 0.0583 | -0.0864, 0.0582 | 0.8759 | 0.8759, 0.1241 | 0.8759, 0.1240 |
| p1_V2-198-92_R | 0.0868, 0.1134 | 0.0867, 0.0583 | 0.0864, 0.0582 | 0.8760 | 0.8760, 0.1240 | 0.1239, 0.8761 |
| p1_V2-REF_L | -0.0787, 0.1089 | -0.0786, 0.0577 | -0.0784, 0.0575 | 0.8676 | 0.8676, 0.1324 | 0.8677, 0.1323 |
| p1_V2-REF_R | 0.0786, 0.1089 | 0.0786, 0.0577 | 0.0783, 0.0575 | 0.8676 | 0.8676, 0.1324 | 0.1323, 0.8677 |
| p1_V2-long-legs_L | -0.0784, 0.1087 | -0.0783, 0.0577 | -0.0781, 0.0576 | 0.8682 | 0.8682, 0.1318 | 0.8683, 0.1317 |
| p1_V2-long-legs_R | 0.0783, 0.1087 | 0.0783, 0.0577 | 0.0781, 0.0576 | 0.8683 | 0.8683, 0.1317 | 0.1316, 0.8684 |
| p1lat_V2-165-62_L | -0.1608, 0.0129 | -0.1252, 0.0107 | -0.1207, 0.0098 | 0.8350 | 0.8350, 0.1650 | 0.8570, 0.1467 |
| p1lat_V2-165-62_R | 0.1608, 0.0130 | 0.1252, 0.0107 | 0.1207, 0.0099 | 0.8349 | 0.8349, 0.1651 | 0.1475, 0.8575 |
| p1lat_V2-198-92_L | -0.1779, 0.0231 | -0.1373, 0.0125 | -0.1363, 0.0113 | 0.8486 | 0.8486, 0.1514 | 0.8695, 0.1349 |
| p1lat_V2-198-92_R | 0.1779, 0.0231 | 0.1373, 0.0124 | 0.1363, 0.0113 | 0.8486 | 0.8486, 0.1514 | 0.1356, 0.8701 |
| p1lat_V2-REF_L | -0.1696, 0.0182 | -0.1314, 0.0116 | -0.1288, 0.0106 | 0.8429 | 0.8429, 0.1571 | 0.8641, 0.1400 |
| p1lat_V2-REF_R | 0.1696, 0.0182 | 0.1314, 0.0116 | 0.1288, 0.0106 | 0.8429 | 0.8429, 0.1571 | 0.1404, 0.8650 |
| p1lat_V2-long-legs_L | -0.1696, 0.0182 | -0.1315, 0.0116 | -0.1333, 0.0108 | 0.8598 | 0.8598, 0.1402 | 0.8775, 0.1261 |
| p1lat_V2-long-legs_R | 0.1696, 0.0183 | 0.1315, 0.0117 | 0.1333, 0.0108 | 0.8598 | 0.8598, 0.1402 | 0.1266, 0.8779 |

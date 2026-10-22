# SHOT-CHARGE-1.3 — faster input, earlier red

Live lab: http://127.0.0.1:8878/live.html (existing URL, updated server root). Previous artifacts remain unchanged on disk.

Foundation: c7d04b99866347365b6680b0a1ec09d66a4d972e.

Final owner-directed candidate: faster-450-early-red-310.
- Every finite nonnegative paired hold registers; 0–40 ms preserves the prior weak-shot output.
- q=clamp((h−40)/410,0,1); old capability-fraction shape reaches unchanged ceiling at450ms.
- Normal apex: .32+2.68*q^1.6*(2.6−1.6q), through310ms.
- Red starts310ms, preserving the positive incoming height slope. A=A0+(10−A0)*(1−exp(−S0*d/(10−A0)−(d/300)^2)), d=h−310. A0/S0 are the exact normal height/derivative at310.
- Owner explicitly approved superseding the3m-at450ms anchor to remove the just-over-bar shelf.
- Fixed physical pre-contact solve; one launch; unchanged physics and SP ceilings.
- One compact supporting video only.

Manual evidence is ten actual owner Space presses (196–383.6ms), captured before the early-red correction. Original records and original-candidate formulas are preserved; final replays are clearly distinguished. No manual pointer or sub40ms human samples are claimed. Separate controlled native quick inputs verify the weak floor.

Build: tools/build-evidence.mjs; tools/test.mjs; tools/videos.mjs; tools/build-review.mjs; tools/package.mjs --preview; UI verification; tools/package.mjs. Runtime source is copied exactly, including the same authoritative modules used by the test suite.

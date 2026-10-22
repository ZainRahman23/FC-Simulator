import {SETUP} from '../shotcharge12/config.js';
export {SETUP};
export const VERSION='SHOT-CHARGE-1.3';
export const CANDIDATE='faster-450-early-red-310';
export const RATINGS=Object.freeze([50,70,80,90,99]);
export const HOLDS=Object.freeze([20,100,200,300,450,550,700]);
export const CHARGE=Object.freeze({minimumHoldMs:0,tapFloorEndMs:40,fullHoldMs:450,floorFraction:.4});
export const PROFILE=Object.freeze({minimumApex:.32,maximumApex:3,power:1.6});
export const OVERCHARGE=Object.freeze({startMs:310,scaleMs:300,extraApexLimit:7,power:2});
export const FORMULA=Object.freeze({
 registration:'Every finite nonnegative duration from a valid press/release pair registers, including a timer-resolution 0 ms. No debounce dead zone. The 0–40 ms interval preserves the previous minimum valid weak shot exactly.',
 charge:'q = clamp((holdMs − 40) / 410, 0, 1)',
 speed:'f(q) = 0.40 + 0.60 × [1 − (1 − q)²]; launch speed = frozen BALL-SHOT-1.2 Laces ceiling × f(q). At/after 450 ms, f = 1.',
 trajectory:'For holdMs ≤ 310: requested centre apex = 0.32 + 2.68 × q^1.6 × (2.6 − 1.6q) metres.',
 overcharge:'For holdMs > 310: d = holdMs − 310; A0 = normal apex at 310; S0 = normal apex slope at 310; L = 10 − A0; requested apex = A0 + L × [1 − exp(−S0 × d / L − (d / 300)²)].',
 continuity:'Speed is continuous at 40 and 450 ms and capped from 450 onward. Apex and its first derivative are continuous at 40 and 310 ms. The red transition preserves the nonzero incoming height slope, removing the old shelf. There is no special trajectory boundary at 450 ms.',
 physical:'The unchanged pre-contact physical apex solver chooses initial elevation at the resolved scalar speed. One launch; frozen BALL-PHYS determines everything after contact.',
 selection:'Owner requested earlier red at the bar-height transition and rising elevation while speed still builds. This candidate uses 310 ms red onset, the unchanged 450 ms speed ceiling, 40 ms weak-tap plateau and 1.6 normal trajectory exponent. The former 3.0 m apex at 450 ms is intentionally superseded.',
 longHold:'Raw duration is never capped or rounded. The shared overcharge profile tends smoothly toward the existing reachable 10 m apex limit.'
});

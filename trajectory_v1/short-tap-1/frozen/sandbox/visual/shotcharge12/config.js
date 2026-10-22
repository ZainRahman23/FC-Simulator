import {SETUP,DEFAULT_PROFILE as APPROVED_PROFILE,FORMULA as APPROVED_FORMULA} from '../shotcharge11/config.js';
export {SETUP};
export const VERSION='SHOT-CHARGE-1.2';
export const RATINGS=Object.freeze([50,70,80,90,99]);
export const HOLDS=Object.freeze([600,650,700,750,800,900,1000]);
export const DEFAULT_PROFILE=Object.freeze({...APPROVED_PROFILE,selection:'Owner provisional selection: 0.32 m tap, 3.0 m useful maximum; middle progression approved'});
export const OVERCHARGE=Object.freeze({startMs:600,scaleMs:300,extraApexLimit:7,power:2,selection:'Provisional overcharge response; awaiting owner visual/input review'});
export const FORMULA=Object.freeze({...APPROVED_FORMULA,overcharge:'For h > 600: requested centre apex = 3 + 7 × (1 − exp(−((h − 600) / 300)²)) metres. Unchanged for h ≤ 600. Speed remains at the frozen player ceiling.',longHold:'Hold duration is never clamped or rounded. Apex tends smoothly toward 10 m for arbitrarily long finite holds; this shared trajectory limit is physically reachable at every supported SP, including 50. No automatic release.',continuity:'The right-hand added apex and its first derivative are zero at 600 ms. The approved left-hand profile also has zero first derivative there.'});

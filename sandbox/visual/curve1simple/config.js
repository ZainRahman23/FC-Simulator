import {COURTOIS,COURTOIS_SOURCE,EXPONENT,SPIN_AT_75,RATINGS,PRIMARY} from '../curve1/config.js';
export {COURTOIS,COURTOIS_SOURCE,EXPONENT,SPIN_AT_75,RATINGS,PRIMARY};
export const FOUNDATION='83564d58';
export const SHOT_POWER=80;
export const DEFAULT_CURVE=75;
export const SCENARIO=Object.freeze({id:'A',name:'Left half-space, right-foot inside finesse to top-right',origin:Object.freeze([84,.11,26]),target:Object.freeze([105,2.1,37.25]),depth:21});
export const SCENARIOS=Object.freeze([SCENARIO]);
export const GEOMETRY=Object.freeze({
 axes:'World X is forward toward the goal; Y is up; Z increases toward the shooter-view right. Goal centre is [105,0,34].',
 target:'Ball centre [105,2.1,37.25], inside the top-right aperture; fixed for every rating.',
 signedAxisCorrection:'Local pre-contact right-foot INSIDE convention changes the inherited negative Y sidespin to positive Y. For forward +X, omega cross velocity then bends toward -Z (inward). The old negative Y convention bent outward toward +Z. No foot swap, camera mirror, magnitude change or post-launch spin change.',
 signedDeparture:'Positive means outside/right of the direct horizontal shooter-to-target line: (dx*(z-z0)-dz*(x-x0))/hypot(dx,dz).',
 aimOffset:'Actual initial horizontal velocity bearing minus direct shooter-target bearing; positive is outside/right. Ray offset is initial horizontal ray Z at X=105 minus target Z.',
 firstFlight:'Unopposed maximum signed perpendicular departure uses all airborne substep samples up to first turf contact. Through-goal departure is also reported. Actual maximum uses samples only until the earlier of first goalkeeper contact, goal plane, first turf contact, or simulation end.'
});

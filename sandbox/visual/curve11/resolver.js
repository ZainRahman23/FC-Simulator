import {launch as frozenLaunch} from '../curve1simple/experiments.js';
import {SPIN_AT_75,MAGNITUDE_MULTIPLIER} from './config.js';

// Exactly one change to the existing pre-contact launch: global intentional
// sidespin capability ×1.40. The frozen resolver still supplies every other input.
export function launch(s,curve,aim){
 const a=frozenLaunch(s,curve,aim),scale=v=>v.map((x,i)=>i===1?x*MAGNITUDE_MULTIPLIER:x),spin=scale(a.spin),spinMagnitude=Math.hypot(...spin);
 return {...a,spin,metadata:{...a.metadata,version:'CURVE-1.1',spin,angularVelocity:spin,spinMagnitude,spinAxis:spinMagnitude?spin.map(x=>x/spinMagnitude):[0,0,0],
  curve:{...a.metadata.curve,referenceSpin:SPIN_AT_75,intentionalSideSpin:spin[1],formula:'intentional sidespin = foot sign × 56 rad/s × (Curve/75)^2.7 × existing execution factor × charge',calibrationStatus:'Owner-requested +40% global intentional sidespin; rating progression unchanged'},
  techniqueDirection:{...a.metadata.techniqueDirection,inheritedSpin:scale(a.metadata.techniqueDirection.inheritedSpin),correctedSpin:spin},
  magnitude:{oldAnchor:40,newAnchor:SPIN_AT_75,multiplier:MAGNITUDE_MULTIPLIER}}};
}

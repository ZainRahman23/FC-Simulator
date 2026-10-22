import {BallWorld as FrozenWorld,smooth} from '../ballfeel12/world.js';
import {PROPOSED} from './config.js';
// Shared rolling resistance plus a continuous near-zero impact transition.
// Meaningful impacts (normal speed >= .4 m/s), airborne/Magnus, sliding, CCD and
// sleep retain the approved response. No intent or target is read by this class.
export class BallWorld extends FrozenWorld {
 constructor({microContact=true,...options}={}) { super({...PROPOSED,...options});this.microContact=microContact; }
 impulse(hit){
  // The old abrupt e=0/.6 boundary at .2 m/s can sustain submillimetre chatter
  // under downward Magnus at 240 Hz. Fade restitution through .2–.4 m/s instead.
  // At .4 m/s the old .6 response returns exactly (gravity-only rebound ~3 mm).
  // Tangential Coulomb impulse is still computed by the original contact solver.
  const inward=-this.ball.v[1],old=this.cfg.turfRestitution;
  if(this.microContact&&!hit.c&&inward>0&&inward<.4)this.cfg.turfRestitution=old*smooth(.2,.4,inward);
  try{super.impulse(hit);}finally{this.cfg.turfRestitution=old;}
 }
}

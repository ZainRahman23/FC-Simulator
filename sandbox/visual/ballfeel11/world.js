import {BallWorld as FoundationWorld} from '../ballphys1/ball.js';
import {dnorm} from '../physchar2/core/v2_math.js';
// Global surface policy only. The approved solver still owns all state, slip
// impulses, rolling constraint, sleep, launch arbitration, CCD and contacts.
export const LAWS=Object.freeze({
 control:{id:'control',label:'Control · 0.90',constant:.9},
 moderate:{id:'moderate',label:'Moderate · 1.50',constant:1.5},
 strong:{id:'strong',label:'Strong · 2.10',constant:2.1},
 responsive:{id:'responsive',label:'Progressive turf',high:1.2,low:5,knee:8,terminal:.6}
});
export function resistance(speed,law=LAWS.responsive){
 if(law.constant!==undefined)return law.constant;
 // Smooth rational blend: modest at speed, stronger through the middle, then
 // a viscous terminal taper to zero acceleration. No speed threshold / brake.
 const q=speed/law.knee;
 return (law.high+(law.low-law.high)/(1+q*q))*speed/(speed+law.terminal);
}
export class BallWorld extends FoundationWorld{
 constructor({rollingLaw=LAWS.responsive,...options}={}){
  super(options);
  const numeric=['constant','high','low','knee','terminal'];
  const good=rollingLaw&&numeric.filter(k=>k in rollingLaw).every(k=>typeof rollingLaw[k]==='number'&&Number.isFinite(rollingLaw[k])&&rollingLaw[k]>=0);
  if(!good||!(rollingLaw.constant>=0)&&!(rollingLaw.high>=0&&rollingLaw.low>=rollingLaw.high&&rollingLaw.knee>0&&rollingLaw.terminal>0))throw Error('Invalid rolling law');
  this.rollingLaw=Object.freeze({...rollingLaw});
 }
 ground(h){
  const original=this.cfg.rollingDecel;
  // Sample once per 240 Hz substep. Sliding friction is untouched; the base
  // method applies this value ONLY after its slip impulse achieves rolling.
  this.cfg.rollingDecel=resistance(dnorm(this.ball.v[0],this.ball.v[2]),this.rollingLaw);
  try{super.ground(h);}finally{this.cfg.rollingDecel=original;}
 }
}

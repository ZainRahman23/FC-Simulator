import {BallWorld as ApprovedWorld} from '../ballfeel11/world.js';
import {GLOBAL} from '../ballfeel11/config.js';
import {add,mul,cross,len,norm} from '../ballphys1/math.js';
import {dsin,dcos,dexp} from '../physchar2/core/v2_math.js';
export function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
export const CONTACT_CONTROL=Object.freeze({id:'approved',boost:0,start:20.5,end:26,staticBoost:0,staticStart:17.5,staticEnd:22});
export const CURVE_CONTROL=Object.freeze({id:'approved',gain:1,early:1,lowSpeed:16,highSpeed:23,spinStart:45,spinFull:85,cap:1.2,quench:0,quenchLow:12,quenchHigh:16,fadeLow:0,fadeHigh:0,tail:1,spinCap:0});
export class BallWorld extends ApprovedWorld{
 constructor({contactLaw=CONTACT_CONTROL,curveLaw=CURVE_CONTROL,...options}={}){
  super({...options,parameters:{...GLOBAL,...options.parameters}});
  this.contactLaw={...CONTACT_CONTROL,...contactLaw};
  this.curveLaw={...CURVE_CONTROL,...curveLaw};
  for(const law of [this.contactLaw,this.curveLaw])for(const [key,value] of Object.entries(law)){
   if(key==='id'){if(typeof value!=='string')throw Error('Invalid response id');}
   else if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Invalid global response: '+key);
  }
  const a=this.contactLaw,b=this.curveLaw;
  if(a.end<=a.start||a.staticEnd<=a.staticStart||b.highSpeed<=b.lowSpeed||b.spinFull<=b.spinStart||b.quenchHigh<=b.quenchLow||b.fadeHigh<b.fadeLow)throw Error('Invalid response interval');
 }
 ground(h){const original=this.cfg.slideFriction,c=this.contactLaw;const b=this.ball,speed=len(b.v),r=this.cfg.radius,slip=len(add(b.v,cross(b.w,[0,-r,0])))/Math.max(speed,r*len(b.w),.05);this.cfg.slideFriction=original+c.boost*smooth(c.start,c.end,speed)+c.staticBoost*smooth(c.staticStart,c.staticEnd,speed)*(1-smooth(.15,.4,slip));try{super.ground(h);}finally{this.cfg.slideFriction=original;}}
 air(h,supported){
  const b=this.ball,c=this.cfg,law=this.curveLaw,activation=smooth(law.spinStart,law.spinFull,Math.abs(b.w[1]));
  // Exact approved path for ordinary actions and supported contact. Activation
  // depends on physical yaw spin, never action ID, target or elapsed flight time.
  if(supported||activation===0||(law.gain===1&&law.early===1&&law.quench===0))return super.air(h,supported);
  b.v[1]-=c.gravity*h;const speed=len(b.v),k=.5*c.airDensity*Math.PI*c.radius*c.radius/c.mass;
  if(speed>1e-9){b.v=mul(b.v,1/(1+k*c.dragCoefficient*speed*h));const v=len(b.v),mag=cross(b.w,b.v),m=len(mag),perp=m/Math.max(v,1e-9),S=c.radius*perp/Math.max(v,.1),late=1-smooth(law.lowSpeed,law.highSpeed,v),response=law.early+(law.gain-law.early)*late,windowed=law.fadeHigh>law.fadeLow?law.tail+(response-law.tail)*smooth(law.fadeLow,law.fadeHigh,v):response,spinScale=law.spinCap>0?Math.min(1,law.spinCap/Math.abs(b.w[1])):1,gain=1+activation*(windowed-1)*spinScale,cl=Math.min(c.maxLift+(law.cap-c.maxLift)*activation,c.liftSlope*S*gain);if(m>1e-9){const axis=norm(cross(b.v,mag)),angle=k*cl*v*h;b.v=add(mul(b.v,dcos(angle)),mul(cross(axis,b.v),dsin(angle)));}}
  b.w=mul(b.w,dexp(-c.airSpinDecay*h));
  // Extra rotational drag at low flight speed dissipates large yaw spin after
  // a rebound; no normal impulse/restitution change and no return-path force.
  const extra=law.quench*activation*(1-smooth(law.quenchLow,law.quenchHigh,len(b.v)));
  if(extra>0)b.w[1]*=dexp(-extra*h);
 }
}

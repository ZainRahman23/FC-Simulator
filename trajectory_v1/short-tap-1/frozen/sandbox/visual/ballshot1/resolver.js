import {PLAYER,CONTEXT,FAMILIES,BRACKETS} from './config.js';
const bounded=(v,min,max,name)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error(`${name} must be in [${min},${max}]`);return v;};
const unit=(v,name)=>bounded(v,0,1,name);
// Bounded, monotone, convex capability; 99/80 speed ratio is about 1.210, not 99/80.
// This isolated experiment chooses a convex quadratic on the finite rating domain [1,99].
export function capability(shotPower){const t=bounded(shotPower,1,99,'shotPower')/99;return .65+.65*t*t;}
export function resolveShot(input={}){
 const family=input.family,tech=FAMILIES[family];if(!tech)throw Error('Unknown shot family');
 const bracket=input.bracket??'fast',index=BRACKETS.indexOf(bracket);if(index<0)throw Error('Unknown speed bracket');
 const player={...PLAYER,...input.attributes,shotPower:input.shotPower??input.attributes?.shotPower??PLAYER.shotPower};
 for(const key of ['shotPower','finishing','longShots','curve','technique','weakFoot'])bounded(player[key],1,99,key);
 if(!['L','R'].includes(player.preferredFoot))throw Error('Invalid preferred foot');
 const context={...CONTEXT,...input.context,executionQuality:input.executionQuality??input.context?.executionQuality??1,charge:input.charge??input.context?.charge??1};
 for(const key of ['pressure','stamina','energy','bodySetup','executionQuality','charge'])unit(context[key],key);
 if(!['L','R'].includes(context.selectedFoot))throw Error('Invalid selected foot');
 if(!Array.isArray(context.startingVelocity)||context.startingVelocity.length!==3||context.startingVelocity.some(v=>v!==0))throw Error('This calibration supports a stationary ball only');
 if(!Array.isArray(context.contactPosition)||context.contactPosition.length!==3||context.contactPosition.some((v,i)=>v!==[0,.11,0][i]))throw Error('Use scheduledLaunch contact.position for authoritative non-default contact');
 const handed=context.selectedFoot==='R'?1:-1;
 const yawDeg=bounded(input.aim?.yawDeg??tech.yawDeg*handed,-75,75,'aim.yawDeg'),angleDeg=bounded(input.aim?.elevationDeg??tech.angleDeg,0,75,'aim.elevationDeg');
 // Neutral technique ratings are disclosed and reserved for future accuracy/spin
 // calibration. They are not quietly used as extra power multipliers.
 const footFactor=context.selectedFoot===player.preferredFoot?1:.72+.28*player.weakFoot/99;
 const executionFactor=(.75+.25*context.executionQuality)*(.85+.15*context.bodySetup)*(1-.10*context.pressure)*(.85+.15*Math.min(context.energy,context.stamina))*footFactor;
 const chargeFactor=context.charge; // Deliberate action weight, not player rating.
 const strikeCapability=capability(player.shotPower),ratingRatio=strikeCapability/capability(80);
 // Explicit conversion and action commitment are independently configured.
 // POWER uses the same direct conversion as LACES, with commitment39/34.
 const referenceLacesSpeed=34,conversion=tech.conversion,bracketScale=tech.bracketScale[index],speed=referenceLacesSpeed*ratingRatio*conversion*tech.commitment*bracketScale*chargeFactor*executionFactor;
 const yaw=yawDeg*Math.PI/180,angle=angleDeg*Math.PI/180,horizontal=speed*Math.cos(angle),velocity=[horizontal*Math.cos(yaw),speed*Math.sin(angle),horizontal*Math.sin(yaw)];
 const side=tech.sideSpin*handed,back=tech.backSpin;
 // Local backspin axis is perpendicular to aim in the horizontal plane.
 const spin=[-Math.sin(yaw)*back,side,Math.cos(yaw)*back],spinMagnitude=Math.hypot(...spin),spinAxis=spinMagnitude?spin.map(x=>x/spinMagnitude):[0,0,0];
 const audit={version:'BALL-SHOT-1',family,technique:family,bracket,shotPower:player.shotPower,attributes:player,context,aim:{yawDeg,elevationDeg:angleDeg,kind:'fixed launch angles; no target correction'},speed,horizontalVelocity:[velocity[0],velocity[2]],horizontalSpeed:horizontal,verticalVelocity:velocity[1],velocity:velocity.slice(),angularVelocity:spin.slice(),spin:spin.slice(),spinMagnitude,spinAxis,launchAngleDeg:angleDeg,prepareSeconds:tech.prepareSeconds,commitment:tech.commitment,strikeCapability,referenceCapability:capability(80),ratingRatio,referenceLacesSpeed,techniqueConversion:conversion,bracketScale,chargeFactor,executionFactor,formula:'speed = reference LACES speed × nonlinear capability ratio × technique conversion × explicit commitment × bracket scale × charge × execution/context; aim decomposes once; spin resolves once',frozenEnvironment:'BALL-FEEL-1.4 Candidate A; unchanged physical solver and fc-b curve law',neutralAttributesReserved:['finishing','longShots','curve','technique'],postLaunchControl:false};
 return {velocity,spin,audit};
}
export const resolveLaunch=resolveShot;
export function scheduledLaunch(intent,contact={}){
 const r=resolveShot(intent),position=(contact.position??[0,.11,0]).slice();
 if(position.length!==3||position.some(v=>!Number.isFinite(v)))throw Error('Invalid contact position');
 const facts={tick:contact.tick??0,preparedAt:contact.preparedAt??0,position:position.slice(),colliderId:contact.colliderId??null};
 if(!Number.isInteger(facts.tick)||facts.tick<0||!Number.isFinite(facts.preparedAt)||facts.preparedAt<0)throw Error('Invalid contact timing');
 const metadata={...r.audit,context:{...r.audit.context,contactPosition:position.slice()},contact:facts};
 return {id:intent.actionId??`${intent.family.toLowerCase()}-${intent.bracket??'fast'}`,tick:facts.tick,position,preparedAt:facts.preparedAt,colliderId:contact.colliderId,velocity:r.velocity,spin:r.spin,metadata};
}

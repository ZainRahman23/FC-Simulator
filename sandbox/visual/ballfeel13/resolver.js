import {resolveLaunch as approvedResolve} from '../ballfeel12/resolver.js';
export {resolveExecution,fromLegacyDecision} from '../ballfeel12/resolver.js';
// Opt-in review candidates, not new match defaults. Deliberate intent is resolved
// once. The world receives no candidate, target, hop count or desired trajectory.
export function resolveLaunch(intent,{turfCandidate,...selection}={}){
 const launch=approvedResolve(intent,selection),c=turfCandidate;
 if(!c||c.control)return launch;
 if(c.family!==intent.family)throw Error('Turf candidate / action family mismatch');
 const scale=c.speedScale??1,lift=Math.max(0,(intent.lift??c.lift)+(intent.execution?.liftMps??0));
 if(!Number.isFinite(scale)||scale<=0||scale>1||!Number.isFinite(lift)||lift>14||c.fraction!==null&&(!Number.isFinite(c.fraction)||Math.abs(c.fraction)>1))throw Error('Invalid turf launch proposal');
 launch.velocity=[launch.velocity[0]*scale,lift,launch.velocity[2]*scale];
 // A raised ground launch must keep deliberate forward spin: the old resolver's
 // default for lifted ground families is zero spin. Explicit caller spin wins.
 if(c.fraction!==null&&intent.spinOverride===undefined)launch.spin=[c.fraction*launch.velocity[2]/.11,launch.spin[1],-c.fraction*launch.velocity[0]/.11];
 launch.audit={...launch.audit,version:'BALL-FEEL-1.3 opt-in',turfCandidate:c.id,approvedLaunch:approvedResolve(intent,selection),horizontalSpeed:Math.hypot(launch.velocity[0],launch.velocity[2]),liftMps:lift,forwardRollingFraction:c.fraction,physics:'frozen BALL-FEEL-1.2'};
 return launch;
}
export function scheduledLaunch(intent,selection={},contact={}){const r=resolveLaunch(intent,selection);return {id:intent.actionId,tick:contact.tick??0,position:(contact.position??[0,.11,0]).slice(),preparedAt:contact.preparedAt??0,colliderId:contact.colliderId,velocity:r.velocity,spin:r.spin,metadata:r.audit};}

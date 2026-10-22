import {resolveLaunch as approvedResolve} from '../ballfeel11/resolver.js';
import {FAMILIES,GLOBAL,DRIVEN,CURVES} from './config.js';
export {resolveExecution,fromLegacyDecision} from '../ballfeel11/resolver.js';
// Candidate launch-state proposals only. Ordinary families delegate unchanged.
// No ball/world reference, target following, callbacks or future impulses.
export function resolveLaunch(intent,{driven=DRIVEN[2],curve=CURVES[2]}={}){
 if(intent.family==='driven'){
  const shift=driven.speed-30,families={...FAMILIES,driven:{...FAMILIES.driven,horizontal:FAMILIES.driven.horizontal.map(v=>v+shift),rollingFraction:driven.fraction}};
  const launch=approvedResolve(intent,GLOBAL,families);
  if(driven.id!=='control')launch.audit={...launch.audit,version:'BALL-FEEL-1.2 proposal',candidate:driven.id,contactLaw:structuredClone(driven.contact)};
  return launch;
 }
 if(intent.family==='curve'){
  const launch=approvedResolve(intent,GLOBAL,{...FAMILIES,curve:{...FAMILIES.curve,sideSpin:curve.spin}});
  // A continuous attainable-spin ceiling at launch, shared by inside/outside.
  // Technique still selects sign and scales lower skill/execution. Explicit
  // diagnostic spin overrides retain the approved boundary contract.
  if(curve.id!=='control'&&intent.spinOverride===undefined){
   const raw=launch.spin[1];launch.spin[1]=Math.max(-80,Math.min(80,raw));
   launch.audit={...launch.audit,version:'BALL-FEEL-1.2 proposal',sideSpinRadS:launch.spin[1],unboundedSideSpinRadS:raw,sideSpinCeiling:80,curveLaw:structuredClone(curve.law)};
  }
  return launch;
 }
 return approvedResolve(intent);
}
export function scheduledLaunch(intent,selection={},contact={}){const launch=resolveLaunch(intent,selection);return {id:intent.actionId,tick:contact.tick??0,position:(contact.position??[0,.11,0]).slice(),preparedAt:contact.preparedAt??0,colliderId:contact.colliderId,velocity:launch.velocity,spin:launch.spin,metadata:launch.audit};}

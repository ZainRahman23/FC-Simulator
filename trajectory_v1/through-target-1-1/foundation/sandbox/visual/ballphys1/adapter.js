import {PARAMETERS} from './ball.js';
// Boundary accepts resolved football state, never reads an animation motor,
// resamples RNG, chooses a foot, nor reapplies an execution-quality multiplier.
// Legacy pitch coordinates: x,y horizontal; z height ABOVE ground contact.
// Kernel: [x, height of sphere centre, pitch-y]. Permutation changes handedness;
// angular velocity is an axial vector and transforms with determinant -1.
export const legacyVector=v=>[v[0],v[2],v[1]];
export const legacyAngular=w=>[-w[0],-w[2],-w[1]];
export function resolvedAction(result,{id,tick,colliderId,spin,preparedAt}={}){
 if(!result||![result.x,result.y,result.z,result.vx,result.vy,result.vz].every(Number.isFinite))throw Error('Resolved action requires finite full state');
 const velocity=[result.vx,result.vz,result.vy];
 // Ground actions have a provisional rolling-consistent spin. Aerial spin
 // MUST be explicit or stays zero: the legacy scalar curve is not rad/s.
 const angular=spin||(result.z<=0&&result.vz===0?[result.vy/PARAMETERS.radius,0,-result.vx/PARAMETERS.radius]:[0,0,0]);
 return {id,tick,position:[result.x,result.z+PARAMETERS.radius,result.y],velocity,spin:angular,colliderId,preparedAt,
  metadata:{...result.metadata,source:'resolved Touchline state',selectedFoot:result.selectedFoot,preferredFoot:result.preferredFoot,family:result.family,technique:result.technique}};
}
export function physicalToLegacy(ball){return {x:ball.p[0],y:ball.p[2],z:ball.p[1]-PARAMETERS.radius,vx:ball.v[0],vy:ball.v[2],vz:ball.v[1],angularVelocity:legacyAngular(ball.w),orientation:ball.q.slice()};}
// Initial local matching only; this coefficient is a calibration proposal, not
// a reinterpretation of legacy spin as measured angular velocity.
export function spinForLegacyCurve(s,sgn=1,k=0.121){const c=PARAMETERS,dragArea=0.5*c.airDensity*Math.PI*c.radius*c.radius/c.mass;return [0,k*s*sgn/(dragArea*c.liftSlope*c.radius),0];}
// V2/Jolt GL world uses z = -pitch-y. Reflection requires both shape-local
// geometry and orientations to transform, and axial vectors get det(S)S.
const reflect=v=>[v[0],v[1],-v[2]],axial=w=>[-w[0],-w[1],w[2]],reflectQ=q=>[-q[0],-q[1],q[2],q[3]];
export function fromTurn1Frame(frame){
 return {id:frame.id,p:reflect(frame.position),q:reflectQ(frame.rotation),v:reflect(frame.linearVelocity),w:axial(frame.angularVelocity),epoch:frame.time,material:frame.material||'boot',
  shapes:frame.shapes.map(s=>({...s,pos:reflect(s.pos||[0,0,0]),rot:reflectQ(s.rot||[0,0,0,1]),...(s.points?{points:s.points.map(reflect)}:{})})),
  locomotionState:frame.locomotionState,supportState:frame.supportState,deliberateWindow:frame.deliberateWindow};
}
export function impulseToTurn1(event){return {id:event.collider,time:event.time,point:reflect(event.point),impulse:reflect(event.oppositeImpulse)};}

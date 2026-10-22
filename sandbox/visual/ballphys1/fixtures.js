import {generateSpec} from '../physchar2/spec/v2_spec.js';
import {add} from './math.js';
export const CHARACTER=generateSpec();
export function bodyFixture(name,p,v=[0,0,0],id=name,q=[0,0,0,1],w=[0,0,0]){
 const b=CHARACTER.bodies.find(b=>b.name===name);if(!b)throw Error('Unknown V2 body '+name);
 return {id,p,v,q,w,material:b.material,shapes:b.shapes,provenance:{spec:CHARACTER.version,body:name,mass:b.mass,mode:'kinematic prescribed trajectory'}};
}
export function goal(x=20){return [
 {id:'post-near',p:[x,1.22,-3.66],material:'post',shapes:[{type:'capsule',r:0.06,half:1.22}]},
 {id:'post-far',p:[x,1.22,3.66],material:'post',shapes:[{type:'capsule',r:0.06,half:1.22}]},
 {id:'crossbar',p:[x,2.44,0],material:'post',shapes:[{type:'capsule',r:0.06,half:3.66,rot:[Math.SQRT1_2,0,0,Math.SQRT1_2]}]}
 ];}
export function fullCharacter(offset=[0,0,0],prefix='player',v=[0,0,0]){return CHARACTER.bodies.map(b=>bodyFixture(b.name,add(b.origin,offset),v,`${prefix}:${b.name}`));}

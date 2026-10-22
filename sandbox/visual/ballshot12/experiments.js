import {simulateAction} from '../ballshot1/experiments.js';
import {scheduledLaunch} from './resolver.js';
import {VISUAL_RATINGS} from './config.js';
export {BallWorld,simulateAction} from '../ballshot1/experiments.js';
export function ratingRun(family,shotPower,options={}){
 const id=`${family.toLowerCase()}-${shotPower}`,action=scheduledLaunch({family,shotPower,bracket:'fast',charge:1,actionId:id});
 const r=simulateAction(action,{id,title:`${family} · Shot Power ${shotPower}`,target:19,duration:4,...options});
 return {...r,definition:{id,family,shotPower,bracket:'fast',distance:19}};
}
export function visualRuns(){return Object.entries(VISUAL_RATINGS).flatMap(([family,ratings])=>ratings.map(r=>ratingRun(family,r)));}
export function parityPayload(){return visualRuns().map(r=>({id:r.id,frames:r.frames,events:r.events}));}

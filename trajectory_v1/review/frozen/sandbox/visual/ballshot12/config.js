// BALL-SHOT-1.2 changes launch capability only. Previous labs remain frozen.
import {PLAYER as PREVIOUS_PLAYER,FAMILIES as PREVIOUS} from '../ballshot11/config.js';
export {CONTEXT,BRACKETS,FAMILY_ORDER,GLOBAL,PROPOSED,TURF} from '../ballshot11/config.js';
export const PLAYER=Object.freeze({...PREVIOUS_PLAYER,id:'controlled-90',shotPower:90});
export const REFERENCE_RATING=90;
export const CHIP_RATING_EXPONENT=0.5;
export const RATINGS=Object.freeze([40,50,60,70,80,90,95,99]);
export const VISUAL_RATINGS=Object.freeze({LACES:[50,60,70,80,90,99],POWER:[50,60,70,80,90,99],CHIP:[50,70,90,99]});
export const FAMILIES=Object.freeze(Object.fromEntries(Object.entries(PREVIOUS).map(([key,f])=>[key,Object.freeze({
 ...f,
 ...(key==='OUTSIDE'?{speeds:f.speeds.map(v=>v*31/32),conversion:31/34}:{}),
 note:key==='CHIP'?'90-SP anchor 17 m/s; square root of the shared capability ratio compresses rating response.':key==='POWER'?'90-SP anchor 39 m/s; unchanged 39/34 commitment and 0.65 s preparation.':key==='OUTSIDE'?'90-SP anchor 31 m/s; existing outside-foot spin, aim and curve law preserved.':`90-SP anchor ${f.speeds[1]} m/s; existing technique preserved.`
})])));

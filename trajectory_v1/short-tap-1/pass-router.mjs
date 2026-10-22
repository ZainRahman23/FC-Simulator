// Family dispatch only. The legacy Through and Cross resolver remains byte-identical.
import * as legacy from './resolver.mjs';
import {solveShort,executeShort,prepareShort,shortCharge} from './short-pass.mjs';
export {defaultInput,C,measurements,validateInput} from './resolver.mjs';
export {SHORT,shortPace,arrivalCeiling,selectShortReceiver} from './short-pass.mjs';
export const solveIdeal=i=>i.family==='SHORT'?solveShort(i):legacy.solveIdeal(i);
export const execute=(i,s)=>i.family==='SHORT'?executeShort(i,s):legacy.execute(i,s);
export const preparePass=i=>i.family==='SHORT'?prepareShort(i):legacy.preparePass(i);
export const chargeFor=(family,ms)=>family==='SHORT'?shortCharge(ms):legacy.charge(ms);

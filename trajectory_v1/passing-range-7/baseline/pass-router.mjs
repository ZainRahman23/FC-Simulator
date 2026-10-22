// Family dispatch; weighted accuracy is composed inside each execution path.
import * as legacy from './resolver.mjs';
import {solveSpace,executeSpace,prepareSpace,spaceCharge} from './space-pass.mjs';
import {solveShort,executeShort,prepareShort,shortCharge} from './short-pass.mjs';
export {defaultInput,C,measurements,validateInput} from './resolver.mjs';
export {SHORT,shortPace,arrivalCeiling,selectShortReceiver} from './short-pass.mjs';
export const solveIdeal=i=>i.family==='SHORT'?solveShort(i):solveSpace(i);
export const execute=(i,s)=>i.family==='SHORT'?executeShort(i,s):executeSpace(i,s);
export const preparePass=i=>i.family==='SHORT'?prepareShort(i):prepareSpace(i);
export const chargeFor=(family,ms)=>family==='SHORT'?shortCharge(ms):spaceCharge(family,ms);

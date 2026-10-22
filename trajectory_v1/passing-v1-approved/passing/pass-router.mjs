// Family dispatch; weighted accuracy is composed inside each execution path.
import * as legacy from './resolver.mjs';
import {solveSpace,executeSpace,prepareSpace,spaceCharge} from './space-pass.mjs';
import {solveShort,executeShort,prepareShort,shortCharge} from './short-pass.mjs';
import {assistInput} from './target-assistance.mjs?v=depth9b';
export {defaultInput,C,measurements,validateInput} from './resolver.mjs';
export {SHORT,shortPace,arrivalCeiling,selectShortReceiver} from './short-pass.mjs';
export function solveIdeal(i){
 const {input,assistance}=assistInput(i),s=input.family==='SHORT'?solveShort(input):solveSpace(input);
 return assistance?{...s,assistedInput:input,targetAssistance:assistance}:s;
}
export async function execute(i,s=solveIdeal(i)){
 const a=s.assistedInput,input=a?{...i,targetAssistance:false,receiver:a.receiver,candidates:a.candidates,aimPoint:a.aimPoint,...(i.family==='CROSS'?{requestedDistance:a.requestedDistance}:{})}:i;
 const p=i.family==='SHORT'?await executeShort(input,s):await executeSpace(input,s);
 if(s.targetAssistance){p.audit.targetAssistance=s.targetAssistance;p.audit.rawInput=structuredClone(i);}
 return p;
}
export const preparePass=async i=>execute(i,solveIdeal(i));
export const chargeFor=(family,ms)=>family==='SHORT'?shortCharge(ms):spaceCharge(family,ms);

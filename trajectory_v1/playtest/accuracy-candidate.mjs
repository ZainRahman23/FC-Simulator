import {dispersion as currentDispersion} from './foundation/locked-model.mjs';
export const ACCURACY_CANDIDATE=Object.freeze({id:'anchor60-current20',floor:.02,amplitude:12,exponent:1.5,anchorRating:60,referenceRating:20,verticalRatio:.6,status:'provisional owner review'});
export const ANCHOR_INCREMENT=currentDispersion(20,0).sigmaBaseH-ACCURACY_CANDIDATE.floor;
export const SATURATION_RATIO=ACCURACY_CANDIDATE.amplitude/ANCHOR_INCREMENT-1;
export const K=39*SATURATION_RATIO**(1/ACCURACY_CANDIDATE.exponent);
export function dispersion(accuracy,relativeSpeed,curve='current'){
 if(curve==='current')return currentDispersion(accuracy,relativeSpeed);
 if(curve!=='new')throw Error('Choose current or new accuracy curve');
 if(!Number.isFinite(accuracy)||accuracy<1||accuracy>99)throw Error('Accuracy must be 1–99');
 // Normalized Hill curve. The ratio evaluates to exactly 1 at x=39 and 0
 // at x=0, retaining the two anchor values without a rating lookup/branch.
 const t=((99-accuracy)/39)**ACCURACY_CANDIDATE.exponent;
 const sigmaBaseH=.02+ANCHOR_INCREMENT*(t*(1+SATURATION_RATIO)/(t+SATURATION_RATIO)),sigmaBaseV=.6*sigmaBaseH;
 const difficulty=1+.10*relativeSpeed**4,sigmaH=sigmaBaseH*difficulty,sigmaV=sigmaBaseV*difficulty;
 return {accuracy,sigmaBaseH,sigmaBaseV,difficulty,powerIncreasePercent:100*(difficulty-1),addedSigmaH:sigmaH-sigmaBaseH,addedSigmaV:sigmaV-sigmaBaseV,sigmaH,sigmaV,maxH:Math.sqrt(6)*sigmaH,maxV:Math.sqrt(6)*sigmaV};
}

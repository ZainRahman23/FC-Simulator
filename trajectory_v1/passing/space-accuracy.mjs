// Provisional passing-only execution calibration. Never used by Short Pass.
// The 99 floor is exactly the previous floor; only the rating-dependent part
// is widened and smoothly bounded. Curve is absent from accuracy difficulty.
import {C} from './config.mjs';
export const ACCURACY=Object.freeze({version:'PASSING-CALIBRATION-3-provisional',exponent:1.45,
 THROUGH:{yawGain:1.2,weightGain:1.35,elevationGain:1,yawBound:14,weightBound:.28,elevationBound:0,backspinTransfer:1.5},
 CROSS:{yawGain:1.2,weightGain:1.2,elevationGain:1.25,yawBound:14,weightBound:.30,elevationBound:8}});
export function candidatePrecision(family,rating,baseDifficulty,solved){
 const p=C.precision[family],c=ACCURACY[family],distance=solved.intent.distance,factor=((99-rating)/89)**ACCURACY.exponent;
 const extraTerms=family==='THROUGH'?{pace:.2*(Math.max(0,solved.solution.speed-15)/25)**2,dying:.2*(solved.solution.spin[2]/200)**2}:{height:.15*(solved.solution.requestedApex/7)**2};
 const ratingDifficulty=baseDifficulty+Object.values(extraTerms).reduce((a,b)=>a+b,0);
 const floors={direction:p.yawFloor*baseDifficulty,weight:p.weightFloor*baseDifficulty,elevation:p.elevationFloor*baseDifficulty};
 const spreads={direction:p.yawRange*c.yawGain*factor*ratingDifficulty,weight:p.weightRange*c.weightGain*factor*ratingDifficulty,elevation:p.elevationRange*c.elevationGain*factor*ratingDifficulty};
 return {model:'candidate',rating,factor,ratingDifficulty,extraTerms,floors,spreads,sigmaDirection:floors.direction+spreads.direction,sigmaWeight:floors.weight+spreads.weight,sigmaElevation:floors.elevation+spreads.elevation,bounds:{direction:c.yawBound,weight:c.weightBound,elevation:c.elevationBound},note:'Sigma fields are pre-saturation scale. Rating error uses bound × tanh(spread × z / bound), plus unchanged tiny floor × z.'};
}
export function candidateErrors(family,sigma,z){
 const ratingError={},error={};for(const k of ['direction','weight','elevation']){const b=sigma.bounds[k];ratingError[k]=b?b*Math.tanh(sigma.spreads[k]*z[k]/b):0;error[k]=sigma.floors[k]*z[k]+ratingError[k];}
 return {...error,ratingError,backspinMultiplier:family==='THROUGH'?1+ACCURACY.THROUGH.backspinTransfer*ratingError.weight:1};
}

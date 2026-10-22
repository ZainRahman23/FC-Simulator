// Provisional Cross-only calibration. The current stronger contact model
// consumes this effective rating; neither accuracy nor physics uses it.
export const SHIFT_EXPONENT=Math.log(80/60)/Math.log(90/70);
export const effectiveCrossCurve=curve=>60*(curve/70)**SHIFT_EXPONENT;
export const SECOND_SHIFT_EXPONENT=Math.log(80/70)/Math.log(90/80);
export const previousShiftedEquivalent=curve=>70*(curve/80)**SECOND_SHIFT_EXPONENT;
export const lowCurveGate=curve=>{const t=Math.min(1,Math.max(0,curve/40));return t*t*t*(10+t*(-15+6*t));};
export function crossCurveCalibration(curve,model='current'){
 if(!['current','shifted','newest'].includes(model))throw Error('Unknown Cross curve model');
 if(model==='newest'){const previousCurve=previousShiftedEquivalent(curve);return {model,previousCurve,effectiveCurve:effectiveCrossCurve(previousCurve),spinGate:lowCurveGate(curve)};}
 return {model,effectiveCurve:model==='shifted'?effectiveCrossCurve(curve):curve};
}

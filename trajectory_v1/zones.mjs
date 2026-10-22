// Calibration only. All pitch dimensions come from the frozen reference geometry.
// Owner-approved maximum width: the goal-line endpoints meet the box sides.
export function lockedFinishingRadius(geometry) { return geometry.penaltyWidth / 2; }
export const ELLIPSE_ROUNDOFF = 1e-12;
export const ZONE_LABELS = Object.freeze({1:'ZONE 1 — FINISHING',2:'ZONE 2 — LONG SHOTS',3:'ZONE 3 — MIXED'});

export function classifyZone(geometry, position, radius, finishing, longShots) {
  const {goalX,goalCentreZ,penaltyDepth,penaltyWidth}=geometry;
  if (![position.x,position.z,radius,finishing,longShots].every(Number.isFinite)) throw new Error('Inputs must be finite');
  if (radius<=0 || radius>penaltyWidth/2) throw new Error('Radius must fit within the penalty area');
  if ([finishing,longShots].some(v=>v<1||v>99)) throw new Error('Ratings must be between 1 and 99');
  const forward=goalX-position.x, lateral=position.z-goalCentreZ;
  // Compare world-space line coordinates directly so a line constructed from
  // authoritative dimensions has exactly the same inclusive representation.
  const insideBox=position.x>=goalX-penaltyDepth && position.x<=goalX &&
    position.z>=goalCentreZ-penaltyWidth/2 && position.z<=goalCentreZ+penaltyWidth/2;
  const ellipseValue=(lateral/radius)**2+(forward/penaltyDepth)**2;
  // A tiny dimensionless guard only absorbs arithmetic roundoff on the curve.
  const insideEllipse=insideBox && ellipseValue<=1+ELLIPSE_ROUNDOFF;
  const zone=!insideBox?2:insideEllipse?1:3;
  const finishingWeight=zone===1?1:zone===3?.5:0;
  const longShotsWeight=1-finishingWeight;
  const effectiveAccuracy=finishingWeight*finishing+longShotsWeight*longShots;
  return {zone,label:ZONE_LABELS[zone],insideBox,insideEllipse,forward,lateral,ellipseValue,finishingWeight,longShotsWeight,effectiveAccuracy};
}

export function ellipseApex(g) { return {x:g.goalX-g.penaltyDepth,z:g.goalCentreZ}; }

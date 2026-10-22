export const VERSION='SHOT-CHARGE-1';
export const RATINGS=Object.freeze([50,70,80,90,99]);
export const HOLDS=Object.freeze([80,120,180,250,350,450,600,800]);
export const CHARGE=Object.freeze({minimumHoldMs:80,fullHoldMs:600,floorFraction:.4,minimumAngleDeg:1.5,maximumAngleDeg:12});
export const SETUP=Object.freeze({origin:Object.freeze([86,.11,34]),goalPlaneX:105,targetDistance:19,yawDeg:0,family:'LACES',bracket:'fast',preferredFoot:'R',selectedFoot:'R',executionQuality:1,pressure:0,stamina:1,energy:1,bodySetup:1,startingVelocity:Object.freeze([0,0,0]),startingSpin:Object.freeze([0,0,0]),seed:0,dt:1/60,substeps:4,maxDuration:120,usefulSpeedThreshold:3,usefulDwellSeconds:.25,goalWidth:7.32,goalHeight:2.44,colliders:Object.freeze([])});
export const FORMULA=Object.freeze({
 registration:'80 ms is an isolated-harness hypothesis, not a verified existing game input threshold. Below 80 ms no launch is scheduled. Hold must be finite and nonnegative.',
 charge:'q = clamp((holdMs − 80) / 520, 0, 1)',
 speedFraction:'f(q) = 0.4 + 0.6 × (1 − (1 − q)²)',
 elevation:'θ(q) = 1.5° + 10.5° × q³ × (4 − 3q)',
 launch:'C = unchanged BALL-SHOT-1.2 clean LACES fast capability; speed = C f; horizontal = C f cos θ; vertical = C f sin θ; yaw = 0; spin = unchanged [0,0,−4] rad/s.',
 horizontalProof:'d(horizontal/C)/dq = (1−q)[1.2 cos θ − 12 × radians(10.5) × f × q² sin θ]. With f≤1, q≤1, θ≤12°, the bracket is ≥1.2 cos(12°)−12 radians(10.5) sin(12°) > 0.716. Thus forward speed increases up to q=1 with zero endpoint slope and remains constant above it.',
 tradeoff:'Elevation uses a quartic with zero derivative at full charge. A plain q³ angle has a nonzero endpoint derivative and would make forward speed fall near the cap despite increasing total speed. The quartic grows later, peaks in angular rate at q=2/3, then tapers. Full elevation is a review hypothesis.',
 extension:'Charge speed and charge elevation are separate pure functions. A future trajectory modifier can replace elevation before launch; no Low Driven modifier is implemented.',
 distance:'No distance targeting, trajectory correction, goal collision, or in-flight control. Range and goal-plane crossings are observers of the frozen physical world.'
});

import {SETUP as PREVIOUS_SETUP} from '../shotcharge1/config.js';
export const VERSION='SHOT-CHARGE-1.1';
export const RATINGS=Object.freeze([50,70,80,90,99]);
export const HOLDS=Object.freeze([80,180,250,350,450,600]);
export const SETUP=PREVIOUS_SETUP;
// Metres above turf, measured at the BALL-PHYS ball centre. No rating enters these anchors.
export const DEFAULT_PROFILE=Object.freeze({id:'middle',minimumApex:.32,maximumApex:3.0,selection:'provisional middle anchors; owner has not selected a winner'});
export const TAP_CANDIDATES=Object.freeze([
 Object.freeze({id:'tap-low',label:'Low',minimumApex:.22,maximumApex:3.0,previewHold:80}),
 Object.freeze({id:'tap-lowplus',label:'Low+',minimumApex:.32,maximumApex:3.0,previewHold:80}),
 Object.freeze({id:'tap-shotlike',label:'Shot-like',minimumApex:.45,maximumApex:3.0,previewHold:80})
]);
export const MAX_CANDIDATES=Object.freeze([2.7,3.0,3.3].map(x=>Object.freeze({id:`max-${x.toFixed(1).replace('.','')}`,label:`${x.toFixed(1)} m`,minimumApex:.32,maximumApex:x,previewHold:600})));
export const SOLVER=Object.freeze({minimumAngleDeg:0,maximumAngleDeg:45,iterations:30,apexTolerance:1e-6,maxPreviewSeconds:10});
export const FORMULA=Object.freeze({
 charge:'q = clamp((holdMs − 80) / 520, 0, 1); below 80 ms no shot',
 speed:'f = 0.40 + 0.60 × [1 − (1 − q)²]; speed = unchanged BALL-SHOT-1.2 Laces capability × f',
 shape:'g(q) = q³ × (4 − 3q); desired centre apex = minimumApex + (maximumApex − minimumApex) × g(q)',
 solve:'At fixed total speed and inherited spin, bisect initial elevation against first-flight apex measured by the unmodified BALL-PHYS world. Only the chosen initial velocity is launched.',
 objective:'One scalar: desired first-flight ball-centre apex. No reference distance, landing distance or goal-plane target is solved.',
 limits:'Deterministic bounded 0–45° low-angle search, 30 bisections, 1 micrometre apex tolerance; unreachable requests fail explicitly. No silent anchor or speed changes.',
 modularity:'Requested speed and trajectoryProfile are separate inputs to the pre-contact solver. No Low Driven action or other shot family is implemented.',
 afterContact:'A single authoritative launch; frozen gravity, drag, Magnus, spin decay, turf, bounce and rest determine every subsequent state. The world never reads the profile.'
});

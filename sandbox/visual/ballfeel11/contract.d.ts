/** Standalone proposal; not wired into the live match. X / height Y / pitch Z. */
export type Family = 'short'|'ground'|'firm'|'driven'|'loft'|'cross'|'chip'|'placed'|'shot'|'power'|'curve';
export type Technique = 'INSIDE'|'INSIDE_FINISH'|'OUTSIDE'|'LACES'|'LACES_POWER'|'CHIP';
export type Vec3 = [number,number,number];
export interface Execution {
  quality?: number; // normalized [0,1]; existing engine errors already embody skill
  yawRad?: number; // signed horizontal angle error; applied once
  weightFraction?: number; // multiplicative speed error: 1 + this value
  liftMps?: number; // additive vertical velocity error
  spinFraction?: number; // multiplicative sidespin error
  audit?: Record<string,unknown>;
}
export interface Intent {
  actionId: string; // stable causal identity; required when scheduled
  family: Family;
  power?: number; // normalized continuous intended weight [0,1]
  distance?: number; // metres, (0,60]; ground launch estimate / air measurement plane
  direction?: [number,number]; // nonzero horizontal [X,Z], normalized by resolver
  lift?: number; // vertical velocity m/s override, [0,14]
  curve?: number; // normalized requested sidespin [0,1]
  technique?: Technique;
  selectedFoot?: 'R'|'L';
  preferredFoot?: 'R'|'L'; // retained provenance; no automatic weak-foot multiplier
  attainablePower?: number; // upstream normalized capability [0,1]
  curveSkill?: number; // proposed upstream normalized Curve input [0,1]
  execution?: Execution; // already resolved; no RNG is called by resolveLaunch
  spinOverride?: Vec3; // authoritative world angular velocity, rad/s
}
export interface Launch {velocity: Vec3;spin: Vec3;audit: Record<string,unknown>}
export interface ScheduledLaunch {
  id: string;tick: number;position: Vec3;velocity: Vec3;spin: Vec3;
  colliderId?: string;preparedAt: number;metadata: Record<string,unknown>;
}
export function resolveLaunch(intent: Intent, globalParameters?: Record<string,number>, familyConfiguration?: Record<Family,unknown>, rollingLaw?: RollingLaw): Launch;
export function resolveExecution(input: {seed:number;actionId:string;quality?:number;pressure?:number;family?:Family;distance?:number}): Execution;
export function scheduledLaunch(intent: Intent, contact?: {tick?:number;position?:Vec3;colliderId?:string;preparedAt?:number}, globalParameters?: Record<string,number>, rollingLaw?: RollingLaw): ScheduledLaunch;
/** delta already includes receiver lead / chosen shot corner, before engine error. */
export function fromLegacyDecision(decision: Record<string,unknown>, target: {actionId:string;delta:[number,number];power?:number;selectedFoot?:'R'|'L';preferredFoot?:'R'|'L'}): Intent;

/** Global surface policy; never selected by action family/player. */
export type RollingLaw = { id?: string; label?: string; constant: number } |
 { id?: string; label?: string; high: number; low: number; knee: number; terminal: number };
/** Same physical environment for every proposed family. */
export interface FastFeelEnvironment {
 rollingLaw: RollingLaw;
 maxLift: number; // 1.20 game-calibrated global Magnus cap
 spinDecel: number; // 12 rad/s² ground yaw decay; independent of restitution
 turfRestitution: number; // 0.60, preserved
 slideFriction: number; // 0.30, preserved
}

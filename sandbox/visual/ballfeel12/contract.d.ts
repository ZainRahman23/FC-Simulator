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
export function resolveLaunch(intent: Intent, selection?: Selection): Launch;
export function resolveExecution(input: {seed:number;actionId:string;quality?:number;pressure?:number;family?:Family;distance?:number}): Execution;
export function scheduledLaunch(intent: Intent, selection?: Selection, contact?: {tick?:number;position?:Vec3;colliderId?:string;preparedAt?:number}): ScheduledLaunch;
/** delta already includes receiver lead / chosen shot corner, before engine error. */
export function fromLegacyDecision(decision: Record<string,unknown>, target: {actionId:string;delta:[number,number];power?:number;selectedFoot?:'R'|'L';preferredFoot?:'R'|'L'}): Intent;

/** Candidate selection happens before the authoritative launch. */
export interface ContactLaw {id:string;boost:number;start:number;end:number;staticBoost:number;staticStart:number;staticEnd:number}
export interface CurveLaw {id:string;gain:number;early:number;lowSpeed:number;highSpeed:number;spinStart:number;spinFull:number;cap:number;quench:number;quenchLow:number;quenchHigh:number;fadeLow:number;fadeHigh:number;tail:number;spinCap:number}
export interface DrivenCandidate {id:string;title:string;speed:number;fraction:number;contact:ContactLaw;note:string}
export interface CurveCandidate {id:string;title:string;spin:number;law:CurveLaw;note:string}
export interface Selection {driven?:DrivenCandidate;curve?:CurveCandidate}
/** World policies are global physical-state responses, never action callbacks. */
export interface Environment {contactLaw:ContactLaw;curveLaw:CurveLaw}

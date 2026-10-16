export interface TurfCandidate {
 readonly id: string;
 readonly title: string;
 readonly family: 'short' | 'ground' | 'firm' | 'driven' | 'power';
 readonly lift: number | null;
 readonly fraction: number | null;
 readonly speedScale?: number;
 readonly control?: boolean;
 readonly reject?: boolean;
 readonly note: string;
}
// This is an opt-in experiment selector at the deliberate launch boundary.
// Never pass TurfCandidate to BallWorld, incidental contacts, or rendering.
export interface TurfSelection { turfCandidate?: TurfCandidate }
export interface TurfImpact {
 time: number; x: number; z: number;
 pre: { v: number[]; w: number[]; energy: number };
 post: { v: number[]; w: number[]; energy: number };
 horizontalBefore: number; horizontalAfter: number;
 horizontalLoss: number; horizontalEnergyLoss: number;
 totalEnergyLoss: number; impulse: number[];
}

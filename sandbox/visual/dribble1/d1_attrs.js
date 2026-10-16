// ═══ dribble1/d1_attrs.js — the repository's REAL player attributes for DRIBBLE-1 (no duplicates, no new attributes) ═══
// Attribute names, the 1–99 scale, preferred_foot ('R' | 'L') and weak_foot (1–5) are simulator/fc_simulator/models.py Player; the normalisation is
// mathcore.py AttributeNormalizer.g: z = (value − mean) / max(4, sd), g = tanh(z / 2) ∈ (−1, 1) with the dataset's attribute_stats. Fatigue (fatigue.py
// effective_attribute) is applied by the caller when a match state exists; the lab uses fresh players. Profiles are copied from players.json.
// Attributes shape ONLY the resolved touch (error, feasible adjustment, tight touches at speed, weak-foot quality, recovery); never turf, ball or collisions.
export const SOURCE = {"file": "simulator/data/players.json", "data_version": "players-v3-4attrs"};
export const STATS = {"dribbling": {"mean": 77.01875, "sd": 17.25483138065518, "n": 160}, "ball_control": {"mean": 79.775, "sd": 14.31538293861695, "n": 160}, "agility": {"mean": 77.04375, "sd": 11.323902962401558, "n": 160}, "balance": {"mean": 74.15, "sd": 13.028367694376538, "n": 160}, "reactions": {"mean": 82.85625, "sd": 5.296072919133561, "n": 160}};
export const PROFILES = {
 "HIGH": {
  "player_id": "p024",
  "name": "Vinícius Júnior",
  "position": "LW",
  "preferred_foot": "R",
  "weak_foot": 3,
  "attributes": {
   "dribbling": 92.0,
   "ball_control": 89.0,
   "agility": 93.0,
   "balance": 88.0,
   "reactions": 84.0
  }
 },
 "AVERAGE": {
  "player_id": "p090",
  "name": "Viktor Gyökeres",
  "position": "ST",
  "preferred_foot": "R",
  "weak_foot": 3,
  "attributes": {
   "dribbling": 75.0,
   "ball_control": 78.0,
   "agility": 77.0,
   "balance": 72.0,
   "reactions": 82.0
  }
 },
 "POOR": {
  "player_id": "p060",
  "name": "Jonathan Tah",
  "position": "CB",
  "preferred_foot": "R",
  "weak_foot": 3,
  "attributes": {
   "dribbling": 58.0,
   "ball_control": 68.0,
   "agility": 47.0,
   "balance": 39.0,
   "reactions": 83.0
  }
 },
 "WEAKFOOT": {
  "player_id": "p119",
  "name": "Dani Carvajal",
  "position": "RB",
  "preferred_foot": "R",
  "weak_foot": 2,
  "attributes": {
   "dribbling": 75.0,
   "ball_control": 81.0,
   "agility": 75.0,
   "balance": 83.0,
   "reactions": 80.0
  }
 },
 "LEFT_HIGH": {
  "player_id": "p002",
  "name": "Ousmane Dembélé",
  "position": "ST",
  "preferred_foot": "L",
  "weak_foot": 5,
  "attributes": {
   "dribbling": 97.0,
   "ball_control": 97.0,
   "agility": 97.0,
   "balance": 88.0,
   "reactions": 94.0
  }
 }
};
export function g(name, value) { const s = STATS[name], mean = s ? s.mean : 70, sd = s ? Math.max(4, s.sd) : 12; return Math.tanh(((value - mean) / sd) / 2); }
export function norm(profile) { const o = {}; for (const k of Object.keys(STATS)) o[k] = g(k, profile.attributes[k] != null ? profile.attributes[k] : 50); return o; }

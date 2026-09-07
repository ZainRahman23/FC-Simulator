# SHARED AUTHORING MACHINERY for goalkeeper save sequences (presentation tooling only; nothing here touches the runtime).
# Ported from proto_dive/author_frames_v2.py (the LEFT far dive) and parametrized: the ground / flight frames come from a SET rig
# (base lineage), the bridge / post-contact frames from a CONTACT rig cut out of the approved contact PNG (never redrawn).
# Every frame records its root (the simulation root in canvas px), pixel scale, landmarks (screen px rel. root) and the pose.
import os, math, json, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, os.path.join(HERE, "..", "proto_dive"))
from gk_rig import mat_apply
from pixel_ops import stylize, outline, cleanup
from PIL import Image
S_LIVE = 0.4197                                   # live sprite scale at the keeper (screen px per base sprite px)

def joint(R, M, name, off): x, y = mat_apply(M[name], *R.parts[name].pivot); return (x + off[0], y + off[1])
def pin(R, pose, name, target, off, root="pelvis"):
    M = R.world(pose); x, y = joint(R, M, name, off); q = pose.setdefault(root, {}); q["dx"] = q.get("dx", 0) + (target[0] - x); q["dy"] = q.get("dy", 0) + (target[1] - y); return pose

class SetRig:
    """a SET-sprite rig (base lineage, pixel scale 1.0) with the part names of rig_w_set: head, torso(+_under), pelvis(+shorts_under),
    near_upper/near_fore/near_glove, far_upper/far_fore/far_glove, near_thigh(+_edge)/near_shin/near_boot, far_thigh/far_shin/far_boot"""
    def __init__(self, R, canvas=(160, 200), off=(16, 40), root=(63, 115), torso_vec=(-1.0, -31.0), rest_bend=(20.3, 15.3), label="SET/west"):
        self.R, self.canvas, self.off, self.root, self.torso_vec, self.rest_bend, self.label = R, canvas, off, root, torso_vec, rest_bend, label
        self.ps = S_LIVE
        self.near_foot = R.parts["near_boot"].pivot; self.far_foot = R.parts["far_boot"].pivot

class ContactRig:
    """a contact-pose rig: R, its root (sprite px), pixel scale, canvas/offset, and the landmark part names"""
    def __init__(self, R, root, scale, canvas, off, lm, label):
        self.R, self.root, self.scale, self.canvas, self.off, self.lm, self.label = R, root, scale, canvas, off, lm, label
        self.ps = S_LIVE * scale

class Author:
    def __init__(self, set_rig, contact_rig, out):
        self.S, self.C, self.OUT, self.FRAMES = set_rig, contact_rig, out, []; os.makedirs(out, exist_ok=True)
    # ── SET-rig frames ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    def set_frame(self, name, phase, t, pose, note, grounded, root_shift=(0, 0), style=0.0, clean=True, mirror_out=False):
        S = self.S; root = (S.root[0] + S.off[0] + root_shift[0], S.root[1] + S.off[1] + root_shift[1])
        if "near_thigh" in pose and "near_thigh_edge" in S.R.parts: pose["near_thigh_edge"] = dict(pose["near_thigh"])
        if "torso" in pose and "torso_under" in S.R.parts: pose["torso_under"] = dict(pose["torso"])
        img, M = S.R.render(pose, canvas=S.canvas, offset=S.off)
        if clean: img = cleanup(img)
        if style > 0: img = stylize(img, style)
        j = {n: tuple(round(v, 1) for v in joint(S.R, M, n, S.off)) for n in S.R.order}
        lm = {"head": j["head"], "lead_glove": j["near_glove"], "other_glove": j["far_glove"], "pelvis": j["pelvis"], "foot_L": j["far_boot"], "foot_R": j["near_boot"], "shoulder": j["near_upper"]}
        self.FRAMES.append({"name": name, "phase": phase, "t": t, "rig": S.R.name, "pose": pose, "note": note, "sources": [S.label], "grounded": grounded, "pixel_scale": 1.0,
                            "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm, "style": style})
        return pose
    def leg_ik(self, pose, thigh, shin, boot, target, forward=-1, tilt=0):
        R = self.S.R; M = R.world(pose); H = joint(R, M, thigh, (0, 0))
        K0 = R.parts[shin].pivot; A0 = R.parts[boot].pivot; T0 = R.parts[thigh].pivot
        L1 = math.hypot(K0[0] - T0[0], K0[1] - T0[1]); L2 = math.hypot(A0[0] - K0[0], A0[1] - K0[1])
        rest1 = math.atan2(K0[1] - T0[1], K0[0] - T0[0]); rest2 = math.atan2(A0[1] - K0[1], A0[0] - K0[0])
        dx, dy = target[0] - H[0], target[1] - H[1]; d = max(1e-6, min(L1 + L2 - 1e-3, math.hypot(dx, dy)))
        base = math.atan2(dy, dx); c = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); a = math.acos(c)
        best = None
        for sgn in (1, -1):
            th1 = base + sgn * a; K = (H[0] + L1 * math.cos(th1), H[1] + L1 * math.sin(th1)); th2 = math.atan2(target[1] - K[1], target[0] - K[0])
            score = forward * (K[0] - (H[0] + target[0]) / 2)
            if best is None or score > best[0]: best = (score, th1, th2)
        _, th1, th2 = best; par = pose.get("pelvis", {}).get("rot", 0)
        r1 = math.degrees(th1 - rest1) - par; r2 = math.degrees(th2 - rest2) - par - r1
        pose[thigh] = {**pose.get(thigh, {}), "rot": r1}; pose[shin] = {**pose.get(shin, {}), "rot": r2}; pose[boot] = {**pose.get(boot, {}), "rot": -(r1 + r2) + tilt}
        return pose
    def torso_for(self, head_s, hips_s, sx):
        """torso rot + sy so the head pivot lands at head_s given the hips at hips_s (screen px rel. root)"""
        S = self.S; TV = S.torso_vec
        wx, wy = (head_s[0] - hips_s[0]) / S.ps, (head_s[1] - hips_s[1]) / S.ps + 4
        L = math.hypot(wx, wy); sy = max(0.3, math.sqrt(max(1e-6, L * L - (TV[0] * sx) ** 2)) / abs(TV[1]))
        rest = math.atan2(TV[1] * sy, TV[0] * sx); T = math.degrees(math.atan2(wy, wx) - rest)
        return T, sy
    def arms(self, pose, A, T, k, ext=0, far_short=0, far_dx=0, spread=8, near_bend=None, far_bend=None):
        """A = upper-arm angle parameter (90 = hanging at rest; smaller = swinging forward/up on this facing); k = elbow opening 0..1"""
        rb_n, rb_f = self.S.rest_bend; lsx = pose.get("_limb_sx", 1.0)
        pose["near_upper"] = {"rot": A - 90 - T, "ext": ext, "sx": lsx}; pose["near_fore"] = {"rot": -(rb_n if near_bend is None else near_bend) * k, "ext": ext, "sx": lsx}
        pose["far_upper"] = {"rot": (A + spread) - 90 - T, "ext": -far_short, "dx": far_dx, "sx": lsx}; pose["far_fore"] = {"rot": -(rb_f if far_bend is None else far_bend) * k, "ext": -far_short, "sx": lsx}
        return pose
    def body(self, head, hips, sx=1.0, head_scale=1.0, head_look=0, limb_sx=1.0, root_shift=(0, 0)):
        """pelvis pinned on hips (screen px rel. root); torso rot/sy solved for the head; returns pose, T, root(canvas px)"""
        S = self.S; root = (S.root[0] + S.off[0] + root_shift[0], S.root[1] + S.off[1] + root_shift[1])
        T, sy = self.torso_for(head, hips, sx)
        pose = {"pelvis": {"rot": 0}, "torso": {"rot": T, "sy": sy, "sx": sx}, "head": {"rot": head_look - T * 0.35, "sx": head_scale, "sy": head_scale}, "_limb_sx": limb_sx}
        pin(S.R, pose, "pelvis", (root[0] + hips[0] / S.ps, root[1] + hips[1] / S.ps), S.off)
        return pose, T, root
    @staticmethod
    def finish(pose): pose.pop("_limb_sx", None); return pose
    def flight(self, name, phase, t, head, hips, A, k, ext, far_short, sx, head_scale, limb_sx, legs, legsy, style, root_shift, note, head_look=0, spread=8, far_dx=-2, boots_sy=None):
        """airborne frame from the SET rig: explicit leg rotations (pelvis frame; 0 = hanging straight down), foreshortened legs"""
        p, T, root = self.body(head, hips, sx=sx, head_scale=head_scale, limb_sx=limb_sx, root_shift=root_shift, head_look=head_look); p["_limb_sx"] = limb_sx
        p = self.arms(p, A, T, k, ext=ext, far_short=far_short, far_dx=far_dx, spread=spread)
        (ft, fs, fb), (nt, ns, nb) = legs
        p["far_thigh"] = {"rot": ft, "sy": legsy, "sx": limb_sx}; p["far_shin"] = {"rot": fs, "sy": legsy, "sx": limb_sx}; p["far_boot"] = {"rot": fb}
        p["near_thigh"] = {"rot": nt, "sy": legsy, "sx": limb_sx}; p["near_shin"] = {"rot": ns, "sy": legsy, "sx": limb_sx}; p["near_boot"] = {"rot": nb}
        return self.set_frame(name, phase, t, self.finish(p), note, "airborne", root_shift=root_shift, style=style)
    # ── CONTACT-rig frames (bridge, post-contact, landing) — hips pinned at `hips` (screen px rel. the root the frame is drawn at) ──
    def contact_frame(self, name, phase, t, pose, note, grounded, rot, hips, out_style=0.0, pelvis="pelvis"):
        C = self.C; R = C.R
        pose[pelvis] = {**pose.get(pelvis, {}), "rot": rot}
        root = (C.root[0] + C.off[0], C.root[1] + C.off[1])
        pin(R, pose, pelvis, (root[0] + hips[0] / C.ps, root[1] + hips[1] / C.ps), C.off, root=pelvis)
        img, M = R.render(pose, canvas=C.canvas, offset=C.off); img = cleanup(img)
        if out_style > 0: img = outline(img, out_style)
        j = {n: tuple(round(v, 1) for v in joint(R, M, n, C.off)) for n in R.order}
        def distal(n): x, y = mat_apply(M[n], *R.parts[n].bone["to"]); return (round(x + C.off[0], 1), round(y + C.off[1], 1))
        lm = {}
        for k, spec in C.lm.items():                    # spec: ("joint", part) or ("distal", part)
            kind, part = spec; lm[k] = j[part] if kind == "joint" else distal(part)
        self.FRAMES.append({"name": name, "phase": phase, "t": t, "rig": R.name, "pose": pose, "note": note, "sources": [C.label + " (parts)"], "grounded": grounded, "pixel_scale": C.scale,
                            "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm, "style": out_style})
        return pose
    # ── recovery in the 3/4 camera from the SET rig (base lineage; style fading back from the Pro look) ──
    def kneel_frame(self, name, phase, t, pose, note, grounded, ground_screen, style):
        S = self.S; root = (S.root[0] + S.off[0] - ground_screen[0] / S.ps, S.root[1] + S.off[1] - ground_screen[1] / S.ps)
        if "near_thigh" in pose and "near_thigh_edge" in S.R.parts: pose["near_thigh_edge"] = dict(pose["near_thigh"])
        if "torso" in pose and "torso_under" in S.R.parts: pose["torso_under"] = dict(pose["torso"])
        img, M = S.R.render(pose, canvas=S.canvas, offset=S.off); img = cleanup(img)
        if style > 0: img = stylize(img, style)
        j = {n: tuple(round(v, 1) for v in joint(S.R, M, n, S.off)) for n in S.R.order}
        lm = {"head": j["head"], "lead_glove": j["near_glove"], "other_glove": j["far_glove"], "pelvis": j["pelvis"], "foot_L": j["far_boot"], "foot_R": j["near_boot"], "shoulder": j["near_upper"]}
        self.FRAMES.append({"name": name, "phase": phase, "t": t, "rig": S.R.name, "pose": pose, "note": note, "sources": [S.label + " (rig)"], "grounded": grounded, "pixel_scale": 1.0,
                            "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm, "style": style})
    # ── save + report ──
    def save(self, extra=None):
        meta = []
        for f in self.FRAMES:
            f["img"].save(os.path.join(self.OUT, f["name"] + ".png"))
            R = self.S.R if f["rig"] == self.S.R.name else self.C.R; cv = self.S.canvas if R is self.S.R else self.C.canvas; off = self.S.off if R is self.S.R else self.C.off
            R.viz(f["pose"], scale=3, canvas=cv, offset=off, title=f["name"]).save(os.path.join(self.OUT, f["name"] + "_viz.png"))
            ps = self.S.ps if f["pixel_scale"] == 1.0 else self.C.ps; rx, ry = f["root"]
            f["screen"] = {k: (round((v[0] - rx) * ps, 1), round((v[1] - ry) * ps, 1)) for k, v in f["landmarks"].items()}
            meta.append({k: v for k, v in f.items() if k != "img"})
        json.dump({"canvas_set": self.S.canvas, "offset_set": self.S.off, "canvas_contact": self.C.canvas, "offset_contact": self.C.off, "frames": meta, **(extra or {})}, open(os.path.join(self.OUT, "frames.json"), "w"), indent=1)
        print(f"{'frame':24s} {'head':>14s} {'lead glove':>14s} {'other glove':>14s} {'pelvis':>14s} {'foot L':>14s} {'foot R':>14s} {'shoulder':>14s}  (screen px rel. root)")
        for f in self.FRAMES:
            s = f["screen"]; print(f"{f['name']:24s} " + " ".join(f"{str(s.get(k, '')):>14s}" for k in ("head", "lead_glove", "other_glove", "pelvis", "foot_L", "foot_R", "shoulder")))

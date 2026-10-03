// ═══ physchar2/tools/b_native/b_scan.cpp — INVESTIGATION B: native batch narrow-phase scan (many hull poses vs the turf box) ═══════════════
// Input (from tools/b_native/scan_poses.mjs, float32 bit patterns): H hulls (points, convex radius, hull tolerance), a turf box (half extents),
// the max separation distance, then Q queries (hull index, quaternion, centre-of-mass position). For each query it runs Jolt's own
// CollisionDispatch::sCollideShapeVsShape (shape 1 = hull, shape 2 = box: the physics step's order for a dynamic boot vs the static turf) and
// classifies every hit: REVERSED (penetration axis points up = "move the turf up"), FAR-FACE (turf-side face not the top surface), TILTED
// (|axis y| < 0.5) or VALID. Used to compare an unpatched build with opt-in diagnostic patches (P1 / P2) on identical inputs. DIAGNOSTIC ONLY.
#include <Jolt/Jolt.h>
#include <Jolt/RegisterTypes.h>
#include <Jolt/Core/Factory.h>
#include <Jolt/Physics/Collision/Shape/ConvexHullShape.h>
#include <Jolt/Physics/Collision/Shape/BoxShape.h>
#include <Jolt/Physics/Collision/CollisionDispatch.h>
#include <Jolt/Physics/Collision/CollideShape.h>
#include <Jolt/Physics/Collision/CollisionCollectorImpl.h>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <cmath>
#include <vector>
using namespace JPH;
extern int jph_b_trace, jph_b_p1, jph_b_p2;   // instrumented diagnostic build only: trace + opt-in patches P1 (GJK without the relative test) / P2 (EPA best triangle); env B_TRACE / B_P1 / B_P2
static float bits(unsigned u) { float f; std::memcpy(&f, &u, 4); return f; }
static float rd(FILE *f) { unsigned u; if (std::fscanf(f, "%u", &u) != 1) { std::fprintf(stderr, "read error\n"); std::exit(4); } return bits(u); }
int main(int argc, char **argv) {
  if (argc < 2) { std::fprintf(stderr, "usage: b_scan <poses.txt> [--list]\n"); return 2; }
  bool list = argc > 2 && !std::strcmp(argv[2], "--list"); long only = std::getenv("B_ONLY") ? std::atol(std::getenv("B_ONLY")) : -1;   // B_ONLY=<query index>: run that query alone (with B_TRACE)
  jph_b_trace = std::getenv("B_TRACE") ? 1 : 0; jph_b_p1 = std::getenv("B_P1") ? 1 : 0; jph_b_p2 = std::getenv("B_P2") ? 1 : 0;
  RegisterDefaultAllocator(); Factory::sInstance = new Factory(); RegisterTypes();
  FILE *f = std::fopen(argv[1], "r"); if (!f) return 3;
  unsigned H; std::fscanf(f, "%u", &H); std::vector<RefConst<Shape>> hulls;
  for (unsigned h = 0; h < H; ++h) { unsigned n; std::fscanf(f, "%u", &n); ConvexHullShapeSettings hs; for (unsigned i = 0; i < n; ++i) { float x = rd(f), y = rd(f), z = rd(f); hs.mPoints.push_back(Vec3(x, y, z)); }
    hs.mMaxConvexRadius = rd(f); float ht = rd(f); if (ht > 0) hs.mHullTolerance = ht; Shape::ShapeResult r = hs.Create(); if (r.HasError()) { std::fprintf(stderr, "hull %u: %s\n", h, r.GetError().c_str()); return 5; } hulls.push_back(r.Get()); }
  float hx = rd(f), hy = rd(f), hz = rd(f), sep = rd(f); BoxShapeSettings bs(Vec3(hx, hy, hz), 0.0f); RefConst<Shape> box = bs.Create().Get(); Mat44 T2 = Mat44::sTranslation(Vec3(0, -hy, 0));
  unsigned Qn; std::fscanf(f, "%u", &Qn); unsigned nHit = 0, nRev = 0, nFar = 0, nTilt = 0, qBad = 0;
  CollideShapeSettings cs; cs.mCollectFacesMode = ECollectFacesMode::CollectFaces; cs.mMaxSeparationDistance = sep; cs.mActiveEdgeMode = EActiveEdgeMode::CollideOnlyWithActive;
  for (unsigned q = 0; q < Qn; ++q) { unsigned hi; std::fscanf(f, "%u", &hi); float qx = rd(f), qy = rd(f), qz = rd(f), qw = rd(f), px = rd(f), py = rd(f), pz = rd(f);
    if (only >= 0 && (long)q != only) continue;
    Mat44 T1 = Mat44::sRotationTranslation(Quat(qx, qy, qz, qw), Vec3(px, py, pz)); AllHitCollisionCollector<CollideShapeCollector> coll; SubShapeIDCreator c1, c2;
    CollisionDispatch::sCollideShapeVsShape(hulls[hi], box, Vec3::sOne(), Vec3::sOne(), T1, T2, c1, c2, cs, coll); bool bad = false;
    for (const CollideShapeResult &r : coll.mHits) { nHit++; Vec3 a = r.mPenetrationAxis.Normalized(); bool far = false; for (const Vec3 &v : r.mShape2Face) if (std::fabs(v.GetY()) > 0.001f) far = true;
      if (a.GetY() > 0) { nRev++; bad = true; } else if (far) { nFar++; bad = true; } else if (a.GetY() > -0.5f) { nTilt++; bad = true; }
      if (list && (a.GetY() > 0 || far || a.GetY() > -0.5f)) std::printf("q %u hull %u axis %.5f %.5f %.5f depth %.4f mm\n", q, hi, (double)a.GetX(), (double)a.GetY(), (double)a.GetZ(), (double)r.mPenetrationDepth * 1000.0); }
    if (bad) qBad++; }
  std::printf("queries %u hits %u | REVERSED %u FAR-FACE %u TILTED %u | queries with an invalid hit %u\n", Qn, nHit, nRev, nFar, nTilt, qBad);
  return 0;
}

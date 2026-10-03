// ═══ physchar2/tools/b_native/b_query.cpp — INVESTIGATION B: native Jolt v5.6.0 harness for the single-query reproducer ═══════════════════
// Rebuilds the exact narrow-phase query of tools/b_narrow.mjs (shape 1 = one boot hull piece at its exact float32 centre-of-mass transform,
// shape 2 = the static turf box) and runs Jolt's own CollisionDispatch::sCollideShapeVsShape — the code path of PhysicsSystem::ProcessBodyPair
// and NarrowPhaseQuery::CollideShape. Input: the float32 BIT PATTERNS written by tools/b_native/dump2bits.mjs (exact, no decimal rounding).
// Build against a Jolt v5.6.0 checkout compiled with CROSS_PLATFORM_DETERMINISTIC=ON (see README.md). DIAGNOSTIC ONLY.
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
#include <vector>
#include <cstdlib>
using namespace JPH;
extern int jph_b_trace, jph_b_p1, jph_b_p2;   // instrumented diagnostic build only: trace + opt-in patches P1 (GJK without the relative test) / P2 (EPA best triangle); env B_TRACE / B_P1 / B_P2   // defined only in the INSTRUMENTED diagnostic Jolt build (README.md); set B_TRACE=1 to print GJK / EPA decisions
static float bits(unsigned u) { float f; std::memcpy(&f, &u, 4); return f; }
int main(int argc, char **argv) {
  if (argc < 2) { std::fprintf(stderr, "usage: b_query <bits.txt> [dx dy dz (float32 ulps added to position, for scans)]\n"); return 2; }
  jph_b_trace = std::getenv("B_TRACE") ? 1 : 0; jph_b_p1 = std::getenv("B_P1") ? 1 : 0; jph_b_p2 = std::getenv("B_P2") ? 1 : 0;
  RegisterDefaultAllocator(); Factory::sInstance = new Factory(); RegisterTypes();
  FILE *f = std::fopen(argv[1], "r"); if (!f) return 3;
  unsigned n, u[4]; if (std::fscanf(f, "%u", &n) != 1) return 4;
  std::vector<Vec3> pts; for (unsigned i = 0; i < n; ++i) { std::fscanf(f, "%u %u %u", &u[0], &u[1], &u[2]); pts.push_back(Vec3(bits(u[0]), bits(u[1]), bits(u[2]))); }
  unsigned ucr, uht, hasHt; std::fscanf(f, "%u %u %u", &ucr, &hasHt, &uht);
  std::fscanf(f, "%u %u %u %u", &u[0], &u[1], &u[2], &u[3]); Quat q(bits(u[0]), bits(u[1]), bits(u[2]), bits(u[3]));
  std::fscanf(f, "%u %u %u", &u[0], &u[1], &u[2]); float p[3] = { bits(u[0]), bits(u[1]), bits(u[2]) };
  std::fscanf(f, "%u %u %u", &u[0], &u[1], &u[2]); Vec3 he(bits(u[0]), bits(u[1]), bits(u[2]));
  std::fscanf(f, "%u", &u[0]); float sep = bits(u[0]); std::fclose(f);
  if (argc >= 5) for (int k = 0; k < 3; ++k) { int d = std::atoi(argv[2 + k]); unsigned b; std::memcpy(&b, &p[k], 4); b += d; std::memcpy(&p[k], &b, 4); }
  ConvexHullShapeSettings hs; for (const Vec3 &v : pts) hs.mPoints.push_back(v); hs.mMaxConvexRadius = bits(ucr); if (hasHt) hs.mHullTolerance = bits(uht);
  Shape::ShapeResult hr = hs.Create(); if (hr.HasError()) { std::fprintf(stderr, "hull: %s\n", hr.GetError().c_str()); return 5; }
  RefConst<Shape> hull = hr.Get();
  BoxShapeSettings bs(he, 0.0f); RefConst<Shape> box = bs.Create().Get();
  Mat44 T1 = Mat44::sRotationTranslation(q, Vec3(p[0], p[1], p[2])), T2 = Mat44::sTranslation(Vec3(0, -he.GetY(), 0));
  CollideShapeSettings cs; cs.mCollectFacesMode = ECollectFacesMode::CollectFaces; cs.mMaxSeparationDistance = sep; cs.mActiveEdgeMode = EActiveEdgeMode::CollideOnlyWithActive;
  AllHitCollisionCollector<CollideShapeCollector> coll; SubShapeIDCreator c1, c2;
  std::printf("hull convex radius used by Jolt: %.9g (requested %.9g), points %u\n", (double)static_cast<const ConvexHullShape *>(hull.GetPtr())->GetConvexRadius(), (double)bits(ucr), n);
  CollisionDispatch::sCollideShapeVsShape(hull, box, Vec3::sOne(), Vec3::sOne(), T1, T2, c1, c2, cs, coll);
  for (const CollideShapeResult &r : coll.mHits) { Vec3 a = r.mPenetrationAxis.Normalized();
    std::printf("hit: axis %.6f %.6f %.6f depth %.6f mm | p1.y %.4f mm p2.y %.4f mm | box face y:", (double)a.GetX(), (double)a.GetY(), (double)a.GetZ(), (double)r.mPenetrationDepth * 1000.0, (double)r.mContactPointOn1.GetY() * 1000.0, (double)r.mContactPointOn2.GetY() * 1000.0);
    for (const Vec3 &v : r.mShape2Face) std::printf(" %.3f", (double)v.GetY()); std::printf("\n"); }
  if (coll.mHits.empty()) std::printf("no hit\n");
  return 0;
}

// ═══ physchar2/tools/b_native/b_genscan.cpp — INVESTIGATION B: native generator + scanner (millions of resting-type poses, any hull) ════════
// Generic-geometry test of the narrow-phase defect: a convex hull (a plain cuboid by default, or the points of a b_narrow fixture) is placed
// with one of its OWN faces (Jolt's ConvexHullShape faces) exactly parallel to the turf, at gap g ∈ [gLo, gHi], random yaw, random position in
// ±R m, against a static box turf (half extents hx, hy, hz). Counts REVERSED results (penetration axis "move the turf up"). With B_P2=1 the
// opt-in diagnostic EPA patch is active (instrumented build). DIAGNOSTIC ONLY.
// usage: b_genscan <N> <gLo_mm> <gHi_mm> <R_m> <hx> <hy> <hz> [cuboid lx ly lz cr | fixture.bits] [seed]
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
extern int jph_b_trace, jph_b_p1, jph_b_p2;
static float bits(unsigned u) { float f; std::memcpy(&f, &u, 4); return f; }
static unsigned long long rs = 88172645463325252ULL; static double rnd() { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return (rs >> 11) * (1.0 / 9007199254740992.0); }
int main(int argc, char **argv) {
  if (argc < 8) { std::fprintf(stderr, "usage: b_genscan N gLo_mm gHi_mm R hx hy hz [cuboid lx ly lz cr | fixture.bits] [seed]\n"); return 2; }
  jph_b_trace = 0; jph_b_p1 = std::getenv("B_P1") ? 1 : 0; jph_b_p2 = std::getenv("B_P2") ? 1 : 0;
  RegisterDefaultAllocator(); Factory::sInstance = new Factory(); RegisterTypes();
  long N = std::atol(argv[1]); float gLo = std::atof(argv[2]) * 1e-3f, gHi = std::atof(argv[3]) * 1e-3f, R = std::atof(argv[4]); Vec3 he(std::atof(argv[5]), std::atof(argv[6]), std::atof(argv[7]));
  ConvexHullShapeSettings hs; int ai = 8; std::string label;
  if (argc > ai && !std::strcmp(argv[ai], "cuboid")) { float lx = std::atof(argv[ai + 1]) / 2, ly = std::atof(argv[ai + 2]) / 2, lz = std::atof(argv[ai + 3]) / 2; hs.mMaxConvexRadius = std::atof(argv[ai + 4]);
    for (int i = 0; i < 8; ++i) hs.mPoints.push_back(Vec3(i & 1 ? lx : -lx, i & 2 ? ly : -ly, i & 4 ? lz : -lz)); ai += 5; label = "cuboid"; }
  else if (argc > ai) { FILE *f = std::fopen(argv[ai], "r"); unsigned n, u[3]; std::fscanf(f, "%u", &n); for (unsigned i = 0; i < n; ++i) { std::fscanf(f, "%u %u %u", &u[0], &u[1], &u[2]); hs.mPoints.push_back(Vec3(bits(u[0]), bits(u[1]), bits(u[2]))); }
    unsigned cr, has, ht; std::fscanf(f, "%u %u %u", &cr, &has, &ht); hs.mMaxConvexRadius = bits(cr); if (has) hs.mHullTolerance = bits(ht); std::fclose(f); ai++; label = "fixture hull"; }
  if (argc > ai) rs = std::strtoull(argv[ai], nullptr, 10) * 2654435761ULL + 1;
  RefConst<Shape> hull = hs.Create().Get(); const ConvexHullShape *ch = static_cast<const ConvexHullShape *>(hull.GetPtr());
  BoxShapeSettings bs(he, 0.0f); RefConst<Shape> box = bs.Create().Get(); Mat44 T2 = Mat44::sTranslation(Vec3(0, -he.GetY(), 0));
  // the hull's own faces (outward normal, plane offset), in its centre-of-mass frame
  struct F { Vec3 n; float d; }; std::vector<F> faces; for (uint i = 0; i < ch->GetNumFaces(); ++i) { uint vi[64]; uint nv = ch->GetFaceVertices(i, 64, vi); if (nv < 3) continue; Vec3 v[64]; for (uint k = 0; k < nv; ++k) v[k] = ch->GetPoint(vi[k]);
    Vec3 n = (v[1] - v[0]).Cross(v[2] - v[0]).Normalized(); Vec3 c = Vec3::sZero(); for (uint k = 0; k < nv; ++k) c += v[k]; c /= (float)nv; if (n.Dot(c) < 0) n = -n; faces.push_back({ n, n.Dot(v[0]) }); }
  CollideShapeSettings cs; cs.mCollectFacesMode = ECollectFacesMode::CollectFaces; cs.mMaxSeparationDistance = 0.02f; cs.mActiveEdgeMode = EActiveEdgeMode::CollideOnlyWithActive;
  long hits = 0, rev = 0; long firstRev = -1; Vec3 frP; Quat frQ;
  for (long q = 0; q < N; ++q) { const F &f = faces[(size_t)(rnd() * faces.size()) % faces.size()]; float g = gLo + (float)rnd() * (gHi - gLo), yaw = (float)(rnd() * 2 * JPH_PI);
    Vec3 down(0, -1, 0); Vec3 ax = f.n.Cross(down); float s = ax.Length(), c = f.n.Dot(down); Quat r0 = s > 1e-6f ? Quat::sRotation(ax / s, std::atan2(s, c)) : (c > 0 ? Quat::sIdentity() : Quat::sRotation(Vec3(1, 0, 0), JPH_PI));
    Quat rq = (Quat::sRotation(Vec3(0, 1, 0), yaw) * r0).Normalized();
    // face plane (COM frame): n·p = d; after rotation the plane normal is −Y and the plane passes through y = com_y − d → com_y = g + d
    Vec3 pos((float)((rnd() * 2 - 1) * R), g + f.d, (float)((rnd() * 2 - 1) * R)); Mat44 T1 = Mat44::sRotationTranslation(rq, pos);
    AllHitCollisionCollector<CollideShapeCollector> coll; SubShapeIDCreator c1, c2; CollisionDispatch::sCollideShapeVsShape(hull, box, Vec3::sOne(), Vec3::sOne(), T1, T2, c1, c2, cs, coll);
    for (const CollideShapeResult &r : coll.mHits) { hits++; if (r.mPenetrationAxis.GetY() > 0) { rev++; if (firstRev < 0) { firstRev = q; frP = pos; frQ = rq;
          if (std::getenv("B_TRACE_FIRST")) { jph_b_trace = 1; std::fprintf(stderr, "--- trace of the first reversed pose (gap %.4f mm):\n", (double)g * 1e3); AllHitCollisionCollector<CollideShapeCollector> c2b; SubShapeIDCreator a1, a2; CollisionDispatch::sCollideShapeVsShape(hull, box, Vec3::sOne(), Vec3::sOne(), T1, T2, a1, a2, cs, c2b); jph_b_trace = 0; } } } } }
  std::printf("%s (%d faces) vs box (%.3g, %.3g, %.3g): poses %ld gap [%.2f, %.2f] mm R %.1f m | hits %ld | REVERSED %ld", label.c_str(), (int)faces.size(), (double)he.GetX(), (double)he.GetY(), (double)he.GetZ(), N, (double)gLo * 1e3, (double)gHi * 1e3, (double)R, hits, rev);
  if (firstRev >= 0) std::printf(" | first at pose %ld (pos %.6f %.6f %.6f)", firstRev, (double)frP.GetX(), (double)frP.GetY(), (double)frP.GetZ());
  std::printf("\n"); return 0;
}

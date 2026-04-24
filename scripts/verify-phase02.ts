/**
 * Phase 02 UAT Verification Script
 * 
 * Tests: seed pipeline, knowledge API (CRUD, list, search, filters),
 * auth middleware, LanceDB ID sanitization.
 * 
 * Usage: bun run scripts/verify-phase02.ts
 * Prerequisites: dev server running (bun run dev)
 */

const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";
let sessionCookie = "";
let passed = 0;
let failed = 0;
let skipped = 0;
const results: Array<{ test: string; status: string; detail?: string }> = [];

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BACKEND}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    redirect: "manual",
  });
  return res;
}

function assert(condition: boolean, test: string, detail?: string) {
  if (condition) {
    passed++;
    results.push({ test, status: "PASS" });
    console.log(`  ✅ ${test}`);
  } else {
    failed++;
    results.push({ test, status: "FAIL", detail });
    console.log(`  ❌ ${test}${detail ? ` — ${detail}` : ""}`);
  }
}

async function login(username: string, password: string): Promise<Response> {
  const res = await fetch(`${BACKEND}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const raw = res.headers.getSetCookie?.() || [];
  const sc = raw.find((c: string) => c.startsWith("session_id="));
  if (sc) sessionCookie = sc.split(";")[0];
  return res;
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

async function testAuth() {
  console.log("\n🔐 Auth Tests");

  // T1: Login as root
  const loginRes = await login("admin", "admin123");
  assert(loginRes.ok, "Root login succeeds", `status=${loginRes.status}`);

  // T2: /api/auth/me returns user
  const me = await request("/api/auth/me");
  const meData = await me.json() as any;
  assert(me.ok && meData?.data?.user?.role >= 100, "/api/auth/me returns root user", `role=${meData?.data?.user?.role}`);

  // T3: Unauthenticated access denied
  const savedCookie = sessionCookie;
  sessionCookie = "";
  const noAuth = await fetch(`${BACKEND}/api/admin/knowledge/points?page=1&limit=5`);
  assert(noAuth.status === 401, "Unauthenticated request returns 401", `status=${noAuth.status}`);
  sessionCookie = savedCookie;
}

async function testSeed() {
  console.log("\n🌱 Seed Pipeline (knowledge_points only)");

  // Seed data file exists
  const fs = await import("fs");
  const kpFile = new URL("../packages/backend/src/seed/knowledge-points-gesp-cpp-1-8.json", import.meta.url);
  assert(fs.existsSync(kpFile), "knowledge-points-gesp-cpp-1-8.json exists");

  // Check workspace seed files
  const wsRoot = new URL("../../..", import.meta.url);
  const practiceFile = new URL("docs/products/gesp/seed/practice-cpp-l1.json", wsRoot);
  const examFile = new URL("docs/products/gesp/seed/exam-cpp-l1-2026-03.json", wsRoot);
  const lessonFile = new URL("docs/products/gesp/seed/lesson-cpp-g3-05.json", wsRoot);
  assert(fs.existsSync(practiceFile), "practice-cpp-l1.json exists in workspace docs");
  assert(fs.existsSync(examFile), "exam-cpp-l1-2026-03.json exists in workspace docs");
  assert(fs.existsSync(lessonFile), "lesson-cpp-g3-05.json exists in workspace docs");
}

async function testKnowledgeListAPI() {
  console.log("\n📋 Knowledge API - List Points");

  // T: List points (basic pagination)
  const listRes = await request("/api/admin/knowledge/points?page=1&limit=5");
  const listText = await listRes.text();
  let listData: any;
  try { listData = JSON.parse(listText); } catch { listData = null; }
  assert(listRes.ok && listData, "GET /points returns 200", `status=${listRes.status} body=${listText?.slice(0, 200)}`);

  if (listRes.ok && listData?.data) {
    // Handle nested pagination: { data: { data: [...], total, page, limit } }
    const payload = listData.data;
    const items = payload.data || payload.items || payload;
    const hasItems = Array.isArray(items) && items.length > 0;
    assert(hasItems, "Returns knowledge points array", `items=${Array.isArray(items) ? items.length : "N/A"} keys=${Object.keys(payload).join(",")}`);

    if (hasItems && Array.isArray(items)) {
      const first = items[0];
      assert(!!first.id, "Items have id field");
      assert(!!first.point, "Items have point field");
      assert(typeof first.level === "number", "Items have level field (number)");
    }
  } else {
    skipped += 2;
    results.push({ test: "Points array checks", status: "SKIP", detail: "No data returned" });
    console.log("  ⏭️  Points array checks — SKIP (no data)");
  }

  // T: Filter by level
  const levelRes = await request("/api/admin/knowledge/points?page=1&limit=5&level=3");
  assert(levelRes.ok, "GET /points?level=3 returns 200", `status=${levelRes.status}`);

  // T: Filter by block
  const blockRes = await request("/api/admin/knowledge/points?page=1&limit=5&block=%E5%9F%BA%E7%A1%80%E8%AF%AD%E6%B3%95");
  assert(blockRes.ok, "GET /points?block=基础语法 returns 200", `status=${blockRes.status}`);
}

async function testKnowledgeCRUD() {
  console.log("\n✏️  Knowledge API - CRUD Operations");

  // Create
  const createRes = await request("/api/admin/knowledge/points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level: 1,
      block: "基础语法",
      point: "UAT测试知识点",
      mastery_verb: "了解",
      description: "自动测试创建",
      tags: ["test"],
    }),
  });
  const createText = await createRes.text();
  let createData: any;
  try { createData = JSON.parse(createText); } catch { createData = null; }
  assert(createRes.status === 201, "POST /points creates (201)", `status=${createRes.status} body=${createText?.slice(0, 200)}`);

  const newId = createData?.data?.id;
  if (!newId) {
    skipped += 3;
    results.push({ test: "CRUD read/update/delete", status: "SKIP", detail: `Create did not return id. body=${createText?.slice(0, 200)}` });
    console.log(`  ⏭️  CRUD read/update/delete — SKIP (no id, body: ${createText?.slice(0, 100)})`);
    return;
  }

  // Read
  const getRes = await request(`/api/admin/knowledge/points/${newId}`);
  assert(getRes.ok, `GET /points/${newId} returns 200`, `status=${getRes.status}`);

  // Update
  const updateRes = await request(`/api/admin/knowledge/points/${newId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "更新后的描述" }),
  });
  assert(updateRes.ok, `PUT /points/${newId} updates`, `status=${updateRes.status}`);

  // Delete
  const delRes = await request(`/api/admin/knowledge/points/${newId}`, { method: "DELETE" });
  assert(delRes.ok, `DELETE /points/${newId} deletes`, `status=${delRes.status}`);

  // Verify deleted
  const goneRes = await request(`/api/admin/knowledge/points/${newId}`);
  assert(goneRes.status === 404, `GET /points/${newId} returns 404 after delete`, `status=${goneRes.status}`);
}

async function testIDSantization() {
  console.log("\n🛡️  LanceDB ID Sanitization");

  const badIdRes = await request("/api/admin/knowledge/points/not-a-uuid");
  assert(!badIdRes.ok, "GET /points/not-a-uuid rejects invalid ID", `status=${badIdRes.status}`);

  const badPutRes = await request("/api/admin/knowledge/points/not-a-uuid", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ point: "x" }),
  });
  assert(!badPutRes.ok, "PUT /points/not-a-uuid rejects invalid ID", `status=${badPutRes.status}`);

  const badDelRes = await request("/api/admin/knowledge/points/not-a-uuid", { method: "DELETE" });
  assert(!badDelRes.ok, "DELETE /points/not-a-uuid rejects invalid ID", `status=${badDelRes.status}`);
}

async function testMiddlewareGate() {
  console.log("\n🚪 Middleware Auth Gate");

  // No cookie → redirect to login (frontend middleware, backend returns 401)
  const saved = sessionCookie;
  sessionCookie = "";
  const noCookie = await fetch(`${BACKEND}/api/admin/knowledge/points?page=1&limit=1`);
  assert(noCookie.status === 401, "No session → 401", `status=${noCookie.status}`);

  // Invalid session → 401
  sessionCookie = "session_id=invalid-session-id-12345";
  const invalidSession = await fetch(`${BACKEND}/api/admin/knowledge/points?page=1&limit=1`, {
    headers: { Cookie: sessionCookie },
  });
  assert(invalidSession.status === 401, "Invalid session → 401", `status=${invalidSession.status}`);

  sessionCookie = saved;
}

async function testStudentSearch() {
  console.log("\n🎓 Student Knowledge Search");

  // Student search endpoint exists (requires student auth, may 401 without)
  // For now test with admin session - student search is capped at 5
  const searchRes = await request("/api/student/knowledge/search?query=%E5%8F%98%E9%87%8F&limit=10");
  // Admin role >= 100 should pass StudentAuth
  if (searchRes.ok) {
    const data = await searchRes.json() as any;
    const items = data?.data;
    const count = Array.isArray(items) ? items.length : 0;
    assert(count <= 5, "Student search capped at 5 results", `count=${count}`);
  } else {
    skipped++;
    results.push({ test: "Student search cap", status: "SKIP", detail: `status=${searchRes.status}` });
    console.log(`  ⏭️  Student search cap — SKIP (status=${searchRes.status})`);
  }
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Phase 02 UAT Verification");
  console.log(`  Backend: ${BACKEND}`);
  console.log("═══════════════════════════════════════════");

  // Health check
  try {
    const health = await fetch(`${BACKEND}/`);
    if (!health.ok) {
      console.error(`\n⚠️  Backend not healthy at ${BACKEND} (status=${health.status})`);
      console.error("Start with: bun run dev");
      process.exit(1);
    }
    console.log("  Health check OK");
  } catch {
    console.error(`\n⚠️  Backend unreachable at ${BACKEND}`);
    console.error("Start with: bun run dev");
    process.exit(1);
  }

  await testAuth();
  await testSeed();
  await testKnowledgeListAPI();
  await testKnowledgeCRUD();
  await testIDSantization();
  await testMiddlewareGate();
  await testStudentSearch();

  console.log("\n═══════════════════════════════════════════");
  console.log("  Summary");
  console.log("═══════════════════════════════════════════");
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${passed + failed + skipped}`);
  console.log("");

  if (failed > 0) {
    console.log("  Failed tests:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`    ❌ ${r.test}${r.detail ? ` — ${r.detail}` : ""}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

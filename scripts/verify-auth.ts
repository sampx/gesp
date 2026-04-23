#!/usr/bin/env bun
/**
 * Phase 01: 认证系统端到端验证脚本
 *
 * 用法:
 *   1. 先启服务:  bun run dev  (从项目根目录)
 *   2. 运行验证:  bun scripts/verify-auth.ts
 *
 * 测试项 (11 项):
 *   1.  健康检查            GET /
 *   2.  学员注册            POST /api/auth/register
 *   3.  重复注册拒绝
 *   4.  学员登录 + TTL 验证  POST /api/auth/login  学员 Max-Age=3600 (1h)
 *   5.  获取当前用户         GET /api/auth/me
 *   6.  管理员登录 + TTL 验证 POST /api/auth/login  管理员 Max-Age=86400 (24h)
 *   7.  登出                 POST /api/auth/logout
 *   8.  登出后会话失效验证
 *   9.  密码错误登录
 *  10. 无 cookie 访问受限接口
 *  11. 短密码校验
 */

const BASE = process.env.GESP_API_URL || "http://localhost:3000";

// ── 测试计数器 ──

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${label}`);
    if (detail) console.log(`    ${detail}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label}`);
    if (detail) console.log(`    预期: ${detail}`);
  }
}

// ── 请求封装 ──

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k] = v));
  const body = await res.json().catch(() => null);
  return { status: res.status, headers, body } as const;
}

function extractSessionId(setCookie: string | undefined): string {
  if (!setCookie) return "";
  return setCookie.match(/session_id=([^;]+)/)?.[1] ?? "";
}

function extractMaxAge(setCookie: string | undefined): string | null {
  if (!setCookie) return null;
  return setCookie.match(/Max-Age=(\d+)/)?.[1] ?? null;
}

// ── 测试用例 ──

async function test1_health() {
  console.log("\n1. 健康检查");
  const res = await request(`${BASE}/`);
  assert(res.status === 200, "返回 200", `got ${res.status}`);
  assert(res.body?.success === true, "success 为 true");
  assert(res.body?.data?.version === "0.0.1", "版本号正确");
}

async function test2_register() {
  console.log("\n2. 学员注册");
  const uniqueId = Date.now();
  const res = await request(`${BASE}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({
      username: `verify_${uniqueId}`,
      password: "pass123",
      display_name: "测试学员",
    }),
  });
  assert(res.status === 200, "返回 200", `got ${res.status}`);
  assert(res.body?.success === true, "success 为 true");
  assert(res.body?.data?.user?.role === 1, "角色为学员 (role=1)");
  const sid = extractSessionId(res.headers["set-cookie"]);
  assert(sid.length > 0, "返回 session cookie");
  return { sid, username: `verify_${uniqueId}` };
}

async function test3_duplicate() {
  console.log("\n3. 重复注册拒绝");
  const { username } = await test2_register();
  const res = await request(`${BASE}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ username, password: "pass123", display_name: "重复" }),
  });
  assert(res.body?.success === false, "success 为 false");
  assert(res.body?.message?.includes("already exists"), "提示用户名已存在");
}

async function test4_login_student() {
  console.log("\n4. 学员登录");
  const { username } = await test2_register();
  const res = await request(`${BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password: "pass123" }),
  });
  assert(res.status === 200, "返回 200", `got ${res.status}`);
  assert(res.body?.success === true, "success 为 true");
  const sid = extractSessionId(res.headers["set-cookie"]);
  const maxAge = extractMaxAge(res.headers["set-cookie"]);
  assert(maxAge === "3600", "学员 Max-Age 为 3600 (1h)", `got ${maxAge}`);
  return sid;
}

async function test5_me() {
  console.log("\n5. 获取当前用户 (/me)");
  const sid = await test4_login_student();
  const res = await request(`${BASE}/api/auth/me`, {
    headers: { Cookie: `session_id=${sid}` },
  });
  assert(res.status === 200, "返回 200", `got ${res.status}`);
  assert(res.body?.success === true, "success 为 true");
  assert(res.body?.data?.user?.role === 1, "角色为学员");
  assert(res.body?.data?.user?.status !== undefined, "包含 status 字段");
}

async function test6_admin() {
  console.log("\n6. 管理员登录 (root)");
  const res = await request(`${BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  assert(res.status === 200, "返回 200", `got ${res.status}`);
  assert(res.body?.success === true, "success 为 true");
  assert(res.body?.data?.user?.role === 100, "角色为 root (role=100)");
  const maxAge = extractMaxAge(res.headers["set-cookie"]);
  assert(maxAge === "86400", "管理员 Max-Age 为 86400 (24h)", `got ${maxAge}`);
}

async function test7_logout() {
  console.log("\n7. 登出");
  const sid = await test4_login_student();
  const res = await request(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: `session_id=${sid}` },
  });
  assert(res.status === 200, "返回 200", `got ${res.status}`);
  assert(res.body?.message === "Logout successful", "提示登出成功");
}

async function test8_session_invalidated() {
  console.log("\n8. 登出后会话失效");
  const sid = await test4_login_student();
  await request(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: `session_id=${sid}` },
  });
  const res = await request(`${BASE}/api/auth/me`, {
    headers: { Cookie: `session_id=${sid}` },
  });
  assert(res.body?.success === false, "success 为 false");
  assert(res.body?.message === "Session not found", "会话已失效/找不到");
}

async function test9_wrong_password() {
  console.log("\n9. 密码错误登录");
  const { username } = await test2_register();
  const res = await request(`${BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password: "wrong" }),
  });
  assert(res.status === 401, "返回 401", `got ${res.status}`);
  assert(res.body?.success === false, "success 为 false");
}

async function test10_no_cookie() {
  console.log("\n10. 无 cookie 访问受限接口");
  const res = await request(`${BASE}/api/auth/me`);
  assert(res.status === 401, "返回 401", `got ${res.status}`);
  assert(res.body?.success === false, "success 为 false");
}

async function test11_short_password() {
  console.log("\n11. 短密码校验");
  const res = await request(`${BASE}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({
      username: `short_${Date.now()}`,
      password: "ab",
      display_name: "短密码",
    }),
  });
  assert(res.body?.success === false, "success 为 false");
  assert(res.body?.message?.includes("6"), "提示最少 6 个字符");
}

// ── 运行 ──

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  GESP Phase 01: 认证系统端到端验证");
  console.log("═══════════════════════════════════════════");

  await test1_health();
  await test2_register();
  await test3_duplicate();
  await test4_login_student();
  await test5_me();
  await test6_admin();
  await test7_logout();
  await test8_session_invalidated();
  await test9_wrong_password();
  await test10_no_cookie();
  await test11_short_password();

  const total = passCount + failCount;
  console.log("\n───────────────────────────────────────");
  console.log(`  结果: ${passCount} 通过, ${failCount} 失败, 共 ${total} 项`);
  console.log("───────────────────────────────────────\n");

  if (failCount > 0) {
    console.error(`❌ ${failCount} 项测试失败`);
    process.exit(1);
  }
  console.log("✅ 全部通过");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n💥 脚本执行出错:", e.message);
  console.error("请确认服务器正在运行: bun run dev");
  process.exit(1);
});

#!/usr/bin/env bun
const BASE = process.env.GESP_API_URL || "http://localhost:3000";

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    pass++;
    console.log(`    pass ${label}`);
    if (detail) console.log(`         ${detail}`);
  } else {
    fail++;
    console.log(`    FAIL ${label}`);
    if (detail) console.log(`         ${detail}`);
  }
}

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

function extractSid(setCookie: string | undefined): string {
  return setCookie?.match(/session_id=([^;]+)/)?.[1] ?? "";
}

function extractMaxAge(setCookie: string | undefined): string | null {
  return setCookie?.match(/Max-Age=(\d+)/)?.[1] ?? null;
}

async function register(): Promise<{ sid: string; username: string }> {
  const id = Date.now() + Math.random();
  const username = `verify_${id}`;
  const res = await request(`${BASE}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ username, password: "pass123", display_name: "测试学员" }),
  });
  const sid = extractSid(res.headers["set-cookie"]);
  return { sid, username };
}

async function login(username: string, password: string) {
  return request(`${BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

async function main() {
  console.log("GESP Phase 01 认证系统验证\n");

  // 1. 健康检查
  console.log("[1/11] 健康检查  GET /");
  {
    const res = await request(`${BASE}/`);
    assert(res.status === 200, "status 200", `got ${res.status}`);
    assert(res.body?.success === true, "success === true");
    assert(res.body?.data?.version === "0.0.1", "version === 0.0.1");
  }

  // 2. 学员注册
  console.log("\n[2/11] 学员注册  POST /api/auth/register");
  {
    const { sid, username } = await register();
    assert(sid.length > 0, "返回 session cookie");
    // 用同一个用户测试重复注册
    const dup = await request(`${BASE}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ username, password: "pass123", display_name: "重复" }),
    });
    assert(dup.body?.success === false, "重复用户名被拒绝");
  }

  // 3. 学员登录
  console.log("\n[3/11] 学员登录  POST /api/auth/login");
  {
    const { username } = await register();
    const res = await login(username, "pass123");
    assert(res.status === 200, "status 200", `got ${res.status}`);
    assert(res.body?.success === true, "success === true");
    assert(res.body?.data?.user?.role === 1, "role === 1 (学员)");
    const maxAge = extractMaxAge(res.headers["set-cookie"]);
    assert(maxAge === "3600", "session Max-Age = 3600 (1h)", `got ${maxAge}`);
  }

  // 4. 获取当前用户
  console.log("\n[4/11] 获取当前用户  GET /api/auth/me");
  {
    const { username } = await register();
    const loginRes = await login(username, "pass123");
    const sid = extractSid(loginRes.headers["set-cookie"]);
    const res = await request(`${BASE}/api/auth/me`, {
      headers: { Cookie: `session_id=${sid}` },
    });
    assert(res.status === 200, "status 200", `got ${res.status}`);
    assert(res.body?.data?.user?.username === username, "返回正确用户名", `got ${res.body?.data?.user?.username}`);
    assert(res.body?.data?.user?.status !== undefined, "包含 status 字段");
  }

  // 5. 管理员登录
  console.log("\n[5/11] 管理员登录  POST /api/auth/login (root)");
  {
    const res = await login("admin", "admin123");
    assert(res.status === 200, "status 200", `got ${res.status}`);
    assert(res.body?.data?.user?.role === 100, "role === 100 (root)");
    const maxAge = extractMaxAge(res.headers["set-cookie"]);
    assert(maxAge === "86400", "session Max-Age = 86400 (24h)", `got ${maxAge}`);
  }

  // 6. 登出
  console.log("\n[6/11] 登出  POST /api/auth/logout");
  {
    const { username } = await register();
    const loginRes = await login(username, "pass123");
    const sid = extractSid(loginRes.headers["set-cookie"]);
    const res = await request(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `session_id=${sid}` },
    });
    assert(res.status === 200, "status 200", `got ${res.status}`);
    assert(res.body?.success === true, "success === true");
  }

  // 7. 登出后会话失效
  console.log("\n[7/11] 登出后会话失效");
  {
    const { username } = await register();
    const loginRes = await login(username, "pass123");
    const sid = extractSid(loginRes.headers["set-cookie"]);
    await request(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `session_id=${sid}` },
    });
    const res = await request(`${BASE}/api/auth/me`, {
      headers: { Cookie: `session_id=${sid}` },
    });
    assert(res.status === 401, "status 401", `got ${res.status}`);
    assert(res.body?.success === false, "success === false");
  }

  // 8. 密码错误
  console.log("\n[8/11] 密码错误登录");
  {
    const { username } = await register();
    const res = await login(username, "wrong_password");
    assert(res.status === 401, "status 401", `got ${res.status}`);
    assert(res.body?.success === false, "success === false");
  }

  // 9. 无 cookie 访问受限接口
  console.log("\n[9/11] 无 cookie 访问 /me");
  {
    const res = await request(`${BASE}/api/auth/me`);
    assert(res.status === 401, "status 401", `got ${res.status}`);
    assert(res.body?.success === false, "success === false");
  }

  // 10. 短密码校验
  console.log("\n[10/11] 短密码校验 (password = \"ab\")");
  {
    const res = await request(`${BASE}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ username: `short_${Date.now()}`, password: "ab", display_name: "短" }),
    });
    assert(res.body?.success === false, "success === false");
    const msg = res.body?.error?.issues?.[0]?.message || res.body?.message || "";
    assert(msg.includes("6"), "提示最少 6 字符", `got: ${msg}`);
  }

  // 11. 字段缺失校验
  console.log("\n[11/11] 缺少必填字段 (无 username)");
  {
    const res = await request(`${BASE}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ password: "pass123", display_name: "无用户名" }),
    });
    assert(res.body?.success === false, "success === false");
  }

  const total = pass + fail;
  console.log(`\n${"─".repeat(36)}`);
  if (fail === 0) {
    console.log(`  ${total}/${total} passed`);
  } else {
    console.log(`  ${pass}/${total} passed, ${fail} failed`);
  }
  console.log(`${"─".repeat(36)}\n`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`\n执行出错: ${e.message}`);
  console.error("请确认服务器正在运行: bun run dev");
  process.exit(1);
});

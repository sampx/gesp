---
phase: 02-知识库-双端骨架
reviewed: 2026-04-24T13:39:30Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - apps/web/src/app/(admin)/dashboard/page.tsx
  - apps/web/src/app/(admin)/knowledge/points/page.tsx
  - apps/web/src/app/(admin)/layout.tsx
  - apps/web/src/app/(student)/dashboard/page.tsx
  - apps/web/src/app/(student)/layout.tsx
  - apps/web/src/app/403/page.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/login/actions.ts
  - apps/web/src/app/login/page.tsx
  - apps/web/src/app/page.tsx
  - apps/web/src/components/admin-sidebar.tsx
  - apps/web/src/components/knowledge-data-table.tsx
  - apps/web/src/components/knowledge-detail-sheet.tsx
  - apps/web/src/components/knowledge-form.tsx
  - apps/web/src/components/role-card.tsx
  - apps/web/src/components/student-feature-card.tsx
  - apps/web/src/hooks/use-knowledge-api.ts
  - apps/web/src/middleware.ts
  - apps/web/next.config.ts
  - packages/backend/src/index.ts
  - packages/backend/src/routes/knowledge.ts
  - packages/backend/src/seed/knowledge.seed.ts
  - packages/backend/src/services/knowledge-base.ts
  - packages/backend/src/services/vector-store.ts
  - packages/ui/src/index.ts
findings:
  critical: 3
  warning: 6
  info: 2
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-24T13:39:30Z
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Reviewed the Phase 02 monorepo skeleton: NextJS 15 frontend (admin + student dashboards, login, knowledge CRUD), Hono backend with LanceDB knowledge base, and supporting services.

Three critical issues found: (1) login redirect is swallowed by a catch block — users cannot successfully log in, (2) middleware grants full access on backend network failure — authentication bypass, (3) unsanitized string interpolation in LanceDB filter expressions — injection risk. Six warnings include dead code, non-functional filter params, cookie security misconfiguration, and state management issues.

## Critical Issues

### CR-01: Login redirect error swallowed by catch block

**File:** `apps/web/src/app/login/actions.ts:56-64`
**Issue:** Next.js `redirect()` works by throwing an internal `NEXT_REDIRECT` error. The `redirect()` calls on lines 57-62 are inside a `try` block, and the `catch {}` on line 63 catches ALL errors — including the redirect error. This means after a successful login, the redirect never executes; instead the function returns `{ error: "用户名或密码错误" }` and the user sees an error toast despite having logged in successfully.

**Fix:**
```typescript
// Option A: Move redirect outside try/catch
let redirectPath = "";
try {
  // ... fetch and process response ...
  if (userRole >= ROLE.ROOT) {
    redirectPath = "/admin/dashboard";
  } else if (userRole >= ROLE.ADMIN) {
    redirectPath = "/admin/dashboard";
  } else {
    redirectPath = "/student/dashboard";
  }
} catch {
  return { error: "用户名或密码错误" };
}
if (redirectPath) redirect(redirectPath);

// Option B: Re-throw redirect errors
import { isRedirectError } from "next/dist/client/components/redirect-error";
// ...
} catch (error) {
  if (isRedirectError(error)) throw error;
  return { error: "用户名或密码错误" };
}
```

### CR-02: Middleware grants full access on backend network failure

**File:** `apps/web/src/middleware.ts:51-55`
**Issue:** When the backend is unreachable (network error), the catch block on line 51 allows the request through via `NextResponse.next()`. This means any unauthenticated user can access admin pages (`/admin/*`) if the backend is down or the network fails. An attacker could exploit this by disrupting backend connectivity (e.g., DNS poisoning, port exhaustion) to bypass authentication entirely.

**Fix:**
```typescript
} catch {
  // Fail closed: deny access when backend is unreachable
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("session_id");
  return response;
}
```

If degraded-mode access is needed for specific pages (e.g., static student content), implement an explicit allowlist rather than granting blanket access on failure.

### CR-03: Unsanitized string interpolation in LanceDB filter expressions

**File:** `packages/backend/src/services/vector-store.ts:206,216,222`
**Issue:** The `getById`, `update`, and `delete` methods use string interpolation in LanceDB `where()` / `delete()` filter expressions:
```typescript
table.query().where(`id = '${id}'`)    // line 206
table.delete(`id = '${id}'`)           // lines 216, 222
```
The `id` parameter originates from `c.req.param('id')` in the API route — a user-controlled URL segment. If an attacker crafts an `id` like `' OR '1'='1`, it could manipulate the filter logic to access or delete unintended records. LanceDB uses SQL-like filter syntax, and string interpolation without parameterized queries or sanitization is an injection vector.

**Fix:**
```typescript
// Sanitize id to only allow valid UUIDs
function sanitizeId(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid ID format: ${id}`);
  }
  return id;
}

// Then use in methods:
async getById(tableName: string, id: string): Promise<KnowledgeResult | null> {
  const safeId = sanitizeId(id);
  const table = await this.getOrConnectTable(tableName);
  const results = await table.query().where(`id = '${safeId}'`).limit(1).toArray();
  // ...
}
```

## Warnings

### WR-01: Frontend filter parameters silently ignored by backend

**File:** `packages/backend/src/routes/knowledge.ts:67-77`
**Issue:** The frontend (`use-knowledge-api.ts` line 35) sends `level` and `block` as query parameters for filtering knowledge points. However, the backend `/points` GET endpoint only validates `page` and `limit` via `paginationSchema` (line 44-46). The `level` and `block` params are stripped by Zod validation and never passed to `kb.list()`. The level/block filter dropdowns in the admin UI have no effect.

**Fix:** Extend the pagination schema to accept optional filter params:
```typescript
const listPointsSchema = paginationSchema.extend({
  level: z.coerce.number().int().min(1).max(8).optional(),
  block: z.string().optional(),
});

// In the handler:
adminKnowledgeRouter.get('/points', AdminAuth(), zValidator('query', listPointsSchema), async (c) => {
  const kb = getKB(c);
  const { page, limit, level, block } = c.req.valid('query');
  const filterParts: string[] = [];
  if (level) filterParts.push(`level = ${level}`);
  if (block) filterParts.push(`block = '${block}'`);
  const filter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;
  const result = await kb.list('points', page, limit, filter);
  return c.json({ success: true, message: 'Success', data: result });
});
```

### WR-02: Login cookie sameSite setting mismatches security requirement

**File:** `apps/web/src/app/login/actions.ts:47`
**Issue:** The project AGENTS.md specifies session cookies should use `sameSite=Strict`, but the login action sets `sameSite: "lax"`. While `lax` is a reasonable default, it doesn't match the documented security requirement. `Strict` prevents the cookie from being sent on cross-site navigation, providing stronger CSRF protection.

**Fix:**
```typescript
cookieStore.set("session_id", sessionId, {
  path: "/",
  httpOnly: true,
  sameSite: "strict",  // Match project security requirement
  maxAge: 7 * 24 * 60 * 60,
});
```

### WR-03: Dead code — roleMap never used in login action

**File:** `apps/web/src/app/login/actions.ts:8,13-17`
**Issue:** The `role` variable (line 8) and `roleMap` (lines 13-17) are declared but never referenced. The frontend sends a `role` value, but the server action never validates that the user's actual backend role matches the selected role. The redirect is based solely on `userRole` from the backend response (lines 56-62), making `roleMap` dead code.

**Fix:** Remove the unused variables, or (better) use `roleMap` to validate that the selected role matches the authenticated user's actual role:
```typescript
const allowedRoles = roleMap[role];
if (!allowedRoles || !allowedRoles.includes(userRole)) {
  return { error: "角色与账号不匹配" };
}
```

### WR-04: KnowledgeDetailSheet editing state not reset between openings

**File:** `apps/web/src/components/knowledge-detail-sheet.tsx:39`
**Issue:** The `editing` state is initialized from `mode` prop but never reset when props change. If a user opens the sheet in "view" mode, clicks the inline edit button (setting `editing=true`), closes the sheet, then opens it again for a different point in "view" mode, the `editing` state remains `true`. This causes the component to attempt to render the form instead of the view, creating a confusing UX.

**Fix:** Reset `editing` state when `mode` or `open` changes:
```typescript
const [editing, setEditing] = useState(false);

// Reset editing state when props change
useEffect(() => {
  setEditing(mode === "edit" || mode === "create");
}, [mode, open]);
```
(Also add `import { useState, useEffect } from "react";`)

### WR-05: Seed script uses console.log instead of project logger

**File:** `packages/backend/src/seed/knowledge.seed.ts:66,95,100,119,147,155,173,196,205,235,257,266,284,301-348`
**Issue:** The backend AGENTS.md explicitly mandates: "禁止 `console.log` / `console.error` — 统一使用 `logger`". The seed script uses `console.log` and `console.error` extensively throughout. While seed scripts are less critical than runtime code, they are part of the backend package and should follow the same logging convention for consistency and debuggability.

**Fix:** Import and use the project logger:
```typescript
import { logger } from '../utils/logger';
// Replace console.log(...) with logger.info({ ... }, "message")
// Replace console.error(...) with logger.error({ err }, "message")
```

### WR-06: Non-null assertion on selectedPoint without guard

**File:** `apps/web/src/app/(admin)/knowledge/points/page.tsx:99`
**Issue:** `selectedPoint!.id` uses a non-null assertion. While the code path (else branch of `sheetMode === "create"`) implies `selectedPoint` should be non-null, there's no runtime guard. If state becomes inconsistent (e.g., rapid double-clicks, race conditions), this could throw a runtime error.

**Fix:**
```typescript
async function handleSave(formData: KnowledgePointFormData) {
  setSaving(true);
  try {
    if (sheetMode === "create") {
      await createPoint(formDataFromSchema(formData));
    } else if (selectedPoint) {
      await updatePoint(selectedPoint.id, formDataFromSchema(formData));
    }
    setSheetOpen(false);
    setSelectedPoint(null);
  } finally {
    setSaving(false);
  }
}
```

## Info

### IN-01: `as any` cast on Zod resolver suppresses type checking

**File:** `apps/web/src/components/knowledge-form.tsx:52`
**Issue:** `zodResolver(knowledgePointSchema as any)` casts the schema to `any`, hiding potential type mismatches between the Zod schema and the form's type parameter. The schema defines `tags: z.string()` but the backend expects `tags: z.array(z.string())` — the conversion happens in the API hook, but the `as any` cast obscures this intentional mismatch.

**Fix:** Use the inferred type directly and avoid the cast:
```typescript
resolver: zodResolver(knowledgePointSchema),
```
If type errors appear, fix the root cause (e.g., align the schema with the form's type) rather than suppressing with `as any`.

### IN-02: packages/ui/src/index.ts is an empty barrel export

**File:** `packages/ui/src/index.ts`
**Issue:** The `@gesp/ui` package exports nothing (`export {};`). This is expected for Phase 02 where shadcn/ui components are installed directly in `apps/web/`, but the package scaffold should be noted for future phases when shared UI components need a home.

---

_Reviewed: 2026-04-24T13:39:30Z_
_Reviewer: the agent (wsf-code-reviewer)_
_Depth: standard_

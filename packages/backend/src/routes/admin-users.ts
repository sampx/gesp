import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { AdminAuth } from "../middleware/auth";
import { listUsers, createUserByAdmin, toggleUserStatus, resetUserPassword } from "../services/auth.service";
import { success, error } from "../utils/response";

const app = new Hono();

const errorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// GET / — User list (paginated)
const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const userListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    users: z.array(z.object({
      id: z.string(),
      username: z.string(),
      display_name: z.string(),
      role: z.number(),
      status: z.number(),
      email: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
    })),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});

app.get(
  "/",
  AdminAuth(),
  zValidator("query", userListQuerySchema),
  describeRoute({
    summary: "List users",
    description: "Get paginated user list (excludes password_hash). Requires Admin role.",
    responses: {
      200: {
        description: "User list",
        content: {
          "application/json": {
            schema: resolver(userListResponseSchema),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
      403: {
        description: "Forbidden",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const result = await listUsers(query);

    return success(c, {
      users: result.users.map(u => ({
        ...u,
        created_at: u.created_at.toISOString(),
        updated_at: u.updated_at.toISOString(),
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }
);

// POST / — Create user by admin
const createUserBodySchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  role: z.number().int().refine(v => v === 1 || v === 10, "Invalid role"),
});

const createUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      display_name: z.string(),
      role: z.number(),
      status: z.number(),
    }),
  }),
});

app.post(
  "/",
  AdminAuth(),
  zValidator("json", createUserBodySchema),
  describeRoute({
    summary: "Create user",
    description: "Admin creates a new user (STUDENT or ADMIN). ROOT role is not allowed.",
    responses: {
      201: {
        description: "User created",
        content: {
          "application/json": {
            schema: resolver(createUserResponseSchema),
          },
        },
      },
      400: {
        description: "Creation failed",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const result = await createUserByAdmin(body.username, body.password, body.role);

    if (!result.success) {
      return error(c, result.error ?? "User creation failed");
    }

    return c.json({
      success: true,
      message: "User created",
      data: { user: result.user },
    }, 201);
  }
);

// PUT /:id/status — Toggle user status
const toggleStatusParamSchema = z.object({
  id: z.string(),
});

const toggleStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    status: z.number(),
  }),
});

app.put(
  "/:id/status",
  AdminAuth(),
  zValidator("param", toggleStatusParamSchema),
  describeRoute({
    summary: "Toggle user status",
    description: "Toggle user between ENABLED and DISABLED status.",
    responses: {
      200: {
        description: "Status updated",
        content: {
          "application/json": {
            schema: resolver(toggleStatusResponseSchema),
          },
        },
      },
      400: {
        description: "Toggle failed",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await toggleUserStatus(id);

    if (!result.success) {
      return error(c, result.error ?? "Status toggle failed");
    }

    return success(c, { status: result.newStatus }, "User status updated");
  }
);

// POST /:id/reset-password — Reset user password
const resetPasswordParamSchema = z.object({
  id: z.string(),
});

const resetPasswordBodySchema = z.object({
  new_password: z.string().min(6),
});

app.post(
  "/:id/reset-password",
  AdminAuth(),
  zValidator("param", resetPasswordParamSchema),
  zValidator("json", resetPasswordBodySchema),
  describeRoute({
    summary: "Reset user password",
    description: "Admin resets a user's password.",
    responses: {
      200: {
        description: "Password reset",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
      400: {
        description: "Reset failed",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { new_password } = c.req.valid("json");
    const result = await resetUserPassword(id, new_password);

    if (!result.success) {
      return error(c, result.error ?? "Password reset failed");
    }

    return success(c, undefined, "Password reset");
  }
);

export default app;

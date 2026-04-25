import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { registerUser, registerUserWithRole, loginUser, changePassword } from "../services/auth.service";
import { createSession, validateSession, destroySession } from "../middleware/session";
import { success, error, unauthorized } from "../utils/response";
import { ROLE } from "@gesp/shared";

const app = new Hono();

// Register route
const registerBodySchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  display_name: z.string().min(1).max(100).optional(),
  role: z.number().int().optional(),
});

const registerResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      display_name: z.string(),
      role: z.number(),
    }),
  }),
});

const errorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

app.post(
  "/register",
  zValidator("json", registerBodySchema),
  describeRoute({
    summary: "Register a new user",
    description: "Create a new user account (STUDENT or ADMIN). ROOT role is not allowed for self-registration.",
    responses: {
      200: {
        description: "Registration successful",
        content: {
          "application/json": {
            schema: resolver(registerResponseSchema),
          },
        },
      },
      400: {
        description: "Registration failed",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { username, password, display_name, role } = c.req.valid("json");
    const resolvedDisplayName = display_name ?? username;

    // Public self-registration only allows STUDENT role
    if (role !== undefined && role !== ROLE.STUDENT) {
      return error(c, "自助注册仅支持学员角色");
    }

    const result = await registerUser(username, password, resolvedDisplayName);

    if (!result.success) {
      return error(c, result.error ?? "注册失败");
    }

    // Create session for new user
    await createSession(c, result.user!.id, result.user!.role);

    return success(c, {
      user: {
        id: result.user!.id,
        username: result.user!.username,
        display_name: result.user!.display_name,
        role: result.user!.role,
      },
    }, "注册成功");
  }
);

// Change password route
const changePasswordBodySchema = z.object({
  old_password: z.string(),
  new_password: z.string().min(6),
});

app.post(
  "/change-password",
  validateSession,
  zValidator("json", changePasswordBodySchema),
  describeRoute({
    summary: "Change password",
    description: "Change current user's password. Requires old password verification.",
    responses: {
      200: {
        description: "Password changed successfully",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
      400: {
        description: "Password change failed",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
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
    },
  }),
  async (c) => {
    const { old_password, new_password } = c.req.valid("json");
    const user = c.get("user");

    const result = await changePassword(user.id, old_password, new_password);

    if (!result.success) {
      return error(c, result.error ?? "Password change failed");
    }

    return success(c, undefined, "Password changed successfully");
  }
);

// Login route
const loginBodySchema = z.object({
  username: z.string(),
  password: z.string(),
});

const loginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      display_name: z.string(),
      role: z.number(),
    }),
  }),
});

app.post(
  "/login",
  zValidator("json", loginBodySchema),
  describeRoute({
    summary: "Login",
    description: "Authenticate user and create session",
    responses: {
      200: {
        description: "Login successful",
        content: {
          "application/json": {
            schema: resolver(loginResponseSchema),
          },
        },
      },
      401: {
        description: "Login failed",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { username, password } = c.req.valid("json");

    const result = await loginUser(username, password);

    if (!result.success) {
      return unauthorized(c, result.error ?? "Login failed");
    }

    // Create session
    await createSession(c, result.user!.id, result.user!.role);

    return success(c, {
      user: {
        id: result.user!.id,
        username: result.user!.username,
        display_name: result.user!.display_name,
        role: result.user!.role,
      },
    }, "Login successful");
  }
);

// Logout route
app.post(
  "/logout",
  describeRoute({
    summary: "Logout",
    description: "Destroy session and logout user",
    responses: {
      200: {
        description: "Logout successful",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    await destroySession(c);
    return success(c, undefined, "Logout successful");
  }
);

// Get current user (me)
const meResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      display_name: z.string(),
      role: z.number(),
      status: z.number(),
      email: z.string().nullable(),
    }),
  }),
});

app.get(
  "/me",
  validateSession,
  describeRoute({
    summary: "Get current user",
    description: "Return the currently authenticated user",
    responses: {
      200: {
        description: "User info",
        content: {
          "application/json": {
            schema: resolver(meResponseSchema),
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
    },
  }),
  async (c) => {
    const user = c.get("user");

    return success(c, {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        status: user.status,
        email: user.email ?? null,
      },
    });
  }
);

export default app;

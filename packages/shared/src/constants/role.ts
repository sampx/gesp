export const ROLE = {
  STUDENT: 1,
  ADMIN: 10,
  ROOT: 100,
} as const;

export type RoleValue = typeof ROLE[keyof typeof ROLE];
export const USER_STATUS = {
  ENABLED: 1,
  DISABLED: 2,
} as const;

export type StatusValue = typeof USER_STATUS[keyof typeof USER_STATUS];
// Web stub: expo-screen-orientation is mobile-only, so we export no-ops for web.
export const OrientationLock = {
  PORTRAIT_UP: 'PORTRAIT_UP',
} as const;

export async function unlockAsync(): Promise<void> {}

export async function lockAsync(_lock: string): Promise<void> {}

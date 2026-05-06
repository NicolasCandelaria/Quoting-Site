export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export type LoginRateLimitState = {
  attempts: number[];
};

export type LoginRateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  nextState: LoginRateLimitState;
};

export function evaluateLoginRateLimit(params: {
  state: LoginRateLimitState;
  nowMs: number;
  maxAttempts?: number;
  windowMs?: number;
}): LoginRateLimitResult {
  const maxAttempts = params.maxAttempts ?? LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  const windowMs = params.windowMs ?? LOGIN_RATE_LIMIT_WINDOW_MS;
  const cutoff = params.nowMs - windowMs;

  const activeAttempts = params.state.attempts.filter((t) => t > cutoff);
  if (activeAttempts.length >= maxAttempts) {
    const oldestAttempt = activeAttempts[0] ?? params.nowMs;
    const retryAfterMs = Math.max(0, oldestAttempt + windowMs - params.nowMs);
    return {
      allowed: false,
      retryAfterMs,
      nextState: { attempts: activeAttempts },
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    nextState: { attempts: [...activeAttempts, params.nowMs] },
  };
}

const STORAGE_KEY = "login_attempt_timestamps_v1";

function parseStoredAttempts(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => typeof value === "number");
  } catch {
    return [];
  }
}

function getStoredState(): LoginRateLimitState {
  if (typeof window === "undefined") return { attempts: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return { attempts: parseStoredAttempts(raw) };
}

function setStoredState(state: LoginRateLimitState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.attempts));
}

export function consumeLoginAttempt(nowMs: number = Date.now()): LoginRateLimitResult {
  const state = getStoredState();
  const result = evaluateLoginRateLimit({ state, nowMs });
  setStoredState(result.nextState);
  return result;
}

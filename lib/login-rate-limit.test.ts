import { describe, expect, it } from "vitest";
import {
  evaluateLoginRateLimit,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "./login-rate-limit";

describe("evaluateLoginRateLimit", () => {
  it("allows attempts under the limit and records the new attempt", () => {
    const nowMs = 1_000_000;
    const state = {
      attempts: [nowMs - 10_000, nowMs - 5_000],
    };

    const result = evaluateLoginRateLimit({ state, nowMs });
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
    expect(result.nextState.attempts).toEqual([
      nowMs - 10_000,
      nowMs - 5_000,
      nowMs,
    ]);
  });

  it("blocks when max attempts reached inside the window", () => {
    const nowMs = 2_000_000;
    const state = {
      attempts: Array.from(
        { length: LOGIN_RATE_LIMIT_MAX_ATTEMPTS },
        (_, i) => nowMs - (LOGIN_RATE_LIMIT_MAX_ATTEMPTS - i) * 1_000,
      ),
    };

    const result = evaluateLoginRateLimit({ state, nowMs });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.nextState.attempts).toHaveLength(LOGIN_RATE_LIMIT_MAX_ATTEMPTS);
  });

  it("drops expired attempts outside the window", () => {
    const nowMs = 3_000_000;
    const expired = nowMs - LOGIN_RATE_LIMIT_WINDOW_MS - 1;
    const recent = nowMs - 2_000;
    const state = { attempts: [expired, recent] };

    const result = evaluateLoginRateLimit({ state, nowMs });
    expect(result.allowed).toBe(true);
    expect(result.nextState.attempts).toEqual([recent, nowMs]);
  });
});

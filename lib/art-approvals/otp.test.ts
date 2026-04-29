import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { ArtApprovalDecisionType, ArtApprovalStatus } from "./models";
import {
  assertAllowlistEmailArray,
  assertAllowlistEmails,
  assertClientDecisionPayload,
  assertUpdateArtApprovalStatus,
  assertValidOtpCode,
  normalizeEmail,
} from "./validation";
import {
  generateNumericOtpCode,
  getArtApprovalOtpSecret,
  hashOtpCode,
  hashReviewToken,
  signArtApprovalReviewMagicLink,
  signArtApprovalReviewSession,
  verifyArtApprovalReviewMagicLink,
  verifyArtApprovalReviewSession,
  verifyOtpCode,
} from "../server/art-approvals";

describe("art approval model unions", () => {
  it("accepts approved and changes_requested status/decision values", () => {
    const statusApproved: ArtApprovalStatus = "approved";
    const statusChangesRequested: ArtApprovalStatus = "changes_requested";
    const decisionApproved: ArtApprovalDecisionType = "approved";
    const decisionChangesRequested: ArtApprovalDecisionType = "changes_requested";

    expect(statusApproved).toBe("approved");
    expect(statusChangesRequested).toBe("changes_requested");
    expect(decisionApproved).toBe("approved");
    expect(decisionChangesRequested).toBe("changes_requested");
  });
});

describe("otp helpers", () => {
  const prevSecret = process.env.ART_APPROVAL_OTP_SECRET;

  beforeAll(() => {
    process.env.ART_APPROVAL_OTP_SECRET = "vitest-art-approval-otp-secret-min-16";
  });

  afterAll(() => {
    if (prevSecret === undefined) {
      delete process.env.ART_APPROVAL_OTP_SECRET;
    } else {
      process.env.ART_APPROVAL_OTP_SECRET = prevSecret;
    }
  });

  it("verifies matching otp", async () => {
    const hash = await hashOtpCode("123456");
    const ok = await verifyOtpCode("123456", hash);
    expect(ok).toBe(true);
  });

  it("rejects non-matching otp", async () => {
    const hash = await hashOtpCode("123456");
    const ok = await verifyOtpCode("000000", hash);
    expect(ok).toBe(false);
  });

  it("returns false for malformed otp without throwing", async () => {
    const hash = await hashOtpCode("654321");
    await expect(verifyOtpCode("12ab56", hash)).resolves.toBe(false);
    await expect(verifyOtpCode("12345", hash)).resolves.toBe(false);
  });

  it("returns false when stored hash length mismatches", async () => {
    await expect(verifyOtpCode("123456", "not-a-hex")).resolves.toBe(false);
    await expect(verifyOtpCode("123456", "abc")).resolves.toBe(false);
  });

  it("produces stable review token hashes", () => {
    const t = "sample-review-token";
    expect(hashReviewToken(t)).toBe(hashReviewToken(t));
    expect(hashReviewToken(t)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("round-trips art approval email magic link payload", () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const signed = signArtApprovalReviewMagicLink({
      challengeId: "550e8400-e29b-41d4-a716-446655440000",
      email: "Client@Example.com",
      expUnixSec: exp,
    });
    const parsed = verifyArtApprovalReviewMagicLink(signed);
    expect(parsed?.cid).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed?.email).toBe("client@example.com");
    expect(parsed?.exp).toBe(exp);
  });

  it("rejects expired art approval magic link", () => {
    const signed = signArtApprovalReviewMagicLink({
      challengeId: "id",
      email: "a@b.co",
      expUnixSec: Math.floor(Date.now() / 1000) - 60,
    });
    expect(verifyArtApprovalReviewMagicLink(signed)).toBeNull();
  });

  it("generates six-digit numeric codes", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateNumericOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("rejects invalid otp for hashing", async () => {
    await expect(hashOtpCode("12")).rejects.toThrow("6-digit");
    await expect(hashOtpCode("12345a")).rejects.toThrow("6-digit");
  });

  it("uses HMAC: different secrets yield different digests for same otp", async () => {
    const saved = process.env.ART_APPROVAL_OTP_SECRET;
    try {
      process.env.ART_APPROVAL_OTP_SECRET = "aaaaaaaaaaaaaaaa";
      const a = await hashOtpCode("111111");
      process.env.ART_APPROVAL_OTP_SECRET = "bbbbbbbbbbbbbbbb";
      const b = await hashOtpCode("111111");
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[a-f0-9]{64}$/);
      expect(b).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      process.env.ART_APPROVAL_OTP_SECRET = saved;
    }
  });
});

describe("ART_APPROVAL_OTP_SECRET", () => {
  const prevSecret = process.env.ART_APPROVAL_OTP_SECRET;

  afterEach(() => {
    if (prevSecret === undefined) {
      delete process.env.ART_APPROVAL_OTP_SECRET;
    } else {
      process.env.ART_APPROVAL_OTP_SECRET = prevSecret;
    }
  });

  it("getArtApprovalOtpSecret throws when unset or too short", () => {
    delete process.env.ART_APPROVAL_OTP_SECRET;
    expect(() => getArtApprovalOtpSecret()).toThrow("ART_APPROVAL_OTP_SECRET");

    process.env.ART_APPROVAL_OTP_SECRET = "short";
    expect(() => getArtApprovalOtpSecret()).toThrow("at least 16");
  });

  it("hashOtpCode requires secret", async () => {
    delete process.env.ART_APPROVAL_OTP_SECRET;
    await expect(hashOtpCode("123456")).rejects.toThrow("ART_APPROVAL_OTP_SECRET");
  });

  it("verifyOtpCode requires secret when code format is valid", async () => {
    process.env.ART_APPROVAL_OTP_SECRET = "valid-secret-16chars";
    const hash = await hashOtpCode("999999");
    delete process.env.ART_APPROVAL_OTP_SECRET;
    await expect(verifyOtpCode("999999", hash)).rejects.toThrow("ART_APPROVAL_OTP_SECRET");
  });
});

describe("art approval review session cookie", () => {
  const prevReview = process.env.ART_APPROVAL_REVIEW_SESSION_SECRET;

  afterEach(() => {
    if (prevReview === undefined) {
      delete process.env.ART_APPROVAL_REVIEW_SESSION_SECRET;
    } else {
      process.env.ART_APPROVAL_REVIEW_SESSION_SECRET = prevReview;
    }
  });

  it("round-trips signed session payload", () => {
    process.env.ART_APPROVAL_REVIEW_SESSION_SECRET = "vitest-review-session-secret-16";
    const token = signArtApprovalReviewSession({
      approvalId: "00000000-0000-0000-0000-000000000001",
      email: "client@example.com",
      round: 2,
    });
    const parsed = verifyArtApprovalReviewSession(token);
    expect(parsed).toEqual({
      approvalId: "00000000-0000-0000-0000-000000000001",
      email: "client@example.com",
      round: 2,
    });
  });

  it("rejects tampered cookie", () => {
    process.env.ART_APPROVAL_REVIEW_SESSION_SECRET = "vitest-review-session-secret-16";
    const token = signArtApprovalReviewSession({
      approvalId: "a",
      email: "x@y.z",
      round: 1,
    });
    const tampered = `${token.slice(0, -4)}xxxx`;
    expect(verifyArtApprovalReviewSession(tampered)).toBeNull();
  });
});

describe("otp / payload validation helpers", () => {
  it("assertValidOtpCode accepts six digits only", () => {
    expect(() => assertValidOtpCode("000000")).not.toThrow();
    expect(() => assertValidOtpCode("123456")).not.toThrow();
    expect(() => assertValidOtpCode("12345")).toThrow("6-digit");
    expect(() => assertValidOtpCode("1234567")).toThrow("6-digit");
  });

  it("normalizes email", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("assertAllowlistEmailArray validates shape and allows empty", () => {
    const empty: unknown = [];
    expect(() => assertAllowlistEmailArray(empty)).not.toThrow();

    const ok: unknown = ["a@b.co", "C@D.org"];
    expect(() => assertAllowlistEmailArray(ok)).not.toThrow();

    expect(() => assertAllowlistEmailArray({})).toThrow("array");
    expect(() => assertAllowlistEmailArray(["not-an-email"])).toThrow("valid email");
  });

  it("assertAllowlistEmails requires at least one entry", () => {
    expect(() => assertAllowlistEmails([])).toThrow("At least one");
    expect(() => assertAllowlistEmails(["x@y.z"])).not.toThrow();
  });

  it("assertUpdateArtApprovalStatus rejects unknown status", () => {
    expect(() => assertUpdateArtApprovalStatus("draft")).not.toThrow();
    expect(() => assertUpdateArtApprovalStatus("bogus")).toThrow("Invalid art approval status");
  });

  it("requires comment when decision is changes_requested", () => {
    expect(() =>
      assertClientDecisionPayload({
        decisionType: "changes_requested",
        typedFullName: "Jane Doe",
        confirmed: true,
        comment: "",
      }),
    ).toThrow("Comment is required");
  });

  it("assertClientDecisionPayload enforces confirmation and comments", () => {
    expect(() =>
      assertClientDecisionPayload({
        decisionType: "approved",
        typedFullName: "Jane Doe",
        confirmed: false,
      }),
    ).toThrow("Confirmation");

    expect(() =>
      assertClientDecisionPayload({
        decisionType: "approved",
        typedFullName: " ",
        confirmed: true,
      }),
    ).toThrow("Full name");

    expect(() =>
      assertClientDecisionPayload({
        decisionType: "changes_requested",
        typedFullName: "Jane Doe",
        confirmed: true,
        comment: "",
      }),
    ).toThrow("Comment is required");

    expect(() =>
      assertClientDecisionPayload({
        decisionType: "changes_requested",
        typedFullName: "Jane Doe",
        confirmed: true,
        comment: "   ",
      }),
    ).toThrow("Comment is required");

    expect(() =>
      assertClientDecisionPayload({
        decisionType: "changes_requested",
        typedFullName: "Jane Doe",
        confirmed: true,
        comment: "Need larger logo",
      }),
    ).not.toThrow();
  });
});

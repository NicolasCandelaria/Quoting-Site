import { describe, expect, it } from "vitest";
import type { ArtApprovalDecisionType, ArtApprovalStatus } from "./models";
import {
  assertAllowlistEmailArray,
  assertAllowlistEmails,
  assertClientDecisionPayload,
  assertValidOtpCode,
  normalizeEmail,
} from "./validation";
import {
  generateNumericOtpCode,
  hashOtpCode,
  hashReviewToken,
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

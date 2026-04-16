import { describe, expect, it } from "vitest";
import { computeQuickProfit } from "./quick-profit-calculator";

describe("computeQuickProfit", () => {
  it("amortizes sample and combines unit cost (USD/USD)", () => {
    const r = computeQuickProfit({
      quantity: 400,
      unitCost: 1,
      sampleInspectionTotal: 400,
      costCurrency: "USD",
      quoteCurrency: "USD",
      usdCadRate: 1.41,
      markupPercent: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakdown.samplePerUnitCostCurrency).toBe(1);
    expect(r.breakdown.combinedPerUnitCostCurrency).toBe(2);
    expect(r.breakdown.fxApplied).toBe(false);
    expect(r.breakdown.combinedPerUnitQuoteCurrency).toBe(2);
    expect(r.breakdown.sellPricePerUnitQuoteCurrency).toBe(2);
  });

  it("applies markup on same currency combined cost", () => {
    const r = computeQuickProfit({
      quantity: 100,
      unitCost: 10,
      sampleInspectionTotal: 0,
      costCurrency: "USD",
      quoteCurrency: "USD",
      usdCadRate: 1.41,
      markupPercent: 20,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakdown.combinedPerUnitQuoteCurrency).toBe(10);
    expect(r.breakdown.sellPricePerUnitQuoteCurrency).toBe(12);
  });

  it("converts USD cost to CAD with R=1.41 then markup", () => {
    const r = computeQuickProfit({
      quantity: 400,
      unitCost: 1,
      sampleInspectionTotal: 400,
      costCurrency: "USD",
      quoteCurrency: "CAD",
      usdCadRate: 1.41,
      markupPercent: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakdown.fxApplied).toBe(true);
    expect(r.breakdown.combinedPerUnitCostCurrency).toBe(2);
    expect(r.breakdown.combinedPerUnitQuoteCurrency).toBeCloseTo(2 * 1.41, 10);
    expect(r.breakdown.sellPricePerUnitQuoteCurrency).toBeCloseTo(2 * 1.41, 10);
  });

  it("converts CAD cost to USD with R=1.41", () => {
    const r = computeQuickProfit({
      quantity: 1,
      unitCost: 2.82,
      sampleInspectionTotal: 0,
      costCurrency: "CAD",
      quoteCurrency: "USD",
      usdCadRate: 1.41,
      markupPercent: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakdown.combinedPerUnitQuoteCurrency).toBeCloseTo(2, 10);
  });

  it("rejects non-positive quantity", () => {
    const r = computeQuickProfit({
      quantity: 0,
      unitCost: 1,
      sampleInspectionTotal: 0,
      costCurrency: "USD",
      quoteCurrency: "USD",
      usdCadRate: 1.41,
      markupPercent: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.some((e) => e.includes("Quantity"))).toBe(true);
  });

  it("rejects non-positive FX rate when conversion is needed", () => {
    const r = computeQuickProfit({
      quantity: 1,
      unitCost: 1,
      sampleInspectionTotal: 0,
      costCurrency: "USD",
      quoteCurrency: "CAD",
      usdCadRate: 0,
      markupPercent: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.some((e) => e.includes("Exchange rate"))).toBe(true);
  });
});

export type Currency = "USD" | "CAD";

export type QuickProfitInput = {
  quantity: number;
  unitCost: number;
  sampleInspectionTotal: number;
  costCurrency: Currency;
  quoteCurrency: Currency;
  /** 1 USD = usdCadRate CAD. Used only when cost and quote currencies differ. */
  usdCadRate: number;
  markupPercent: number;
};

export type QuickProfitBreakdown = {
  samplePerUnitCostCurrency: number;
  combinedPerUnitCostCurrency: number;
  fxApplied: boolean;
  combinedPerUnitQuoteCurrency: number;
  sellPricePerUnitQuoteCurrency: number;
};

export type QuickProfitResult =
  | { ok: true; breakdown: QuickProfitBreakdown }
  | { ok: false; errors: string[] };

function isFiniteNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

/**
 * Amortize sample/inspection into unit cost, optionally convert USD↔CAD, then apply markup % on quote-currency combined per-unit cost.
 */
export function computeQuickProfit(input: QuickProfitInput): QuickProfitResult {
  const errors: string[] = [];

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    errors.push("Quantity must be greater than zero.");
  }
  if (!isFiniteNonNegative(input.unitCost)) {
    errors.push("Unit cost must be a number ≥ 0.");
  }
  if (!isFiniteNonNegative(input.sampleInspectionTotal)) {
    errors.push("Sample/inspection total must be a number ≥ 0.");
  }
  if (!isFiniteNonNegative(input.markupPercent)) {
    errors.push("Markup must be a number ≥ 0.");
  }

  const fxNeeded = input.costCurrency !== input.quoteCurrency;
  if (fxNeeded) {
    if (!Number.isFinite(input.usdCadRate) || input.usdCadRate <= 0) {
      errors.push("Exchange rate must be greater than zero (1 USD = R CAD).");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const samplePerUnitCostCurrency =
    input.sampleInspectionTotal / input.quantity;
  const combinedPerUnitCostCurrency =
    input.unitCost + samplePerUnitCostCurrency;

  let combinedPerUnitQuoteCurrency: number;
  let fxApplied = false;

  if (!fxNeeded) {
    combinedPerUnitQuoteCurrency = combinedPerUnitCostCurrency;
  } else {
    fxApplied = true;
    if (input.costCurrency === "USD" && input.quoteCurrency === "CAD") {
      combinedPerUnitQuoteCurrency =
        combinedPerUnitCostCurrency * input.usdCadRate;
    } else if (input.costCurrency === "CAD" && input.quoteCurrency === "USD") {
      combinedPerUnitQuoteCurrency =
        combinedPerUnitCostCurrency / input.usdCadRate;
    } else {
      return {
        ok: false,
        errors: ["Unsupported currency pair (only USD and CAD are supported)."],
      };
    }
  }

  const sellPricePerUnitQuoteCurrency =
    combinedPerUnitQuoteCurrency * (1 + input.markupPercent / 100);

  return {
    ok: true,
    breakdown: {
      samplePerUnitCostCurrency,
      combinedPerUnitCostCurrency,
      fxApplied,
      combinedPerUnitQuoteCurrency,
      sellPricePerUnitQuoteCurrency,
    },
  };
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

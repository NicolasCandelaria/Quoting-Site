import type { PriceTier } from "@/lib/models";
import {
  computeQuickProfit,
  type Currency,
  type QuickProfitBreakdown,
  type QuickProfitResult,
} from "@/lib/quick-profit-calculator";

export const DEFAULT_USD_CAD_RATE = 1.41;
export const QUICK_PROFIT_STORAGE_V2 = "quote-sheet:quick-profit-calculator:v2";
export const QUICK_PROFIT_STORAGE_V1 = "quote-sheet:quick-profit-calculator:v1";
export const TIER_COUNT = 3;

export type TierForm = {
  quantityStr: string;
  unitCostStr: string;
  sampleStr: string;
  markupStr: string;
};

export type SharedForm = {
  applyFxConversion: boolean;
  costCurrency: Currency;
  quoteCurrency: Currency;
  usdCadRateStr: string;
};

export type PersistedV2 = {
  shared: SharedForm;
  tiers: TierForm[];
};

type LegacyFlat = {
  quantityStr?: string;
  unitCostStr?: string;
  sampleStr?: string;
  markupStr?: string;
  costCurrency?: Currency;
  quoteCurrency?: Currency;
  usdCadRateStr?: string;
  applyFxConversion?: boolean;
};

function isCurrency(v: unknown): v is Currency {
  return v === "USD" || v === "CAD";
}

export function defaultTier(overrides?: Partial<TierForm>): TierForm {
  const base: TierForm = {
    quantityStr: "400",
    unitCostStr: "1",
    sampleStr: "400",
    markupStr: "0",
  };
  if (!overrides) return base;
  return {
    quantityStr: overrides.quantityStr ?? base.quantityStr,
    unitCostStr: overrides.unitCostStr ?? base.unitCostStr,
    sampleStr: overrides.sampleStr ?? base.sampleStr,
    markupStr: overrides.markupStr ?? base.markupStr,
  };
}

export function defaultShared(overrides?: Partial<SharedForm>): SharedForm {
  const base: SharedForm = {
    applyFxConversion: true,
    costCurrency: "USD",
    quoteCurrency: "CAD",
    usdCadRateStr: String(DEFAULT_USD_CAD_RATE),
  };
  if (!overrides) return base;
  return {
    applyFxConversion:
      overrides.applyFxConversion ?? base.applyFxConversion,
    costCurrency: overrides.costCurrency ?? base.costCurrency,
    quoteCurrency: overrides.quoteCurrency ?? base.quoteCurrency,
    usdCadRateStr: overrides.usdCadRateStr ?? base.usdCadRateStr,
  };
}

export function parsePersisted(raw: string): PersistedV2 | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (Array.isArray(p.tiers)) {
      const qtyDefaults = ["400", "200", "100"] as const;
      const tiers: TierForm[] = [];
      for (let i = 0; i < TIER_COUNT; i++) {
        const t = p.tiers[i] as Record<string, unknown> | undefined;
        if (t && typeof t === "object") {
          tiers.push(
            defaultTier({
              quantityStr:
                typeof t.quantityStr === "string"
                  ? t.quantityStr
                  : qtyDefaults[i],
              unitCostStr:
                typeof t.unitCostStr === "string" ? t.unitCostStr : undefined,
              sampleStr:
                typeof t.sampleStr === "string" ? t.sampleStr : undefined,
              markupStr:
                typeof t.markupStr === "string" ? t.markupStr : undefined,
            }),
          );
        } else {
          tiers.push(defaultTier({ quantityStr: qtyDefaults[i] }));
        }
      }
      const s = p.shared as Record<string, unknown> | undefined;
      const shared = defaultShared({
        applyFxConversion:
          typeof s?.applyFxConversion === "boolean"
            ? s.applyFxConversion
            : true,
        costCurrency: isCurrency(s?.costCurrency)
          ? s.costCurrency
          : "USD",
        quoteCurrency: isCurrency(s?.quoteCurrency)
          ? s.quoteCurrency
          : "CAD",
        usdCadRateStr:
          typeof s?.usdCadRateStr === "string"
            ? s.usdCadRateStr
            : String(DEFAULT_USD_CAD_RATE),
      });
      return { shared, tiers };
    }
    const flat = p as LegacyFlat;
    const tier = defaultTier({
      ...(typeof flat.quantityStr === "string"
        ? { quantityStr: flat.quantityStr }
        : {}),
      ...(typeof flat.unitCostStr === "string"
        ? { unitCostStr: flat.unitCostStr }
        : {}),
      ...(typeof flat.sampleStr === "string" ? { sampleStr: flat.sampleStr } : {}),
      ...(typeof flat.markupStr === "string" ? { markupStr: flat.markupStr } : {}),
    });
    const shared = defaultShared({
      ...(typeof flat.applyFxConversion === "boolean"
        ? { applyFxConversion: flat.applyFxConversion }
        : {}),
      ...(isCurrency(flat.costCurrency)
        ? { costCurrency: flat.costCurrency }
        : {}),
      ...(isCurrency(flat.quoteCurrency)
        ? { quoteCurrency: flat.quoteCurrency }
        : {}),
      ...(typeof flat.usdCadRateStr === "string"
        ? { usdCadRateStr: flat.usdCadRateStr }
        : {}),
    });
    return {
      shared,
      tiers: [
        tier,
        defaultTier({ quantityStr: "200" }),
        defaultTier({ quantityStr: "100" }),
      ],
    };
  } catch {
    return null;
  }
}

export function readQuickProfitFromLocalStorage(): PersistedV2 | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = localStorage.getItem(QUICK_PROFIT_STORAGE_V2);
    if (!raw) raw = localStorage.getItem(QUICK_PROFIT_STORAGE_V1);
    if (!raw) return null;
    return parsePersisted(raw);
  } catch {
    return null;
  }
}

type MemoParse = { kind: "parse" };
export type TierMemoResult = MemoParse | QuickProfitResult;

function parseNonNegative(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parsePositiveQty(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parsePositiveRate(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function computePersistedTierMemo(
  tier: TierForm,
  shared: SharedForm,
): { result: TierMemoResult; fxNeededUi: boolean } {
  const fxNeededUi =
    shared.applyFxConversion && shared.costCurrency !== shared.quoteCurrency;

  const quantity = parsePositiveQty(tier.quantityStr);
  const unitCost = parseNonNegative(tier.unitCostStr);
  const sampleInspectionTotal = parseNonNegative(tier.sampleStr);
  const markupPercent = parseNonNegative(tier.markupStr);
  const usdCadRate = parsePositiveRate(shared.usdCadRateStr);

  if (
    quantity === null ||
    unitCost === null ||
    sampleInspectionTotal === null ||
    markupPercent === null
  ) {
    return { result: { kind: "parse" as const }, fxNeededUi };
  }
  if (fxNeededUi && usdCadRate === null) {
    return { result: { kind: "parse" as const }, fxNeededUi };
  }

  const result = computeQuickProfit({
    quantity,
    unitCost,
    sampleInspectionTotal,
    costCurrency: shared.costCurrency,
    quoteCurrency: shared.quoteCurrency,
    usdCadRate: fxNeededUi ? (usdCadRate ?? DEFAULT_USD_CAD_RATE) : 1.41,
    markupPercent,
    applyFxConversion: shared.applyFxConversion,
  });
  return { result, fxNeededUi };
}

export function isParseTierResult(
  r: TierMemoResult,
): r is MemoParse {
  return "kind" in r && r.kind === "parse";
}

/**
 * Replace item pricing tiers with three rows from Quick Profit Calculator localStorage.
 * Preserves productionPlusTransitTime from prevTiers[i] when index exists.
 */
export function buildImportedPriceTiers(
  prevTiers: PriceTier[],
):
  | { ok: true; tiers: PriceTier[] }
  | { ok: false; message: string } {
  const data = readQuickProfitFromLocalStorage();
  if (!data) {
    return {
      ok: false,
      message:
        "No Quick Profit Calculator data found. Open the calculator and enter values, then try again.",
    };
  }

  const out: PriceTier[] = [];

  for (let i = 0; i < TIER_COUNT; i++) {
    const tier = data.tiers[i];
    if (!tier) {
      return {
        ok: false,
        message: `Calculator tier ${i + 1} is missing. Save the calculator again.`,
      };
    }

    const { result } = computePersistedTierMemo(tier, data.shared);

    if (isParseTierResult(result)) {
      return {
        ok: false,
        message: `Tier ${i + 1} in the calculator has invalid numbers (quantity, costs, sample, markup, or exchange rate). Fix the calculator and try again.`,
      };
    }

    if (!result.ok) {
      return {
        ok: false,
        message: result.errors.join(" ") || `Calculator tier ${i + 1} failed validation.`,
      };
    }

    const b: QuickProfitBreakdown = result.breakdown;
    const qty = parsePositiveQty(tier.quantityStr);
    if (qty === null) {
      return { ok: false, message: `Tier ${i + 1} needs a quantity greater than zero.` };
    }

    out.push({
      qty,
      pricePerUnitDDP: b.sellPricePerUnitQuoteCurrency,
      productionPlusTransitTime:
        prevTiers[i]?.productionPlusTransitTime ?? "",
    });
  }

  return { ok: true, tiers: out };
}

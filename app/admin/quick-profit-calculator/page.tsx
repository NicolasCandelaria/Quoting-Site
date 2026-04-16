"use client";

import {
  computeQuickProfit,
  formatMoney,
  type Currency,
  type QuickProfitResult,
} from "@/lib/quick-profit-calculator";
import { ClipboardCopy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_USD_CAD_RATE = 1.41;
const STORAGE_KEY = "quote-sheet:quick-profit-calculator:v2";
const LEGACY_STORAGE_KEY = "quote-sheet:quick-profit-calculator:v1";
const TIER_COUNT = 3;

type TierForm = {
  quantityStr: string;
  unitCostStr: string;
  sampleStr: string;
  markupStr: string;
};

type SharedForm = {
  applyFxConversion: boolean;
  costCurrency: Currency;
  quoteCurrency: Currency;
  usdCadRateStr: string;
};

type PersistedV2 = {
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

function defaultTier(overrides?: Partial<TierForm>): TierForm {
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

function defaultShared(overrides?: Partial<SharedForm>): SharedForm {
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

function parsePersisted(raw: string): PersistedV2 | null {
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

type MemoResult = { kind: "parse" } | QuickProfitResult;

function isParseResult(r: MemoResult): r is { kind: "parse" } {
  return "kind" in r && r.kind === "parse";
}

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

function computeTierMemo(
  tier: TierForm,
  shared: SharedForm,
): { result: MemoResult; fxNeededUi: boolean } {
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

const TIER_LABELS = ["Tier 1", "Tier 2", "Tier 3"] as const;

export default function QuickProfitCalculatorPage() {
  const [tiers, setTiers] = useState<TierForm[]>(() => [
    defaultTier(),
    defaultTier({ quantityStr: "200" }),
    defaultTier({ quantityStr: "100" }),
  ]);
  const [shared, setShared] = useState<SharedForm>(() => defaultShared());
  const [copied, setCopied] = useState<{
    tier: number;
    kind: "price" | "summary";
  } | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  const updateTier = useCallback(
    (index: number, patch: Partial<TierForm>) => {
      setTiers((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
      );
    },
    [],
  );

  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = parsePersisted(raw);
        if (parsed) {
          setTiers(parsed.tiers.slice(0, TIER_COUNT));
          setShared(parsed.shared);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      const payload: PersistedV2 = { shared, tiers };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [storageReady, shared, tiers]);

  const fxNeededUi =
    shared.applyFxConversion && shared.costCurrency !== shared.quoteCurrency;

  const tierComputations = useMemo(() => {
    return tiers.map((tier) => computeTierMemo(tier, shared));
  }, [tiers, shared]);

  const pricingCurrencies = useMemo(() => {
    return tierComputations.map(({ result }) => {
      if (!isParseResult(result) && result.ok && result.breakdown.fxApplied) {
        return shared.quoteCurrency;
      }
      return shared.costCurrency;
    });
  }, [tierComputations, shared.costCurrency, shared.quoteCurrency]);

  const copyPrice = async (tierIndex: number) => {
    const { result } = tierComputations[tierIndex];
    if (isParseResult(result) || !result.ok) return;
    const pc = pricingCurrencies[tierIndex];
    const text = formatMoney(
      result.breakdown.sellPricePerUnitQuoteCurrency,
      pc,
    );
    await navigator.clipboard.writeText(text);
    setCopied({ tier: tierIndex, kind: "price" });
    setTimeout(() => setCopied(null), 2000);
  };

  const copySummary = async (tierIndex: number) => {
    const { result } = tierComputations[tierIndex];
    if (isParseResult(result) || !result.ok) return;
    const b = result.breakdown;
    const pc = pricingCurrencies[tierIndex];
    const lines = [
      `${TIER_LABELS[tierIndex]} — sample/inspection per unit (${shared.costCurrency}): ${formatMoney(b.samplePerUnitCostCurrency, shared.costCurrency)}`,
      `Extended cost per unit (${shared.costCurrency}): ${formatMoney(b.combinedPerUnitCostCurrency, shared.costCurrency)}`,
    ];
    if (b.fxApplied) {
      lines.push(
        `Combined after FX (${shared.quoteCurrency}): ${formatMoney(b.combinedPerUnitQuoteCurrency, shared.quoteCurrency)}`,
      );
    }
    lines.push(
      `Sell price per unit (${pc}): ${formatMoney(b.sellPricePerUnitQuoteCurrency, pc)}`,
      `Profit per unit (${pc}): ${formatMoney(b.profitPerUnitQuoteCurrency, pc)}`,
      `Client PO amount (${pc}): ${formatMoney(b.clientPoAmountQuoteCurrency, pc)}`,
      `PO profit (${pc}): ${formatMoney(b.poProfitQuoteCurrency, pc)}`,
    );
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied({ tier: tierIndex, kind: "summary" });
    setTimeout(() => setCopied(null), 2000);
  };

  const thCost =
    "border border-slate-200 bg-slate-50/90 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary";
  const thPrice =
    "border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary";
  const thSell =
    "border border-slate-200 bg-violet-100/90 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#1e1359] border-x-2 border-x-[#24186e]/35";
  const td =
    "border border-slate-200 px-2 py-2 align-middle bg-white/90 min-w-[7.5rem]";
  const tdDivider =
    "border border-slate-200 border-r-4 border-r-slate-800 px-2 py-2 align-middle bg-slate-50/50 min-w-[7.5rem]";
  const tdReadonly =
    "border border-slate-200 px-3 py-2 align-middle tabular-nums text-body text-text-primary bg-slate-50/40";
  const tdSellReadonly =
    "border border-slate-200 px-3 py-2 align-middle tabular-nums text-body font-medium text-[#1e1359] bg-violet-50/90 border-x-2 border-x-[#24186e]/30";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold text-text-primary">
          Quick Profit Calculator
        </h1>
        <p className="text-body text-text-secondary max-w-3xl">
          Three tiers (typical quote quantity breaks). Shared currency settings
          apply to all tiers. Toggle conversion off for USD-only runs. Values
          are saved in this browser.
        </p>
      </header>

      <div className="card space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 text-body text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[#24186e] focus:ring-[#24186e]"
              checked={shared.applyFxConversion}
              onChange={(e) =>
                setShared((s) => ({
                  ...s,
                  applyFxConversion: e.target.checked,
                }))
              }
            />
            <span>Apply USD/CAD conversion</span>
          </label>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label">Cost currency</label>
              <select
                className="input h-10 min-w-[8rem]"
                value={shared.costCurrency}
                onChange={(e) =>
                  setShared((s) => ({
                    ...s,
                    costCurrency: e.target.value === "CAD" ? "CAD" : "USD",
                  }))
                }
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            {shared.applyFxConversion && (
              <div>
                <label className="label">Quote currency</label>
                <select
                  className="input h-10 min-w-[8rem]"
                  value={shared.quoteCurrency}
                  onChange={(e) =>
                    setShared((s) => ({
                      ...s,
                      quoteCurrency: e.target.value === "CAD" ? "CAD" : "USD",
                    }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            )}
            {fxNeededUi && (
              <div className="min-w-[12rem]">
                <label className="label">1 USD = … CAD</label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  className="input placeholder:text-slate-400"
                  value={shared.usdCadRateStr}
                  onChange={(e) =>
                    setShared((s) => ({ ...s, usdCadRateStr: e.target.value }))
                  }
                  placeholder={String(DEFAULT_USD_CAD_RATE)}
                />
              </div>
            )}
          </div>
        </div>

        {tiers.map((tier, tierIndex) => {
          const { result } = tierComputations[tierIndex];
          const showBreakdown =
            !isParseResult(result) && result.ok ? result.breakdown : null;
          const showErrors =
            !isParseResult(result) && !result.ok ? result.errors : null;
          const pricingCurrency = pricingCurrencies[tierIndex];

          return (
            <div key={tierIndex} className="space-y-3">
              <h2 className="text-lg font-semibold text-text-primary">
                {TIER_LABELS[tierIndex]}
              </h2>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={5} className={thCost}>
                        Cost build-up
                      </th>
                      <th colSpan={5} className={thPrice}>
                        Pricing &amp; PO
                      </th>
                    </tr>
                    <tr>
                      <th className={thCost}>Qty</th>
                      <th className={thCost}>Sample / inspection</th>
                      <th className={thCost}>Amortization / unit</th>
                      <th className={thCost}>Unit cost</th>
                      <th className={`${thCost} border-r-4 border-r-slate-800`}>
                        Extended cost / unit
                      </th>
                      <th className={thPrice}>Markup %</th>
                      <th className={thSell}>Sell price / unit</th>
                      <th className={thPrice}>Profit / unit</th>
                      <th className={thPrice}>Client PO amount</th>
                      <th className={thPrice}>PO profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={td}>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input h-9 w-full min-w-0 text-sm"
                          value={tier.quantityStr}
                          onChange={(e) =>
                            updateTier(tierIndex, {
                              quantityStr: e.target.value,
                            })
                          }
                          aria-label={`${TIER_LABELS[tierIndex]} quantity`}
                        />
                      </td>
                      <td className={td}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input h-9 w-full min-w-0 text-sm"
                          value={tier.sampleStr}
                          onChange={(e) =>
                            updateTier(tierIndex, { sampleStr: e.target.value })
                          }
                          aria-label={`${TIER_LABELS[tierIndex]} sample inspection total`}
                        />
                        <span className="mt-0.5 block text-caption text-text-secondary">
                          {shared.costCurrency}
                        </span>
                      </td>
                      <td className={tdReadonly}>
                        {showBreakdown
                          ? formatMoney(
                              showBreakdown.samplePerUnitCostCurrency,
                              shared.costCurrency,
                            )
                          : "—"}
                      </td>
                      <td className={td}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input h-9 w-full min-w-0 text-sm"
                          value={tier.unitCostStr}
                          onChange={(e) =>
                            updateTier(tierIndex, {
                              unitCostStr: e.target.value,
                            })
                          }
                          aria-label={`${TIER_LABELS[tierIndex]} unit cost`}
                        />
                        <span className="mt-0.5 block text-caption text-text-secondary">
                          {shared.costCurrency}
                        </span>
                      </td>
                      <td className={tdDivider}>
                        {showBreakdown
                          ? formatMoney(
                              showBreakdown.combinedPerUnitCostCurrency,
                              shared.costCurrency,
                            )
                          : "—"}
                      </td>
                      <td className={td}>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          className="input h-9 w-full min-w-0 text-sm"
                          value={tier.markupStr}
                          onChange={(e) =>
                            updateTier(tierIndex, {
                              markupStr: e.target.value,
                            })
                          }
                          aria-label={`${TIER_LABELS[tierIndex]} markup percent`}
                        />
                      </td>
                      <td className={tdSellReadonly}>
                        {showBreakdown
                          ? formatMoney(
                              showBreakdown.sellPricePerUnitQuoteCurrency,
                              pricingCurrency,
                            )
                          : "—"}
                        {showBreakdown && (
                          <span className="mt-0.5 block text-caption font-normal text-[#24186e]/80">
                            {pricingCurrency}
                          </span>
                        )}
                      </td>
                      <td className={tdReadonly}>
                        {showBreakdown
                          ? formatMoney(
                              showBreakdown.profitPerUnitQuoteCurrency,
                              pricingCurrency,
                            )
                          : "—"}
                      </td>
                      <td className={tdReadonly}>
                        {showBreakdown
                          ? formatMoney(
                              showBreakdown.clientPoAmountQuoteCurrency,
                              pricingCurrency,
                            )
                          : "—"}
                      </td>
                      <td className={tdReadonly}>
                        {showBreakdown
                          ? formatMoney(
                              showBreakdown.poProfitQuoteCurrency,
                              pricingCurrency,
                            )
                          : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {isParseResult(result) && (
                <p className="text-body text-text-secondary">
                  Enter valid numbers for quantity, costs, sample, and markup
                  {fxNeededUi ? " (and a positive exchange rate)" : ""}.
                </p>
              )}

              {showErrors && (
                <ul className="list-inside list-disc space-y-1 text-body text-status-error">
                  {showErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm h-9 px-3"
                  disabled={!showBreakdown}
                  onClick={() => void copyPrice(tierIndex)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy sell price
                </button>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm h-9 px-3"
                  disabled={!showBreakdown}
                  onClick={() => void copySummary(tierIndex)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy breakdown
                </button>
                {copied?.tier === tierIndex && (
                  <span
                    className="text-caption text-text-secondary"
                    role="status"
                  >
                    Copied {copied.kind === "price" ? "sell price" : "breakdown"}
                    .
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

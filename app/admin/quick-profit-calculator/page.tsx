"use client";

import {
  computeQuickProfit,
  formatMoney,
  type Currency,
  type QuickProfitResult,
} from "@/lib/quick-profit-calculator";
import { ClipboardCopy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_USD_CAD_RATE = 1.41;
const STORAGE_KEY = "quote-sheet:quick-profit-calculator:v1";

type PersistedForm = {
  quantityStr: string;
  unitCostStr: string;
  sampleStr: string;
  markupStr: string;
  costCurrency: Currency;
  quoteCurrency: Currency;
  usdCadRateStr: string;
  /** Default true when missing (preserve prior behavior). */
  applyFxConversion: boolean;
};

function isCurrency(v: unknown): v is Currency {
  return v === "USD" || v === "CAD";
}

function parsePersisted(raw: string): Partial<PersistedForm> | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<PersistedForm> = {};
    if (typeof p.quantityStr === "string") out.quantityStr = p.quantityStr;
    if (typeof p.unitCostStr === "string") out.unitCostStr = p.unitCostStr;
    if (typeof p.sampleStr === "string") out.sampleStr = p.sampleStr;
    if (typeof p.markupStr === "string") out.markupStr = p.markupStr;
    if (isCurrency(p.costCurrency)) out.costCurrency = p.costCurrency;
    if (isCurrency(p.quoteCurrency)) out.quoteCurrency = p.quoteCurrency;
    if (typeof p.usdCadRateStr === "string") out.usdCadRateStr = p.usdCadRateStr;
    if (typeof p.applyFxConversion === "boolean")
      out.applyFxConversion = p.applyFxConversion;
    return Object.keys(out).length > 0 ? out : null;
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

export default function QuickProfitCalculatorPage() {
  const [quantityStr, setQuantityStr] = useState("400");
  const [unitCostStr, setUnitCostStr] = useState("1");
  const [sampleStr, setSampleStr] = useState("400");
  const [markupStr, setMarkupStr] = useState("0");
  const [costCurrency, setCostCurrency] = useState<Currency>("USD");
  const [quoteCurrency, setQuoteCurrency] = useState<Currency>("CAD");
  const [usdCadRateStr, setUsdCadRateStr] = useState(
    String(DEFAULT_USD_CAD_RATE),
  );
  /** When false, all amounts stay in cost currency (no FX). Default true for returning users. */
  const [applyFxConversion, setApplyFxConversion] = useState(true);
  const [copied, setCopied] = useState<"price" | "summary" | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = parsePersisted(raw);
        if (p) {
          if (p.quantityStr !== undefined) setQuantityStr(p.quantityStr);
          if (p.unitCostStr !== undefined) setUnitCostStr(p.unitCostStr);
          if (p.sampleStr !== undefined) setSampleStr(p.sampleStr);
          if (p.markupStr !== undefined) setMarkupStr(p.markupStr);
          if (p.costCurrency !== undefined) setCostCurrency(p.costCurrency);
          if (p.quoteCurrency !== undefined) setQuoteCurrency(p.quoteCurrency);
          if (p.usdCadRateStr !== undefined) setUsdCadRateStr(p.usdCadRateStr);
          if (p.applyFxConversion !== undefined)
            setApplyFxConversion(p.applyFxConversion);
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
      const payload: PersistedForm = {
        quantityStr,
        unitCostStr,
        sampleStr,
        markupStr,
        costCurrency,
        quoteCurrency,
        usdCadRateStr,
        applyFxConversion,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }, [
    storageReady,
    quantityStr,
    unitCostStr,
    sampleStr,
    markupStr,
    costCurrency,
    quoteCurrency,
    usdCadRateStr,
    applyFxConversion,
  ]);

  const fxNeededUi =
    applyFxConversion && costCurrency !== quoteCurrency;

  const result: MemoResult = useMemo(() => {
    const quantity = parsePositiveQty(quantityStr);
    const unitCost = parseNonNegative(unitCostStr);
    const sampleInspectionTotal = parseNonNegative(sampleStr);
    const markupPercent = parseNonNegative(markupStr);
    const usdCadRate = parsePositiveRate(usdCadRateStr);

    if (
      quantity === null ||
      unitCost === null ||
      sampleInspectionTotal === null ||
      markupPercent === null
    ) {
      return { kind: "parse" as const };
    }
    if (fxNeededUi && usdCadRate === null) {
      return { kind: "parse" as const };
    }

    return computeQuickProfit({
      quantity,
      unitCost,
      sampleInspectionTotal,
      costCurrency,
      quoteCurrency,
      usdCadRate: fxNeededUi ? (usdCadRate ?? DEFAULT_USD_CAD_RATE) : 1.41,
      markupPercent,
      applyFxConversion,
    });
  }, [
    quantityStr,
    unitCostStr,
    sampleStr,
    markupStr,
    costCurrency,
    quoteCurrency,
    usdCadRateStr,
    fxNeededUi,
    applyFxConversion,
  ]);

  const pricingCurrency: Currency =
    !isParseResult(result) && result.ok && result.breakdown.fxApplied
      ? quoteCurrency
      : costCurrency;

  const copyPrice = async () => {
    if (isParseResult(result) || !result.ok) return;
    const text = formatMoney(
      result.breakdown.sellPricePerUnitQuoteCurrency,
      pricingCurrency,
    );
    await navigator.clipboard.writeText(text);
    setCopied("price");
    setTimeout(() => setCopied(null), 2000);
  };

  const copySummary = async () => {
    if (isParseResult(result) || !result.ok) return;
    const b = result.breakdown;
    const lines = [
      `Sample/inspection per unit (${costCurrency}): ${formatMoney(b.samplePerUnitCostCurrency, costCurrency)}`,
      `Extended cost per unit (${costCurrency}): ${formatMoney(b.combinedPerUnitCostCurrency, costCurrency)}`,
    ];
    if (b.fxApplied) {
      lines.push(
        `Combined after FX (${quoteCurrency}): ${formatMoney(b.combinedPerUnitQuoteCurrency, quoteCurrency)}`,
      );
    }
    lines.push(
      `Sell price per unit (${pricingCurrency}): ${formatMoney(b.sellPricePerUnitQuoteCurrency, pricingCurrency)}`,
      `Profit per unit (${pricingCurrency}): ${formatMoney(b.profitPerUnitQuoteCurrency, pricingCurrency)}`,
      `Client PO amount (${pricingCurrency}): ${formatMoney(b.clientPoAmountQuoteCurrency, pricingCurrency)}`,
      `PO profit (${pricingCurrency}): ${formatMoney(b.poProfitQuoteCurrency, pricingCurrency)}`,
    );
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied("summary");
    setTimeout(() => setCopied(null), 2000);
  };

  const showBreakdown =
    !isParseResult(result) && result.ok ? result.breakdown : null;
  const showErrors =
    !isParseResult(result) && !result.ok ? result.errors : null;

  const thCost =
    "border border-slate-200 bg-slate-50/90 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary";
  const thPrice =
    "border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary";
  const td =
    "border border-slate-200 px-2 py-2 align-middle bg-white/90 min-w-[7.5rem]";
  const tdDivider =
    "border border-slate-200 border-r-4 border-r-slate-800 px-2 py-2 align-middle bg-slate-50/50 min-w-[7.5rem]";
  const tdReadonly =
    "border border-slate-200 px-3 py-2 align-middle tabular-nums text-body text-text-primary bg-slate-50/40";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold text-text-primary">
          Quick Profit Calculator
        </h1>
        <p className="text-body text-text-secondary max-w-3xl">
          Work like a quote sheet row: build extended cost, then sell price and
          PO totals. Toggle conversion off when everything is quoted in one
          currency (e.g. USD only). Values are saved in this browser.
        </p>
      </header>

      <div className="card space-y-4">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 text-body text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[#24186e] focus:ring-[#24186e]"
              checked={applyFxConversion}
              onChange={(e) => setApplyFxConversion(e.target.checked)}
            />
            <span>Apply USD/CAD conversion</span>
          </label>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label">Cost currency</label>
              <select
                className="input h-10 min-w-[8rem]"
                value={costCurrency}
                onChange={(e) =>
                  setCostCurrency(e.target.value === "CAD" ? "CAD" : "USD")
                }
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            {applyFxConversion && (
              <div>
                <label className="label">Quote currency</label>
                <select
                  className="input h-10 min-w-[8rem]"
                  value={quoteCurrency}
                  onChange={(e) =>
                    setQuoteCurrency(e.target.value === "CAD" ? "CAD" : "USD")
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
                  value={usdCadRateStr}
                  onChange={(e) => setUsdCadRateStr(e.target.value)}
                  placeholder={String(DEFAULT_USD_CAD_RATE)}
                />
              </div>
            )}
          </div>
        </div>

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
                <th className={thPrice}>Sell price / unit</th>
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
                    value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    aria-label="Quantity"
                  />
                </td>
                <td className={td}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input h-9 w-full min-w-0 text-sm"
                    value={sampleStr}
                    onChange={(e) => setSampleStr(e.target.value)}
                    aria-label="Sample inspection total"
                  />
                  <span className="mt-0.5 block text-caption text-text-secondary">
                    {costCurrency}
                  </span>
                </td>
                <td className={tdReadonly}>
                  {showBreakdown
                    ? formatMoney(
                        showBreakdown.samplePerUnitCostCurrency,
                        costCurrency,
                      )
                    : "—"}
                </td>
                <td className={td}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input h-9 w-full min-w-0 text-sm"
                    value={unitCostStr}
                    onChange={(e) => setUnitCostStr(e.target.value)}
                    aria-label="Unit cost"
                  />
                  <span className="mt-0.5 block text-caption text-text-secondary">
                    {costCurrency}
                  </span>
                </td>
                <td className={tdDivider}>
                  {showBreakdown
                    ? formatMoney(
                        showBreakdown.combinedPerUnitCostCurrency,
                        costCurrency,
                      )
                    : "—"}
                </td>
                <td className={td}>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="input h-9 w-full min-w-0 text-sm"
                    value={markupStr}
                    onChange={(e) => setMarkupStr(e.target.value)}
                    aria-label="Markup percent"
                  />
                </td>
                <td className={tdReadonly}>
                  {showBreakdown
                    ? formatMoney(
                        showBreakdown.sellPricePerUnitQuoteCurrency,
                        pricingCurrency,
                      )
                    : "—"}
                  {showBreakdown && (
                    <span className="mt-0.5 block text-caption text-text-secondary">
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

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-sm h-9 px-3"
            disabled={!showBreakdown}
            onClick={() => void copyPrice()}
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy sell price
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-sm h-9 px-3"
            disabled={!showBreakdown}
            onClick={() => void copySummary()}
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy breakdown
          </button>
          {copied && (
            <span className="text-caption text-text-secondary" role="status">
              Copied {copied === "price" ? "sell price" : "breakdown"}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

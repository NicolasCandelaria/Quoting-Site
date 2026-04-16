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
  ]);

  const fxNeeded = costCurrency !== quoteCurrency;

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
    if (fxNeeded && usdCadRate === null) {
      return { kind: "parse" as const };
    }

    return computeQuickProfit({
      quantity,
      unitCost,
      sampleInspectionTotal,
      costCurrency,
      quoteCurrency,
      usdCadRate: fxNeeded ? (usdCadRate ?? DEFAULT_USD_CAD_RATE) : 1.41,
      markupPercent,
    });
  }, [
    quantityStr,
    unitCostStr,
    sampleStr,
    markupStr,
    costCurrency,
    quoteCurrency,
    usdCadRateStr,
    fxNeeded,
  ]);

  const copyPrice = async () => {
    if (isParseResult(result) || !result.ok) return;
    const text = formatMoney(
      result.breakdown.sellPricePerUnitQuoteCurrency,
      quoteCurrency,
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
      `Combined per unit before FX (${costCurrency}): ${formatMoney(b.combinedPerUnitCostCurrency, costCurrency)}`,
    ];
    if (b.fxApplied) {
      lines.push(
        `Combined per unit after FX (${quoteCurrency}): ${formatMoney(b.combinedPerUnitQuoteCurrency, quoteCurrency)}`,
      );
    }
    lines.push(
      `Sell price per unit (${quoteCurrency}): ${formatMoney(b.sellPricePerUnitQuoteCurrency, quoteCurrency)}`,
    );
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied("summary");
    setTimeout(() => setCopied(null), 2000);
  };

  const showBreakdown =
    !isParseResult(result) && result.ok ? result.breakdown : null;
  const showErrors =
    !isParseResult(result) && !result.ok ? result.errors : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold text-text-primary">
          Quick Profit Calculator
        </h1>
        <p className="text-body text-text-secondary max-w-2xl">
          Amortize sample/inspection into unit cost, convert between USD and CAD
          when needed, then apply markup on the per-unit amount in the quote
          currency. Your inputs and rate are saved in this browser (local
          storage).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <form
          className="card space-y-4 max-w-2xl"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Quantity (for amortization)</label>
              <input
                type="number"
                min={0}
                step="any"
                className="input placeholder:text-slate-400"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                placeholder="400"
              />
            </div>
            <div>
              <label className="label">Unit cost ({costCurrency})</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input placeholder:text-slate-400"
                value={unitCostStr}
                onChange={(e) => setUnitCostStr(e.target.value)}
                placeholder="1.00"
              />
            </div>
          </div>

          <div>
            <label className="label">
              Sample / inspection total ({costCurrency})
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input placeholder:text-slate-400"
              value={sampleStr}
              onChange={(e) => setSampleStr(e.target.value)}
              placeholder="400.00"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cost currency</label>
              <select
                className="input h-10"
                value={costCurrency}
                onChange={(e) =>
                  setCostCurrency(e.target.value === "CAD" ? "CAD" : "USD")
                }
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div>
              <label className="label">Quote currency</label>
              <select
                className="input h-10"
                value={quoteCurrency}
                onChange={(e) =>
                  setQuoteCurrency(e.target.value === "CAD" ? "CAD" : "USD")
                }
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          {fxNeeded && (
            <div>
              <label className="label">1 USD = [ ] CAD</label>
              <input
                type="number"
                min={0}
                step="0.0001"
                className="input placeholder:text-slate-400"
                value={usdCadRateStr}
                onChange={(e) => setUsdCadRateStr(e.target.value)}
                placeholder={String(DEFAULT_USD_CAD_RATE)}
              />
              <p className="mt-1 text-caption text-text-secondary">
                Editable rate; defaults to {DEFAULT_USD_CAD_RATE} for typical
                USD→CAD work.
              </p>
            </div>
          )}

          <div>
            <label className="label">Markup (%)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              className="input placeholder:text-slate-400"
              value={markupStr}
              onChange={(e) => setMarkupStr(e.target.value)}
              placeholder="20"
            />
          </div>
        </form>

        <div className="card space-y-4 h-fit">
          <h2 className="text-lg font-semibold text-text-primary">Result</h2>

          {isParseResult(result) && (
            <p className="text-body text-text-secondary">
              Enter valid numbers in all fields
              {fxNeeded ? " (including the exchange rate)" : ""} to see the
              breakdown.
            </p>
          )}

          {showErrors && (
            <ul className="list-inside list-disc space-y-1 text-body text-status-error">
              {showErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}

          {showBreakdown && (
            <>
              <dl className="space-y-3 text-body">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-text-secondary">
                    Sample/inspection per unit
                  </dt>
                  <dd className="font-medium text-text-primary tabular-nums">
                    {formatMoney(
                      showBreakdown.samplePerUnitCostCurrency,
                      costCurrency,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-text-secondary">
                    Combined per unit (before FX)
                  </dt>
                  <dd className="font-medium text-text-primary tabular-nums">
                    {formatMoney(
                      showBreakdown.combinedPerUnitCostCurrency,
                      costCurrency,
                    )}
                  </dd>
                </div>
                {showBreakdown.fxApplied && (
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-text-secondary">
                      Combined per unit (after FX)
                    </dt>
                    <dd className="font-medium text-text-primary tabular-nums">
                      {formatMoney(
                        showBreakdown.combinedPerUnitQuoteCurrency,
                        quoteCurrency,
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 pt-1">
                  <dt className="font-semibold text-text-primary">
                    Sell price per unit
                  </dt>
                  <dd className="text-lg font-semibold text-text-primary tabular-nums">
                    {formatMoney(
                      showBreakdown.sellPricePerUnitQuoteCurrency,
                      quoteCurrency,
                    )}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm h-9 px-3"
                  onClick={() => void copyPrice()}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy sell price
                </button>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm h-9 px-3"
                  onClick={() => void copySummary()}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy breakdown
                </button>
              </div>
              {copied && (
                <p className="text-caption text-text-secondary" role="status">
                  Copied {copied === "price" ? "sell price" : "breakdown"} to
                  clipboard.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

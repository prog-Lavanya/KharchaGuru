import React from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const pct = (n) => `${Number(n || 0)}%`;

const allocationOrder = [
  "Equity MF",
  "Debt Funds",
  "Gold",
  "FD",
  "Liquid Funds",
  "Cash Reserve",
  "equity",
  "debt",
  "gold",
  "fd",
  "liquid",
  "cash",
];

const productLabel = {
  "Equity MF": "Equity Mutual Fund (SIP)",
  "Debt Funds": "Debt Mutual Fund",
  Gold: "Gold",
  FD: "Fixed Deposit",
  "Liquid Funds": "Liquid Fund",
  "Cash Reserve": "Cash Reserve",
  debt: "Debt Mutual Fund",
  equity: "Equity Mutual Fund (SIP)",
  gold: "Gold",
  fd: "Fixed Deposit",
  liquid: "Liquid Fund",
  cash: "Cash Reserve",
};

const getProductLabel = (key) => productLabel[key] || key;

export default function ResultsModal({ rec, onClose, onAdjust }) {
  const allocationEntries = Object.entries(rec?.allocation || {}).sort((a, b) => {
    const ai = allocationOrder.indexOf(a[0]);
    const bi = allocationOrder.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const monthlyEntries = Object.entries(rec?.monthlyPlan || {});
  const growth = rec?.projectedGrowth || {};

  const investableAmount =
    rec?.investableAmount ||
    rec?.recommendation?.investableAmount ||
    monthlyEntries.reduce((sum, [, value]) => sum + Number(value || 0), 0);

  const primary = allocationEntries[0];
  const secondary = allocationEntries[1];

  const hasGrowth =
    growth &&
    (growth.invested_amount || growth.projected_value || growth.gains || growth.rate);

  const content = (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm">
      <div className="flex h-full items-center justify-center p-4">
        <div className="flex h-full max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#1a2d42] bg-[#101a30] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <div className="border-b border-[#1a2d42] px-7 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-teal-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Suggested plan
                </div>

                <h2 className="text-[2.1rem] font-semibold tracking-tight text-white">
                  Your investment plan
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  A clean allocation based on your amount, time horizon, and risk comfort.
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg border border-[#22334d] bg-[#0b1425] p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            <div className="mb-6 rounded-[16px] border border-teal-500/12 bg-[linear-gradient(90deg,rgba(56,213,207,0.10),rgba(79,198,242,0.06))] px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
                    Monthly investable amount
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Based on the amount submitted in the advisor form.
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <div className="text-4xl font-semibold tracking-tight text-teal-300 sm:text-[3rem]">
                    ₹{fmt(investableAmount)}
                    <span className="ml-1 text-xl font-medium text-slate-400">/mo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <SectionHeader
                  icon={Target}
                  title="Allocation plan"
                  subtitle="Recommended distribution across assets."
                />

                <div className="rounded-[16px] border border-[#22334d] bg-[#0b1425] p-5">
                  <div className="space-y-3">
                    {allocationEntries.map(([key, value], index) => (
                      <div
                        key={key}
                        className={
                          index === 0
                            ? "rounded-xl border border-teal-500/18 bg-[#101a30] p-4"
                            : "rounded-xl border border-[#22334d] bg-[#101a30] p-4"
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {getProductLabel(key)}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              Share of total allocation
                            </p>
                          </div>

                          <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-200">
                            {pct(value)}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#152238]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#38d5cf] to-[#4fc6f2]"
                            style={{ width: `${Math.min(Number(value || 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {monthlyEntries.length > 0 && (
                  <div className="rounded-[16px] border border-[#22334d] bg-[#0b1425] p-5">
                    <SectionHeader
                      icon={TrendingUp}
                      title="Suggested monthly split"
                      subtitle="Approximate contribution by asset."
                    />

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {monthlyEntries.map(([key, value], index) => (
                        <div
                          key={key}
                          className={
                            index % 2 === 0
                              ? "rounded-xl border border-sky-400/10 bg-[#101a30] p-4"
                              : "rounded-xl border border-teal-400/10 bg-[#101a30] p-4"
                          }
                        >
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
                            {getProductLabel(key)}
                          </p>
                          <p className="mt-2 text-base font-medium text-white">
                            ₹{fmt(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasGrowth && (
                  <div className="rounded-[16px] border border-[#22334d] bg-[#0b1425] p-5">
                    <SectionHeader
                      icon={TrendingUp}
                      title="Projected growth"
                      subtitle={`Estimated outcome over ${growth?.horizon_years || 0} year${Number(growth?.horizon_years || 0) === 1 ? "" : "s"}.`}
                    />

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <GrowthCard
                        label="Total invested"
                        value={`₹${fmt(growth?.invested_amount)}`}
                      />
                      <GrowthCard
                        label="Projected value"
                        value={`₹${fmt(growth?.projected_value)}`}
                        highlight
                      />
                      <GrowthCard
                        label="Estimated gains"
                        value={`₹${fmt(growth?.gains)}`}
                      />
                      <GrowthCard
                        label="Expected return"
                        value={growth?.rate || "—"}
                      />
                    </div>

                    <p className="mt-4 text-xs font-medium leading-5 text-slate-500">
                      These figures are estimates based on the selected mode and duration. Actual returns are not guaranteed.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-[16px] border border-[#22334d] bg-[#0b1425] p-5">
                  <SectionHeader
                    icon={ShieldCheck}
                    title="Recommendation summary"
                    subtitle="Best fit based on current inputs."
                  />

                  <div className="mt-4 space-y-3">
                    {primary && (
                      <RecommendCard
                        label="Best fit"
                        title={getProductLabel(primary[0])}
                        subtitle="Highest allocation in this plan"
                        value={pct(primary[1])}
                        highlight
                      />
                    )}

                    {secondary && (
                      <RecommendCard
                        label="Secondary"
                        title={getProductLabel(secondary[0])}
                        subtitle="Strong supporting allocation"
                        value={pct(secondary[1])}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-[16px] border border-[#22334d] bg-[#0b1425] p-5">
                  <SectionHeader
                    icon={Sparkles}
                    title="AI explanation"
                    subtitle="Why this allocation makes sense."
                  />

                  <div className="mt-4 rounded-xl border border-sky-400/10 bg-[#101a30] p-4">
                    <p className="text-sm font-medium leading-6 text-slate-400">
                      {rec?.aiExplanation ||
                        "This plan balances growth potential and stability using the amount, horizon, and risk comfort you selected."}
                    </p>
                  </div>
                </div>

                {Array.isArray(rec?.nextSteps) && rec.nextSteps.length > 0 && (
                  <div className="rounded-[16px] border border-[#22334d] bg-[#0b1425] p-5">
                    <SectionHeader
                      icon={CheckCircle2}
                      title="Next steps"
                      subtitle="Simple actions to take from here."
                    />

                    <div className="mt-4 space-y-3">
                      {rec.nextSteps.map((step, index) => (
                        <div
                          key={`${step}-${index}`}
                          className="flex gap-3 rounded-xl border border-[#22334d] bg-[#101a30] p-4"
                        >
                          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/10 text-xs font-medium text-teal-300">
                            {index + 1}
                          </div>
                          <p className="text-sm font-medium leading-6 text-slate-400">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a2d42] bg-[#101a30] px-7 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                onClick={onAdjust}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#22334d] bg-[#0b1425] px-4 py-3 text-sm font-medium text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Adjust inputs
              </button>

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#38d5cf] to-[#4fc6f2] px-5 py-3 text-sm font-semibold text-[#0b1627]"
              >
                Close plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-teal-500/10 p-2.5 text-teal-300">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function RecommendCard({ label, title, subtitle, value, highlight = false }) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-teal-500/18 bg-teal-500/8 p-4"
          : "rounded-xl border border-[#22334d] bg-[#101a30] p-4"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="rounded-full border border-[#22334d] bg-[#0f1a2d] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
          {label}
        </span>
        <span className="text-sm font-medium text-teal-300">{value}</span>
      </div>

      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
    </div>
  );
}

function GrowthCard({ label, value, highlight = false }) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-teal-500/18 bg-teal-500/8 p-4"
          : "rounded-xl border border-[#22334d] bg-[#101a30] p-4"
      }
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
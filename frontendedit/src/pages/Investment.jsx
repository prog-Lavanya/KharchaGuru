import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Coffee,
  GraduationCap,
  Home,
  Lightbulb,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Umbrella,
  Wallet,
  X,
} from "lucide-react";
import ResultsModal from "../components/Investment/ResultsModal";

const BASE_URL = "http://localhost:8000";

const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem("token");
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
};

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const cx = (...parts) => parts.filter(Boolean).join(" ");

const FIXED_KEYWORDS = ["rent", "emi", "loan", "insurance", "tax"];
const FLEXIBLE_KEYWORDS = [
  "grocer",
  "grocery",
  "fuel",
  "electricity",
  "bill",
  "medical",
  "food",
  "transport",
  "repair",
  "maintenance",
  "health",
];

const GROUP_META = {
  fixed: {
    title: "Fixed Spending",
    subtitle: "Usually essential and less flexible in the short term.",
    badge: "Best tracked closely",
    icon: ShieldCheck,
    border: "border-emerald-500/15",
    glow: "from-emerald-500/10 via-emerald-500/3 to-transparent",
    chip: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    iconWrap: "bg-emerald-500/12 text-emerald-300",
    metricBorder: "border-emerald-500/12",
    accentText: "text-emerald-300",
  },
  flexible: {
    title: "Flexible Spending",
    subtitle: "Can usually be reduced with small habit changes.",
    badge: "Can be optimized",
    icon: Wallet,
    border: "border-sky-500/15",
    glow: "from-sky-500/10 via-sky-500/3 to-transparent",
    chip: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    iconWrap: "bg-sky-500/12 text-sky-300",
    metricBorder: "border-sky-500/12",
    accentText: "text-sky-300",
  },
  discretionary: {
    title: "Discretionary Spending",
    subtitle: "Lifestyle spends where trimming a little can create room to invest.",
    badge: "Good place to free up savings",
    icon: Wallet,
    border: "border-rose-500/15",
    glow: "from-rose-500/10 via-rose-500/3 to-transparent",
    chip: "border-rose-400/20 bg-rose-500/10 text-rose-200",
    iconWrap: "bg-rose-500/12 text-rose-300",
    metricBorder: "border-rose-500/12",
    accentText: "text-rose-300",
  },
};

function classifyCategory(categoryName = "") {
  const value = categoryName.toLowerCase().trim();

  if (FIXED_KEYWORDS.some((keyword) => value.includes(keyword))) {
    return "fixed";
  }

  if (FLEXIBLE_KEYWORDS.some((keyword) => value.includes(keyword))) {
    return "flexible";
  }

  return "discretionary";
}

function getCategoryIcon(category = "", bucket = "discretionary") {
  const name = category.toLowerCase();

  if (name.includes("food") || name.includes("grocery")) return Coffee;
  if (name.includes("fuel") || name.includes("transport")) return TrendingUp;
  if (name.includes("subscription") || name.includes("entertainment")) return Sparkles;
  if (name.includes("shopping") || name.includes("clothing")) return Wallet;
  if (name.includes("goal")) return Target;
  return GROUP_META[bucket]?.icon || Wallet;
}

function getTip(category, bucket) {
  const name = (category || "").toLowerCase();

  if (bucket === "fixed") {
    if (name.includes("rent")) return "Reviewing rent or renewal terms early can help avoid a sudden cost jump.";
    if (name.includes("loan") || name.includes("emi")) return "A quick EMI review may help you spot refinancing or prepayment opportunities.";
    if (name.includes("insurance")) return "It may be worth comparing plans before renewal to avoid overpaying for similar coverage.";
    return "This is likely an essential cost, so monitoring it regularly is more useful than trying to cut it aggressively.";
  }

  if (bucket === "flexible") {
    if (name.includes("food")) return "Planning a few meals ahead each week can reduce this spend without feeling restrictive.";
    if (name.includes("fuel") || name.includes("transport")) return "Combining trips or using shared travel occasionally could lower this category naturally.";
    if (name.includes("medical") || name.includes("health")) return "Planned purchases and refill reminders can help avoid repeat or urgent spend.";
    if (name.includes("bill") || name.includes("electricity")) return "Usage checks and simple reminders can make this category easier to control.";
    return "Small routine changes here could improve your monthly cash flow without a major lifestyle change.";
  }

  if (name.includes("shopping")) return "A short pause before checkout can help separate impulse buys from real needs.";
  if (name.includes("entertainment")) return "Cutting frequency slightly often saves enough without making life feel too restricted.";
  if (name.includes("subscription")) return "Reviewing active subscriptions once a month can free up quick savings.";
  return "This looks like a good category to trim a little if you want to create room for saving or investing.";
}

function buildSpendingInsight(item, bucket) {
  const category = item.category || "This category";
  const monthly = fmt(item.current_monthly);
  const saving = fmt(item.potential_monthly_saving);
  const yearly = fmt(item.yearly_impact);

  if (bucket === "fixed") {
    return `You are currently spending about ₹${monthly}/month on ${category.toLowerCase()}. This looks like a core or essential category, so the focus should be on keeping it efficient and reviewing it regularly. If there is room to optimize it, you may be able to reduce it by around ₹${saving}/month.`;
  }

  if (bucket === "flexible") {
    return `You are spending about ₹${monthly}/month on ${category.toLowerCase()}. This category looks moderately adjustable, which means a few small changes could realistically save around ₹${saving}/month, or roughly ₹${yearly} over a year.`;
  }

  return `You are spending about ₹${monthly}/month on ${category.toLowerCase()}. Since this looks more optional or lifestyle-driven, trimming it slightly could free up around ₹${saving}/month without affecting your essentials.`;
}

function buildGoalInsight(goal) {
  return `You still need ₹${fmt(
    goal.remaining
  )} for this goal. At the current timeline, setting aside about ₹${fmt(
    goal.monthly_required
  )}/month would keep you on track more comfortably.`;
}

function buildTips({ avgExpense, spendingInsights, goalInsights, state }) {
  const tips = [];

  if (state === "new_user") {
    tips.push({
      title: "Build your data first",
      body: "Track expenses consistently for a few weeks. Better data leads to more specific and more reliable recommendations.",
      icon: BookOpen,
    });
  }

  if (avgExpense > 0) {
    tips.push({
      title: "Use your expense baseline",
      body: `Your recent average monthly expense is around ₹${fmt(
        avgExpense
      )}. This gives you a much better starting point for deciding how much you can invest comfortably.`,
      icon: TrendingUp,
    });
  }

  if (spendingInsights.some((item) => item.bucket === "discretionary")) {
    tips.push({
      title: "Start with optional spending",
      body: "If you want to create savings without pressure, discretionary categories are usually the easiest place to begin.",
      icon: Sparkles,
    });
  }

  if (spendingInsights.some((item) => item.bucket === "flexible")) {
    tips.push({
      title: "Look for habit-based savings",
      body: "Flexible categories usually improve through better planning, not strict cutting. That makes the changes easier to maintain.",
      icon: Lightbulb,
    });
  }

  if (goalInsights.length > 0) {
    tips.push({
      title: "Connect spending to your goals",
      body: "It is easier to stay consistent when each saving decision clearly supports a specific financial goal.",
      icon: Target,
    });
  }

  return tips.slice(0, 3);
}

export default function InvestmentRecommendations() {
  const [pageState, setPageState] = useState("loading");
  const [userProfile, setUserProfile] = useState(null);
  const [avgExpense, setAvgExpense] = useState(0);
  const [spendingInsights, setSpendingInsights] = useState([]);
  const [goalInsights, setGoalInsights] = useState([]);
  const [tips, setTips] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [step, setStep] = useState(1);
  const [rec, setRec] = useState(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState(null);
  const [form, setForm] = useState({
    investmentAmount: "",
    frequency: "monthly",
    duration: "",
    riskTolerance: "",
    purpose: "",
  });
  useEffect(() => {
    fetchState();
  }, []);

  useEffect(() => {
    if (!showModal && !showResults) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showModal, showResults]);

  const fetchState = async () => {
    try {
      const res = await apiFetch("/investments/state");
      if (!res.ok) {
        setPageState("error");
        return;
      }

      const data = await res.json();
      const state = data.state?.state || "new_user";
      const api = data.insights || {};

      const spending = (api.spending || []).map((item) => {
        const bucket = classifyCategory(item.category);
        return {
          ...item,
          bucket,
          tip: getTip(item.category, bucket),
          body: buildSpendingInsight(item, bucket),
        };
      });

      const goals = (api.goals || []).map((goal) => ({
        ...goal,
        body: buildGoalInsight(goal),
      }));

      setPageState(state);
      setUserProfile(data.user_profile || null);
      setAvgExpense(api.avg_monthly_expense || 0);
      setSpendingInsights(spending);
      setGoalInsights(goals);
      setTips(
        buildTips({
          avgExpense: api.avg_monthly_expense || 0,
          spendingInsights: spending,
          goalInsights: goals,
          state,
        })
      );
    } catch (e) {
      console.error("fetchState", e);
      setPageState("error");
    }
  };

  const groupedSpending = useMemo(
    () => ({
      fixed: spendingInsights.filter((item) => item.bucket === "fixed"),
      flexible: spendingInsights.filter((item) => item.bucket === "flexible"),
      discretionary: spendingInsights.filter((item) => item.bucket === "discretionary"),
    }),
    [spendingInsights]
  );

  const personalizedCount = spendingInsights.length + goalInsights.length;

  const openModal = () => {
    setWizardError(null);
    setStep(1);
    setShowModal(true);
  };

  const setF = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    if (step === 1) return Number(form.investmentAmount) >= 500;
    if (step === 2) return !!form.duration;
    if (step === 3) return !!form.riskTolerance;
    return true;
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    await submitRec();
  };

  const submitRec = async () => {
    setWizardLoading(true);
    setWizardError(null);

    try {
      const res = await apiFetch("/investments/recommendations", {
        method: "POST",
        body: JSON.stringify({
          investmentAmount: parseInt(form.investmentAmount, 10),
          frequency: form.frequency,
          investmentDuration: form.duration,
          riskTolerance: form.riskTolerance,
          investmentGoal: form.purpose || "wealth",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data?.detail;
        setWizardError(
          detail?.errors
            ? detail.errors.join(" | ")
            : typeof detail === "string"
            ? detail
            : "Something went wrong. Please try again."
        );
        return;
      }

      const normalized = {
        ...data,
        allocation:
          typeof data?.allocation === "object" && data?.allocation ? data.allocation : {},
        monthlyPlan:
          typeof data?.monthlyPlan === "object" && data?.monthlyPlan ? data.monthlyPlan : {},
        whereToInvest:
          typeof data?.whereToInvest === "object" && data?.whereToInvest
            ? data.whereToInvest
            : {},
        recommendation:
          typeof data?.recommendation === "object" && data?.recommendation
            ? data.recommendation
            : {},
        projectedGrowth:
          typeof data?.projectedGrowth === "object" && data?.projectedGrowth
            ? data.projectedGrowth
            : {},
        aiExplanation:
          typeof data?.aiExplanation === "string" ? data.aiExplanation : "",
        nextSteps: Array.isArray(data?.nextSteps) ? data.nextSteps : [],
      };

      if (Object.keys(normalized.allocation).length === 0) {
        setWizardError("No recommendation came back from the server. Please try again.");
        return;
      }

      setRec(normalized);
      setShowModal(false);
      setShowResults(true);
    } catch (e) {
      console.error("submitRec", e);
      setWizardError("Network error. Make sure your backend is running.");
    } finally {
      setWizardLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b1a] text-gray-100">
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-8 rounded-[24px] border border-[#1a2d42] bg-[#101a30] px-7 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              {/* <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-teal-300">
                <Sparkles className="h-3.5 w-3" />
                Investment Advisor
              </div> */}

              <h1 className="text-[2.4rem] font-semibold tracking-tight text-white">
                Investment Advisor
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
                Get a clearer view of your spending, your goals, and where you may have room
                to invest more confidently.
              </p>
            </div>

            <button
              onClick={openModal}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38d5cf] to-[#4fc6f2] px-6 text-sm font-semibold text-[#0b1627] transition hover:brightness-105"
            >
              <Sparkles className="h-4 w-4" />
              Ask for advice
            </button>
          </div>
        </div>

        {pageState === "loading" && (
          <div className="rounded-2xl border border-[#1a2d42] bg-[#101a30] p-10 text-center">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
            <p className="text-sm font-medium text-slate-400">
              Analyzing your investment profile...
            </p>
          </div>
        )}

        {pageState === "error" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-9 w-9 text-red-300" />
            <p className="mb-4 text-sm font-medium text-slate-200">
              Could not load investment insights. Make sure you are logged in.
            </p>
            <button
              onClick={fetchState}
              className="rounded-xl bg-red-400/15 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-400/25"
            >
              Retry
            </button>
          </div>
        )}

        {pageState !== "loading" && pageState !== "error" && (
          <>
            {userProfile && (
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <StatCard label="Expenses tracked" value={userProfile.total_expenses} />
                <StatCard label="Active goals" value={userProfile.active_goals} />
                <StatCard
                  label="Avg monthly expense"
                  value={avgExpense > 0 ? `₹${fmt(avgExpense)}` : "—"}
                />
              </div>
            )}

            <div className="mb-6 grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-[24px] border border-[#1a2d42] bg-[#101a30] p-6">
                <h2 className="text-[1.45rem] font-semibold text-white">
                  {pageState === "new_user" ? "Starter insights" : "Personalized insights"}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                  {pageState === "new_user"
                    ? "Your data is still building. These insights focus on simple, practical next steps."
                    : `${personalizedCount} insight${personalizedCount === 1 ? "" : "s"} generated from your spending and goals.`}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#1a2d42] bg-[#101a30] p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                  What to focus on
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-300">
                  This page is meant to help you spot essential costs, adjustable spending,
                  and optional areas where even a small reduction could improve your monthly room.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedSpending).map(([bucket, items]) =>
                items.length ? (
                  <InsightGroup key={bucket} bucket={bucket} items={items} />
                ) : null
              )}

              {goalInsights.length > 0 && (
                <section className="rounded-[24px] border border-[#1a2d42] bg-[#101a30] p-6">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-violet-400" />
                        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-200">
                          Goal insights
                        </p>
                      </div>
                      <h3 className="text-xl font-semibold text-white">Your active goals</h3>
                      <p className="mt-1 text-sm font-medium text-slate-400">
                        A clear monthly plan becomes easier when your saving decisions connect to a real goal.
                      </p>
                    </div>

                    <span className="inline-flex rounded-full border border-violet-400/18 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
                      Monthly discipline matters
                    </span>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    {goalInsights.map((goal, index) => (
                      <GoalCard key={`${goal.goal_name}-${index}`} goal={goal} />
                    ))}
                  </div>
                </section>
              )}

              {tips.length > 0 && (
                <section className="rounded-[24px] border border-[#1a2d42] bg-[#101a30] p-6">
                  <div className="mb-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-teal-400" />
                      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-200">
                        Helpful tips
                      </p>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Suggestions based on your profile</h3>
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      Simple guidance based on the spending and goal signals available right now.
                    </p>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-3">
                    {tips.map((tip, index) => (
                      <TipCard key={`${tip.title}-${index}`} tip={tip} />
                    ))}
                  </div>
                </section>
              )}

              {!spendingInsights.length && !goalInsights.length && (
                <section className="rounded-[24px] border border-[#1a2d42] bg-[#101a30] p-8 text-center">
                  <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-500" />
                  <h3 className="text-lg font-semibold text-white">Not enough insight data yet</h3>
                  <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
                    Once more expenses and goals are available, this section will show more personal
                    spending patterns and clearer opportunities to improve your monthly plan.
                  </p>
                </section>
              )}
            </div>
          </>
        )}

        {showResults && rec && (
          <ResultsModal
            rec={rec}
            onClose={() => setShowResults(false)}
            onAdjust={() => {
              setShowResults(false);
              openModal();
            }}
          />
        )}

        {showModal && (
          <AdviceModal
            step={step}
            form={form}
            setF={setF}
            canProceed={canProceed}
            onNext={handleNext}
            onBack={() => setStep((s) => s - 1)}
            onClose={() => setShowModal(false)}
            loading={wizardLoading}
            error={wizardError}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[20px] border border-[#1a2d42] bg-[#101a30] p-6">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function InsightGroup({ bucket, items }) {
  const meta = GROUP_META[bucket];
  const Icon = meta.icon;

  return (
    <section className={cx("relative overflow-hidden rounded-[24px] border bg-[#101a30] p-6", meta.border)}>
      <div className={cx("pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r opacity-90", meta.glow)} />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            {/* <div className="mb-3 flex items-center gap-2">
  <span className={cx("h-2 w-2 rounded-full", meta.dot)} />
</div> */}

            <h3 className="flex items-center gap-3 text-xl font-semibold text-white">
              <span className={cx("rounded-xl p-2.5", meta.iconWrap)}>
                <Icon className="h-5 w-5" />
              </span>
              {meta.title}
            </h3>

            <p className="mt-2 text-sm font-medium text-slate-400">{meta.subtitle}</p>
          </div>

          <span className={cx("inline-flex rounded-full border px-3 py-1 text-[11px] font-medium", meta.chip)}>
            {meta.badge}
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {items.map((item, index) => (
            <InsightCard key={`${item.category}-${index}`} item={item} meta={meta} />
          ))}
        </div>
      </div>
    </section>
  );
}

function InsightCard({ item, meta }) {
  const Icon = getCategoryIcon(item.category, item.bucket);

  return (
    <div className="rounded-[22px] border border-[#23344f] bg-[#0b1425] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className={cx("rounded-xl p-2.5", meta.iconWrap)}>
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div>
          <h4 className="text-base font-semibold text-white">
            {item.category || "Spending insight"}
          </h4>
        </div>
      </div>

      <p className="mb-4 text-sm font-medium leading-6 text-slate-300">
        {item.body}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricBox
          label="Monthly spend"
          value={`₹${fmt(item.current_monthly)}`}
          border={meta.metricBorder}
        />
        <MetricBox
          label="Possible saving"
          value={`₹${fmt(item.potential_monthly_saving)}/mo`}
          border={meta.metricBorder}
          accent={meta.accentText}
        />
        <MetricBox
          label="Yearly impact"
          value={`₹${fmt(item.yearly_impact)}`}
          border={meta.metricBorder}
        />
        <MetricBox
          label="Tip"
          value={item.tip}
          border={meta.metricBorder}
        />
      </div>
    </div>
  );
}

function GoalCard({ goal }) {
  return (
    <div className="rounded-[22px] border border-violet-500/15 bg-[#0b1425] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-violet-500/12 p-2.5 text-violet-300">
          <Target className="h-4.5 w-4.5" />
        </div>

        <div>
          <h4 className="text-base font-semibold text-white">{goal.goal_name || "Goal insight"}</h4>
          <span className="mt-2 inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-violet-200">
            Goal
          </span>
        </div>
      </div>

      <p className="mb-4 text-sm font-medium leading-6 text-slate-300">{goal.body}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricBox label="Target" value={`₹${fmt(goal.target_amount)}`} border="border-violet-500/12" />
        <MetricBox label="Remaining" value={`₹${fmt(goal.remaining)}`} border="border-violet-500/12" />
        <MetricBox
          label="Monthly needed"
          value={`₹${fmt(goal.monthly_required)}`}
          border="border-violet-500/12"
          accent="text-violet-200"
        />
        <MetricBox label="Months left" value={`${fmt(goal.months_left)}`} border="border-violet-500/12" />
      </div>
    </div>
  );
}

function TipCard({ tip }) {
  const Icon = tip.icon || Lightbulb;

  return (
    <div className="rounded-[22px] border border-teal-500/15 bg-[#0b1425] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-teal-500/12 p-2.5 text-teal-300">
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div>
          <h4 className="text-base font-semibold text-white">{tip.title}</h4>
          <span className="mt-2 inline-flex rounded-full border border-teal-400/20 bg-teal-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-teal-200">
            Tip
          </span>
        </div>
      </div>

      <p className="text-sm font-medium leading-6 text-slate-300">{tip.body}</p>
    </div>
  );
}

function MetricBox({ label, value, border, accent }) {
  return (
    <div className={cx("rounded-xl border bg-[#09111f] p-4", border)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>
      <p className={cx("mt-2 text-sm font-medium leading-5 text-slate-100", accent)}>
        {value}
      </p>
    </div>
  );
}

function AdviceModal({
  step,
  form,
  setF,
  canProceed,
  onNext,
  onBack,
  onClose,
  loading,
  error,
}) {
  const durations = [
    { v: "<1", label: "< 1 year", desc: "Very short term. Safer allocation is usually better." },
    { v: "1-3", label: "1–3 years", desc: "Short to medium term with moderate flexibility." },
    { v: "3-7", label: "3–7 years", desc: "Balanced horizon for growth plus stability." },
    { v: "7+", label: "7+ years", desc: "Long-term horizon with room for higher growth." },
  ];

  const risks = [
    { v: "low", label: "Safety first", desc: "Focus on stability with lower volatility." },
    { v: "medium", label: "Balanced", desc: "Mix growth and stability." },
    { v: "high", label: "Growth-oriented", desc: "Higher equity exposure for long-term growth." },
  ];

  const purposes = [
    { v: "wealth", label: "General wealth", Icon: PiggyBank },
    { v: "house", label: "House", Icon: Home },
    { v: "education", label: "Education", Icon: GraduationCap },
    { v: "retirement", label: "Retirement", Icon: Umbrella },
  ];

  const content = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-[20px] border border-[#1a2d42] bg-[#101a30] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between border-b border-[#1a2d42] px-6 py-5">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-teal-300">
                Step {step} of 4
              </p>
              <h2 className="text-lg font-semibold text-white">Get investment advice</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                A few quick inputs for a personalized plan.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border border-[#1a2d42] bg-[#0b1425] p-2 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="h-1 bg-[#0b1425]">
            <div
              className="h-1 bg-gradient-to-r from-[#38d5cf] to-[#4fc6f2]"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <div className="space-y-4 px-6 py-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#22334d] bg-[#0b1425] p-5">
                  <label className="mb-3 block text-sm font-medium text-white">
                    How much do you want to invest?
                    <span className="ml-2 text-xs font-medium text-slate-500">minimum ₹500</span>
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="500"
                      value={form.investmentAmount}
                      onChange={(e) => setF("investmentAmount", e.target.value)}
                      placeholder="5000"
                      className="h-12 w-full rounded-xl border border-[#22334d] bg-[#07101f] pl-10 pr-4 text-base font-medium text-white outline-none placeholder:text-slate-600 focus:border-teal-400"
                    />
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    This amount will be used to calculate your suggested allocation.
                  </p>
                </div>

                <div className="rounded-xl border border-[#22334d] bg-[#0b1425] p-5">
                  <label className="mb-3 block text-sm font-medium text-white">
                    Contribution type
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: "monthly", label: "Monthly", desc: "Regular SIP-style contribution." },
                      { v: "onetime", label: "One-time", desc: "Single lump-sum allocation." },
                    ].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setF("frequency", o.v)}
                        className={cx(
                          "rounded-xl border px-4 py-4 text-left",
                          form.frequency === o.v
                            ? "border-teal-400 bg-teal-500/10"
                            : "border-[#22334d] bg-[#07101f]"
                        )}
                      >
                        <p className={cx("text-sm font-medium", form.frequency === o.v ? "text-teal-300" : "text-white")}>
                          {o.label}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <label className="mb-4 block text-sm font-medium text-white">
                  When will you need this money?
                </label>

                <div className="space-y-2.5">
                  {durations.map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setF("duration", o.v)}
                      className={cx(
                        "w-full rounded-xl border px-4 py-4 text-left",
                        form.duration === o.v
                          ? "border-teal-400 bg-teal-500/10"
                          : "border-[#22334d] bg-[#0b1425]"
                      )}
                    >
                      <p className={cx("text-sm font-medium", form.duration === o.v ? "text-teal-300" : "text-white")}>
                        {o.label}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <label className="mb-4 block text-sm font-medium text-white">
                  How comfortable are you with ups and downs?
                </label>

                <div className="space-y-2.5">
                  {risks.map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setF("riskTolerance", o.v)}
                      className={cx(
                        "w-full rounded-xl border px-4 py-4 text-left",
                        form.riskTolerance === o.v
                          ? "border-teal-400 bg-teal-500/10"
                          : "border-[#22334d] bg-[#0b1425]"
                      )}
                    >
                      <p className={cx("text-sm font-medium", form.riskTolerance === o.v ? "text-teal-300" : "text-white")}>
                        {o.label}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <label className="mb-4 block text-sm font-medium text-white">
                  What is this mainly for?
                  <span className="ml-2 font-medium text-slate-500">(optional)</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {purposes.map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setF("purpose", o.v)}
                      className={cx(
                        "flex flex-col items-center gap-3 rounded-xl border px-4 py-5",
                        form.purpose === o.v
                          ? "border-teal-400 bg-teal-500/10"
                          : "border-[#22334d] bg-[#0b1425]"
                      )}
                    >
                      <o.Icon className={cx("h-6 w-6", form.purpose === o.v ? "text-teal-300" : "text-slate-500")} />
                      <span className={cx("text-sm font-medium", form.purpose === o.v ? "text-teal-200" : "text-white")}>
                        {o.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
                <p className="text-xs font-medium text-red-100">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#1a2d42] px-6 py-5">
            {step > 1 && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 rounded-xl border border-[#22334d] bg-[#0b1425] px-4 py-3 text-sm font-medium text-slate-300"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              disabled={loading || !canProceed()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38d5cf] to-[#4fc6f2] px-4 py-3 text-sm font-semibold text-[#0b1627] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0b1627]/30 border-t-[#0b1627]" />
                  Processing...
                </>
              ) : (
                <>
                  {step === 4 ? "Get advice" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
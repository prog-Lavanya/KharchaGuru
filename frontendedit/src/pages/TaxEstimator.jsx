import { Briefcase, Calculator, ChevronRight, IndianRupee, PieChart, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function TaxEstimator() {
  const [income, setIncome] = useState("");
  const [isSalaried, setIsSalaried] = useState(true);
  const [regime, setRegime] = useState("new");
  const [eightyC, setEightyC] = useState("");
  const [eightyD, setEightyD] = useState("");
  const [hra, setHra] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateTax = () => {
  const grossIncome = Number(income);

  //  VALIDATION
  if (!income || isNaN(grossIncome) || grossIncome <= 0) {
    setError("Enter a valid amount");
    setResult(null);
    return;
  }

  setError("");
  setIsCalculating(true);

  setTimeout(() => {
    const ded80c = Math.min(Number(eightyC) || 0, 150000);
    const ded80d = Number(eightyD) || 0;
    const dedHra = Number(hra) || 0;

    const stdDeductionNew = isSalaried ? 75000 : 0;
    const stdDeductionOld = isSalaried ? 50000 : 0;

    let totalDeductions = 0;
    let taxableIncome = 0;
    let tax = 0;

    if (regime === "new") {
      totalDeductions = stdDeductionNew;
      taxableIncome = Math.max(0, grossIncome - totalDeductions);

      let tempIncome = taxableIncome;
      if (tempIncome > 2400000) { tax += (tempIncome - 2400000) * 0.30; tempIncome = 2400000; }
      if (tempIncome > 2000000) { tax += (tempIncome - 2000000) * 0.25; tempIncome = 2000000; }
      if (tempIncome > 1600000) { tax += (tempIncome - 1600000) * 0.20; tempIncome = 1600000; }
      if (tempIncome > 1200000) { tax += (tempIncome - 1200000) * 0.15; tempIncome = 1200000; }
      if (tempIncome > 800000) { tax += (tempIncome - 800000) * 0.10; tempIncome = 800000; }
      if (tempIncome > 400000) { tax += (tempIncome - 400000) * 0.05; }

      if (taxableIncome <= 1200000) {
        tax = 0;
      } else {
        const excessIncome = taxableIncome - 1200000;
        if (tax > excessIncome) tax = excessIncome;
      }
    } else {
      totalDeductions = ded80c + ded80d + dedHra + stdDeductionOld;
      taxableIncome = Math.max(0, grossIncome - totalDeductions);

      let tempIncome = taxableIncome;
      if (tempIncome > 1000000) { tax += (tempIncome - 1000000) * 0.30; tempIncome = 1000000; }
      if (tempIncome > 500000) { tax += (tempIncome - 500000) * 0.20; tempIncome = 500000; }
      if (tempIncome > 250000) { tax += (tempIncome - 250000) * 0.05; }

      if (taxableIncome <= 500000) {
        tax = 0;
      } else {
        const excessIncome = taxableIncome - 500000;
        if (tax > excessIncome) tax = excessIncome;
      }
    }

    const finalTax = tax > 0 ? tax + (tax * 0.04) : 0;

    setResult({
      grossIncome,
      taxableIncome,
      totalDeductions,
      tax: finalTax,
    });

    setIsCalculating(false);
  }, 600);
};

  return (
    <div className="flex flex-col xl:flex-row gap-8 w-full animate-[fadeIn_0.5s_ease-out]">
      {/* HEADER SECTION (Mobile only) */}
      <div className="xl:hidden w-full">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 mb-2">
          Tax Estimator
        </h1>
        <p className="text-slate-400">Calculate your tax liability instantly.</p>
      </div>

      {/* LEFT CARD: INPUTS */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-[24px] shadow-2xl shadow-black/40 flex-1 p-8 relative overflow-hidden group transition-all duration-300 hover:border-slate-700/80">

        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[64px] rounded-full pointer-events-none group-hover:bg-teal-500/20 transition-all duration-500" />

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">
            Tax Details
          </h2>
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Annual Income
            </label>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
              <input
                type="number"
                className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-100 placeholder-slate-700 outline-none transition-all duration-200"
                value={income}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val < 0) return;
                  setIncome(val);
                }}
                placeholder="0.00"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">
                {error}
              </p>
            )}
            {/* Salaried Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group/check w-max">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${isSalaried ? 'bg-teal-500 border-teal-500' : 'bg-slate-950/50 border-slate-700 group-hover/check:border-teal-500/50'}`}>
                {isSalaried && <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={isSalaried}
                onChange={(e) => setIsSalaried(e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-300 group-hover/check:text-slate-200 transition-colors flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500 group-hover/check:text-slate-400" />
                I am a Salaried Employee
              </span>
            </label>
          </div>

          {/* Regime Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tax Regime
            </label>
            <div className="flex bg-slate-950/50 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setRegime("old")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${regime === "old"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
              >
                Old Regime
              </button>
              <button
                onClick={() => setRegime("new")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${regime === "new"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
              >
                New Regime
              </button>
            </div>
            {regime === "old" ? (
              <p className="text-xs text-teal-400 mt-2 ml-1 flex items-center gap-1.5 animate-[fadeIn_0.3s_ease]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Allows deductions like 80C, 80D and HRA.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-2 ml-1 flex items-center gap-1.5 animate-[fadeIn_0.3s_ease]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Simplified slabs with minimal deductions.
              </p>
            )}
          </div>

          {/* Old Regime Fields */}
          <div className={`space-y-6 transition-all duration-500 overflow-hidden ${regime === 'old' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="pt-4 border-t border-slate-800/80">
              <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
                <span>Section 80C</span>
                <span className="text-slate-500 text-xs">Max ₹1,50,000</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-100 placeholder-slate-700 outline-none transition-all duration-200"
                  value={eightyC}
                  onChange={(e) => setEightyC(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
                <span>Section 80D</span>
                <span className="text-slate-500 text-xs">Health Insurance</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-100 placeholder-slate-700 outline-none transition-all duration-200"
                  value={eightyD}
                  onChange={(e) => setEightyD(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                HRA Exemption
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-100 placeholder-slate-700 outline-none transition-all duration-200"
                  value={hra}
                  onChange={(e) => setHra(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <button
            onClick={calculateTax}
            disabled={isCalculating}
            className="w-full py-4 mt-6 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isCalculating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                Calculating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Calculate Liability <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT CARD: OUTPUT */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[24px] shadow-2xl flex-1 flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />

        <div className="p-8 pb-6 border-b border-slate-800/60 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <PieChart className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">
            Tax Summary
          </h2>
        </div>

        <div className="p-8 flex-1 flex flex-col justify-center">
          {!result ? (
            <div className="flex flex-col items-center justify-center text-center h-full opacity-50 space-y-4 animate-pulse">
              <div className="w-16 h-16 rounded-full border border-slate-700 bg-slate-800/50 flex items-center justify-center">
                <Calculator className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-lg max-w-[200px]">
                Enter your details to generate summary.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-[slideInUp_0.4s_ease-out]">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/30 border border-slate-800/50">
                  <span className="text-slate-400 font-medium">Gross Income</span>
                  <span className="text-lg font-semibold text-slate-200">
                    ₹{result.grossIncome.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/30 border border-slate-800/50">
                  <span className="text-slate-400 font-medium">Total Deductions</span>
                  <span className="text-lg font-semibold text-emerald-400">
                    - ₹{result.totalDeductions.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/30 border border-slate-800/50">
                  <span className="text-slate-400 font-medium">Taxable Income</span>
                  <span className="text-lg font-semibold text-slate-200">
                    ₹{result.taxableIncome.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Total Tax Banner */}
              <div className="mt-8 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 border border-teal-500/20 shadow-lg shadow-teal-500/5">
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

                <span className="block text-teal-400 font-medium text-sm tracking-wider uppercase mb-2">
                  Total Tax Payable
                </span>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-slate-400 font-light">₹</span>
                  <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-200 tracking-tight">
                    {result.tax.toLocaleString("en-IN")}
                  </h2>
                </div>

                <p className="text-slate-400 text-sm mt-3 flex items-center gap-1.5">
                  As per the <strong>{regime} regime</strong> rules. Includes 4% Health &amp; Education Cess.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

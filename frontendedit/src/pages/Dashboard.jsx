import { PiggyBank, Wallet, Download, Eye, X} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboard } from "../services/dashboardApi";

export default function Dashboard() {
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({
    total_budget: 0,
    total_expense: 0,
    total_savings: 0,
  });
  const [expenses, setExpenses] = useState([]);
  const token = localStorage.getItem("token");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
  if (previewOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [previewOpen]);
  //FETCH EXPENSES
  useEffect(() => {
    fetch("https://kharchaguru-0cgi.onrender.com/expenses", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setExpenses(data);
      })
      .catch((err) => console.error(err));
  }, []);

  //FETCH DASHBOARD
  useEffect(() => {
    if (!token) return;

    fetchDashboard(token)
      .then((data) => {
        setBudgets(data.budgets || []);
        setGoals(data.goals || []);
        setSummary({
          total_budget: Number(data.total_budget || 0),
          total_expense: Number(data.total_expense || 0),
          total_savings: Number(data.total_savings || 0),
        });
      })
      .catch((err) => {
        console.error("Dashboard fetch failed", err);
      });
  }, [token]);
  
  // 🔥 EXPENSE GRAPH (UNCHANGED)
  const budgetOverview = useMemo(() => {
    const remaining = Math.max(summary.total_budget - summary.total_expense, 0);
    const utilization =
      summary.total_budget > 0
        ? Math.min((summary.total_expense / summary.total_budget) * 100, 100)
        : 0;

    const grouped = {};

    expenses.forEach((exp) => {
      const category = exp.CategoryName || "Other";
      const amount = exp.Amount || 0;

      if (!grouped[category]) {
        grouped[category] = 0;
      }

      grouped[category] += Number(amount);
    });

    const chartData = Object.keys(grouped).map((cat) => ({
      category: cat,
      spent: grouped[cat],
    }));

    return {
      remaining,
      utilization,
      chartData,
    };
  }, [expenses, summary]);

  // 🔥 REPORT LOGIC START

const usage = summary.total_budget > 0
  ? Math.round((summary.total_expense / summary.total_budget) * 100)
  : 0;

const topCategory = useMemo(() => {
  if (!budgetOverview.chartData || budgetOverview.chartData.length === 0)
    return null;

  return [...budgetOverview.chartData].sort((a, b) => b.spent - a.spent)[0];
}, [budgetOverview]);

const onTrackGoals = goals.filter((g) => g.progress >= 50).length;
const remainingBudget = Math.max(summary.total_budget - summary.total_expense, 0);

const budgetStatus =
  usage >= 100 ? "Critical" : usage >= 85 ? "Warning" : "Healthy";

// 🔥 DOWNLOAD
const triggerBlobDownload = (blob, fileName = "kharchaguru_report.pdf") => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1500);
};

const downloadReport = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login required");
      return;
    }

    const res = await fetch("https://kharchaguru-0cgi.onrender.com/reports/download", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const blob = await res.blob();

    if (!blob || blob.size === 0) {
      throw new Error("Empty file received");
    }

    triggerBlobDownload(blob, "kharchaguru_report.pdf");
  } catch (err) {
    console.error("Download failed:", err);
    alert("Report download failed");
  }
};

// 🔥 PREVIEW
const previewReport = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login required");
      return;
    }

    setPreviewLoading(true);

    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    const res = await fetch("https://kharchaguru-0cgi.onrender.com/reports/preview", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const blob = await res.blob();

    if (!blob || blob.size === 0) {
      throw new Error("Empty preview file received");
    }

    const url = window.URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewOpen(true);
  } catch (err) {
    console.error("Preview failed:", err);
    alert("Report preview failed");
  } finally {
    setPreviewLoading(false);
  }
};

useEffect(() => {
  if (previewOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [previewOpen]);

const closePreview = () => {
  setPreviewOpen(false);
  if (previewUrl) {
    window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }
};

// 🔥 REPORT LOGIC END

  // 🔥 NEW BUDGET GRAPH (DYNAMIC)
  const budgetBarData = useMemo(() => {
    return budgets.map((b) => {
      const spent = Number(b.spent || 0);
      const limit = Number(b.limit || 0);
      const left = Math.max(limit - spent, 0);

      return {
        category: b.category,
        Total: limit,
        Spent: spent,
        Left: left,
      };
    });
  }, [budgets]);

  return (
    <div className="space-y-6 p-2 sm:p-6 font-sans">

      {/* HEADER */}
      <div className="glass-card rounded-3xl p-6 shadow-xl font-sans">
        <h1 className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-3xl font-bold text-transparent">
          Welcome back
        </h1>
        <p className="mt-1 text-slate-400">
          Track what you planned, what you spent, and what remains.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 font-sans">
        <StatCard title="Total Budget" value={`₹${summary.total_budget}`} icon={<Wallet className="text-teal-400" />} />
        <StatCard title="Total Expense" value={`₹${summary.total_expense}`} icon={<Wallet className="text-rose-400" />} />
        <StatCard title="Total Savings" value={`₹${summary.total_savings}`} icon={<PiggyBank className="text-emerald-400" />} />
      </div>
      {previewOpen && (
    <div className="fixed inset-y-0 right-0 left-[220px] top-[64px] z-[999] bg-slate-950/75 backdrop-blur-sm">
    <div className="flex h-screen w-full items-start justify-center p-3 sm:p-4">
      <div className="relative flex h-[96vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Monthly Smart Report Preview
            </h3>
            <p className="text-sm text-slate-400">
              Review before downloading
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await fetch(previewUrl);
                  const blob = await res.blob();
                  triggerBlobDownload(blob, "kharchaguru_report.pdf");
                } catch (err) {
                  console.error("Preview download failed:", err);
                  alert("Report download failed");
                }
              }}
              className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              Download
            </button>

            <button
              onClick={closePreview}
              className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-950">
          {previewUrl ? (
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              title="KharchaGuru Report Preview"
              className="block h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Preview unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
      {/*  NEW BUDGET GRAPH */}
      <div className="glass-card rounded-3xl p-6 shadow-xl font-sans">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100">
            Budget Overview
          </h2>
          <p className="text-slate-400">
            Total vs spent vs remaining per category.
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={budgetBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(41, 85, 147, 0.15)" />
            <XAxis dataKey="category" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total" fill="#6366f1" radius={[6,6,0,0]} />
            <Bar dataKey="Spent" fill="#ef4444" radius={[6,6,0,0]} />
            <Bar dataKey="Left" fill="#22c55e" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* EXPENSE OVERVIEW (UNCHANGED) */}
      <div className="glass-card rounded-3xl p-6 shadow-xl font-sans">
        <div className="mb-6 flex justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              Expense Overview
            </h2>
            <p className="text-slate-400">
              Category-wise expense distribution.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Budget Used</p>
            <p className="text-3xl text-white font-semibold">
              {budgetOverview.utilization.toFixed(0)}%
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={budgetOverview.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(41, 85, 147, 0.15)" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis type="category" dataKey="category" stroke="#94a3b8" width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="spent" fill="#4396d1bb" barSize={14} radius={[0,6,6,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GOALS */}
      {goals.length > 0 && (
        <div className="glass-card rounded-3xl p-6 shadow-xl font-sans">
          <h2 className="mb-6 text-xl font-bold text-slate-200">
            Goals Progress (%)
          </h2>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart layout="vertical" data={goals}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="progress" fill="#2dd4bf" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/*  REPORT CARD */}
<div className="glass-card mt-6 overflow-hidden rounded-3xl p-6 shadow-xl font-sans">

  <div className="flex justify-between items-center">

    {/* LEFT CONTENT */}
    <div>
      <h2 className="text-xl font-bold text-slate-200">
        Monthly Smart Report
      </h2>

      <p className="text-slate-400 text-sm mt-1">
        Get a complete breakdown of your financial activity.
      </p>

      {/*  SMART INSIGHTS */}
      <div className="mt-3 space-y-1 text-sm">
      <p className="text-teal-400">
        Budget usage: {usage}% • Status: {budgetStatus}
      </p>

      <p className="text-amber-400">
        Top spending: {topCategory?.category || "N/A"}
      </p>

      <p className="text-emerald-400">
        Remaining budget: ₹{remainingBudget}
      </p>

      <p className="text-sky-400">
        {onTrackGoals} goals on track
      </p>
    </div>
        </div>

        <div className="flex gap-3">
      <button
        onClick={previewReport}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-400/30 bg-slate-900 text-teal-300 font-semibold hover:bg-slate-800"
      >
        <Eye size={18} />
        {previewLoading ? "Loading..." : "Preview"}
      </button>

      <button
        onClick={downloadReport}
        className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-black rounded-xl font-semibold hover:opacity-90"
      >
        <Download size={18} />
        Download PDF
      </button>
    </div>
  </div>

  

  {/* FOOTER INFO */}
  <div className="mt-4 text-xs text-slate-500">
    Includes: Expense analysis • Budget usage • Goal tracking • Insights
  </div>

</div>
    </div>
  );
}

/* COMPONENT */

function StatCard({ title, value, icon }) {
  return (
    <div className="glass-card rounded-3xl p-6 shadow-xl font-sans">
      <div className="flex justify-between">
        <p className="text-slate-400">{title}</p>
        {icon}
      </div>
      <p className="text-3xl text-white mt-4 font-semibold">{value}</p>
    </div>
  );
}
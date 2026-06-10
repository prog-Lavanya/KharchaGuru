import { useState } from "react";

const API_BASE =   "https://kharchaguru-0cgi.onrender.com";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")}`,
});

// ── Month picker helpers ──────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function MonthYearPicker({ history, selectedKey, onSelect }) {
  // Build a set of available month-year keys from history
  const available = new Set(
    history.map((h) => h.MonthLabel) // e.g. "Mar 2025"
  );

  // Build a 12-month grid ending at current month
  const now = new Date();
  const cells = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    cells.push({ label, available: available.has(label) });
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 py-2">
      {cells.map(({ label, available: avail }) => {
        const isSelected = selectedKey === label;
        return (
          <button
            key={label}
            disabled={!avail}
            onClick={() => avail && onSelect(label)}
            className={`
              rounded-lg px-1 py-2 text-[11px] font-semibold transition-all
              ${isSelected
                ? "bg-teal-600 text-white shadow-md"
                : avail
                  ? "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                  : "bg-gray-50 text-gray-300 cursor-not-allowed"
              }
            `}
          >
            {label.split(" ")[0]}
            <span className="block text-[9px] font-normal opacity-70">
              {label.split(" ")[1]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HistoryDetailCard({ entry }) {
  if (!entry) return null;

  const pct = Math.min(100, entry.Utilization || 0);
  const isExceeded = pct >= 100;
  const isWarning = pct >= 85;

  return (
    <div className={`rounded-2xl border p-4 space-y-3 mt-2
      ${entry.IsActive
        ? "bg-teal-50 border-teal-300"
        : "bg-gray-50 border-gray-200"
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {entry.MonthLabel || entry.StartDate}
          </p>
          <p className="text-[11px] text-gray-400">
            {entry.StartDate} → {entry.EndDate}
          </p>
        </div>
        {entry.IsActive && (
          <span className="text-[10px] bg-teal-500 text-white rounded-full px-2.5 py-0.5 font-bold">
            Active
          </span>
        )}
      </div>

      {/* Amount row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white border border-gray-100 py-2 px-1">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Set</p>
          <p className="text-sm font-bold text-teal-700">
            ₹{entry.BudgetAmount?.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 py-2 px-1">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Spent</p>
          <p className={`text-sm font-bold ${isExceeded ? "text-red-600" : "text-gray-700"}`}>
            ₹{(entry.Spent ?? 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 py-2 px-1">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Left</p>
          <p className={`text-sm font-bold ${isExceeded ? "text-red-500" : "text-blue-600"}`}>
            ₹{(entry.Remaining ?? entry.BudgetAmount - (entry.Spent ?? 0)).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${
              isExceeded ? "bg-red-500" : isWarning ? "bg-yellow-400" : "bg-gradient-to-r from-teal-500 to-blue-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] font-mono text-gray-500 text-right">
          {pct.toFixed(1)}% used
        </p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ActiveBudgetCard({ budget, alerts = [], onDelete, onRefresh }) {
  const percentUsed = Math.min(100, budget.Utilization || 0);
  const isWarning   = percentUsed >= 90;
  const isExceeded  = percentUsed >= 100;

  // History / month picker state
  const [showHistory,   setShowHistory]   = useState(false);
  const [history,       setHistory]       = useState([]);
  const [histLoading,   setHistLoading]   = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null); // "Mar 2025"

  // Edit state
  const [showEdit,    setShowEdit]    = useState(false);
  const [newAmount,   setNewAmount]   = useState("");
  const [renew,       setRenew]       = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState("");

  const alertStyles = {
    critical: "bg-red-50 border-red-200 text-red-700",
    high:     "bg-yellow-50 border-yellow-200 text-yellow-800",
    medium:   "bg-blue-50 border-blue-200 text-blue-700",
  };

  // ── Calendar click — fetch full history then show picker ─────────────────
  const handleCalendarClick = async (e) => {
    e.stopPropagation();
    if (showHistory) {
      setShowHistory(false);
      setSelectedMonth(null);
      return;
    }
    setHistLoading(true);
    setShowHistory(true);

    try {
      const res = await fetch(
        `${API_BASE}/budgets/history/${budget.CategoryID}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setHistory(list);

      // Auto-select current active month
      const active = list.find((h) => h.IsActive);
      if (active?.MonthLabel) setSelectedMonth(active.MonthLabel);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  const selectedEntry = history.find((h) => h.MonthLabel === selectedMonth) || null;

  // ── Edit save ─────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    setEditError("");
    const payload = {
      new_amount: newAmount ? parseFloat(newAmount) : budget.BudgetAmount,
      renew,
    };
    if (payload.new_amount <= 0) { setEditError("Amount must be greater than 0"); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/budgets/${budget.BudgetID}`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); setEditError(err.detail || "Failed to update"); return; }
      setShowEdit(false);
      setNewAmount(""); setRenew(false); setEditError("");
      if (onRefresh) onRefresh();
    } catch { setEditError("Something went wrong"); }
    finally { setEditLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4 border border-teal-100 hover:shadow-xl transition-shadow">

        {/* TOP ROW */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-black">{budget.Category}</h3>
            <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
              {budget.BudgetPeriod || "Monthly"} Budget
            </p>
            {budget.StartDate && budget.EndDate && (
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  onClick={handleCalendarClick}
                  title="View month-wise history"
                  className={`transition ${showHistory ? "text-teal-700" : "text-teal-500 hover:text-teal-700"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                </button>
                <span className="text-[11px] text-gray-400 font-medium">
                  {budget.StartDate} → {budget.EndDate}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowEdit(true); setNewAmount(""); setRenew(false); setEditError(""); }}
              className="text-[10px] text-teal-600 hover:text-teal-800 uppercase tracking-widest font-bold"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(budget.BudgetID)}
              className="text-[10px] text-red-600 hover:text-red-800 uppercase tracking-widest font-bold"
            >
              Delete
            </button>
          </div>
        </div>

        {/* ── HISTORY PANEL — month picker + detail ── */}
        {showHistory && (
          <div className="rounded-2xl border border-teal-100 bg-teal-50/40 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
              📅 {budget.Category} — Select a Month
            </p>

            {histLoading ? (
              <p className="text-xs text-gray-400 py-3 text-center">Loading history…</p>
            ) : (
              <>
                <MonthYearPicker
                  history={history}
                  selectedKey={selectedMonth}
                  onSelect={setSelectedMonth}
                />

                {selectedMonth && (
                  selectedEntry ? (
                    <HistoryDetailCard entry={selectedEntry} />
                  ) : (
                    <p className="text-xs text-gray-400 mt-2 text-center py-3">
                      No budget found for {selectedMonth}
                    </p>
                  )
                )}

                {!selectedMonth && history.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No history available</p>
                )}
              </>
            )}
          </div>
        )}

        {/* AMOUNT ROW */}
        <div className="flex justify-between text-sm font-semibold tracking-tight">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-teal-700">
              ₹{budget.BudgetAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Remaining</p>
            <p className={`text-lg font-bold ${isExceeded ? "text-red-600" : "text-blue-600"}`}>
              ₹{budget.Remaining?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                isExceeded ? "bg-red-600" : isWarning ? "bg-yellow-500" : "bg-gradient-to-r from-teal-600 to-blue-600"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-mono text-teal-700">{percentUsed.toFixed(1)}% used</p>
            <p className="text-xs font-semibold tracking-tight text-gray-500">
              ₹{budget.Spent?.toLocaleString("en-IN", { minimumFractionDigits: 2 })} spent
            </p>
          </div>
        </div>

        {/* ALERTS */}
        {alerts?.length > 0 && (
          <div className="space-y-2 pt-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`border rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2
                  ${alertStyles[alert.severity] || "bg-gray-50 border-gray-200 text-gray-700"}`}
              >
                <span>•</span><span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Edit Budget — {budget.Category}
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Current: ₹{budget.BudgetAmount?.toLocaleString("en-IN")} &nbsp;|&nbsp;
              {budget.StartDate} → {budget.EndDate}
            </p>

            {editError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                {editError}
              </div>
            )}

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              New Amount (₹)
            </label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder={`Leave blank to keep ₹${budget.BudgetAmount}`}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-5
                         focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <label
              className="flex items-center gap-3 cursor-pointer mb-6 select-none"
              onClick={() => setRenew(!renew)}
            >
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5
                ${renew ? "bg-teal-500" : "bg-gray-300"}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${renew ? "translate-x-5" : "translate-x-0"}`}/>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Renew period</p>
                <p className="text-xs text-gray-400">
                  Reset dates — same {budget.BudgetPeriod?.toLowerCase()} cycle from today
                </p>
              </div>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {editLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
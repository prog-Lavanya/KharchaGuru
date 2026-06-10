import { useState, useEffect } from 'react';
import BudgetForm from '../components/Budget/BudgetForm';
import ActiveBudgetCard from '../components/Budget/ActiveBudgetCard';

const API_BASE ="https://kharchaguru-0cgi.onrender.com";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")}`,
});

// API Functions
const budgetAPI = {
  async fetchCategories() {
    const res = await fetch(`${API_BASE}/budgets/categories`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  },

  async fetchBudgets() {
    const res = await fetch(`${API_BASE}/budgets/`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch budgets");
    return res.json();
  },

  async createBudget(payload) {
    const res = await fetch(`${API_BASE}/budgets/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create budget");
    }
    return res.json();
  },

  async deleteBudget(id) {
    const res = await fetch(`${API_BASE}/budgets/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete budget");
  }
};

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
  const onFocus = () => loadBudgets();
  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
}, []);

  const loadBudgets = async () => {
    setLoading(true);
    setError("");
    
    try {
      const data = await budgetAPI.fetchBudgets();
      setBudgets(data.budgets || []);
      setActiveCount(data.active_count || 0);
    } catch (err) {
      setError("Failed to load budgets. Please check your connection.");
      console.error("Budget loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    try {
      await budgetAPI.deleteBudget(id);
      setDeleteConfirm(null);
      loadBudgets();
    } catch (err) {
      setError("Failed to delete budget");
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Budgets</h1>
          <p className="text-slate-400">Plan and track your spending</p>
        </div>

        <button
          onClick={() => setShowBudgetForm(true)}
          className="rounded-xl bg-teal-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-600/20 transition-colors hover:bg-teal-500"
        >
          + Add Budget
        </button>
      </div>

      {/* ACTIVE COUNT CARD */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white shadow-xl">
        <p className="text-sm opacity-90">Active Budgets</p>
        <p className="text-4xl font-bold">{activeCount}</p>
        <p className="text-sm opacity-90">categories being tracked</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-300">{error}</p>
          <button 
            onClick={() => {
              setError("");
              loadBudgets();
            }}
            className="mt-2 text-xs text-rose-200 underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Budget</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this budget? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBudget(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUDGET LIST */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-center text-slate-400">Loading budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
          <p className="text-slate-400">No budgets created yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => (
            <ActiveBudgetCard
              key={budget.BudgetID}
              budget={budget}
              alerts={Array.isArray(budget.alerts) ? budget.alerts : []}
              onDelete={(id) => setDeleteConfirm(id)}
              onRefresh={loadBudgets}
            />
          ))}
        </div>
      )}

      {/* MODAL */}
      {showBudgetForm && (
        <BudgetForm
          onClose={() => setShowBudgetForm(false)}
          onBudgetCreated={loadBudgets}
        />
      )}
    </div>
  );
}

// Export the API for use in other components
export { budgetAPI };
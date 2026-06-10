import { useEffect, useState } from "react";
import AddExpenseModal from "../components/Expenses/AddExpenseModal";
import EditExpenseModal from "../components/Expenses/EditExpenseModal";

const BASE_URL = "https://kharchaguru-0cgi.onrender.com";

export default function Expenses() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const token = localStorage.getItem("token");

  /* ---------------- FETCH ---------------- */
  const fetchExpenses = async () => {
    const res = await fetch(`${BASE_URL}/expenses/category-wise`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    const refreshExpenses = () => fetchExpenses();
    window.addEventListener("expenseAdded", refreshExpenses);
    window.addEventListener("smartEntryAdded", refreshExpenses);
    return () => {
      window.removeEventListener("expenseAdded", refreshExpenses);
      window.removeEventListener("smartEntryAdded", refreshExpenses);
    };
  }, []);

  const totalAmount = categories.reduce((s, c) => s + c.total, 0);
  const totalCount = categories.reduce((s, c) => s + c.count, 0);
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      expenses: cat.expenses || [],
    }))
    .filter((cat) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        cat.category.toLowerCase().includes(term) ||
        cat.expenses.some(
          (expense) =>
            expense.title?.toLowerCase().includes(term) ||
            new Date(expense.date).toLocaleDateString().includes(term)
        )
      );
    });

  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;

    await fetch(`${BASE_URL}/expenses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchExpenses();
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-gray-600">View expenses category-wise</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-teal-700 text-white px-5 py-2 rounded-lg"
        >
          + Add Expense
        </button>
      </div>

      {/* TOTAL */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl p-6">
        <p>Total Expenses</p>
        <p className="text-4xl font-bold">Rs.{totalAmount}</p>
        <p>{totalCount} transactions</p>
      </div>

      {/* SEARCH */}
      <div className="relative">
      <span className="absolute z-10 left-4 top-1/2 -translate-y-1/2 text-white text-sm font-bold pointer-events-none">
          Q
      </span>        
      <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search expenses..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400"        />
      </div>

      {/* CATEGORY LIST */}
      {filteredCategories.length === 0 && (
        <p className="text-center text-gray-500 mt-10">
          No expenses yet. Click <b>+ Add Expense</b>.
        </p>
      )}

      {filteredCategories.map((cat) => {
        const isOpen = openCategory === cat.category;
        const latestExpense = cat.expenses[0];

        return (
          <div
            key={cat.category}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white/10 backdrop-blur-lg border border-white/20 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
          >
            <button
              onClick={() =>
                setOpenCategory(isOpen ? null : cat.category)
              }
              className="w-full bg-white px-6 py-5 text-left transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold text-white shadow-lg">
                    {cat.category.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-semibold text-slate-900">{cat.category}</p>
                    <p className="text-sm text-slate-500">
                      Latest transaction: {latestExpense ? formatDate(latestExpense.date) : "No transactions"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-2xl font-bold text-rose-600">
                    Rs.{cat.total}
                  </span>
                  <p className="text-sm text-slate-500">
                    {cat.count} transactions
                  </p>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Transaction History
                  </p>
                  <p className="text-sm text-slate-500">Newest first</p>
                </div>

                <div className="space-y-4">
                {cat.expenses.map((e, idx) => (
                  <div
                    key={e.ExpenseID}
                    className="relative flex justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <span className="mt-2 h-3 w-3 rounded-full bg-teal-600"></span>
                        {idx !== cat.expenses.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-slate-300"></span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">
                          {e.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                            {formatDate(e.date)}
                          </span>
                        </div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          {cat.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-bold text-rose-600">
                        Rs.{e.amount}
                      </span>
                      <button
                        onClick={() =>
                          setEditExpense({
                            ExpenseID: e.ExpenseID,
                            title: e.title,
                            amount: e.amount,
                            date: e.date,
                            category: cat.category,
                          })
                        }
                        className="text-sm font-medium text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(e.ExpenseID)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                    {deleteTarget === e.ExpenseID && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={async () => {
                            await fetch(`${BASE_URL}/expenses/${e.ExpenseID}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setDeleteTarget(null);
                            fetchExpenses();
                          }}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Yes
                        </button>

                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="border px-2 py-1 rounded text-xs text-gray-600"
                        >
                          No
                        </button>
                      </div>
                    )}

                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ADD MODAL */}
      {showModal && (
        <AddExpenseModal
          categories={categories}
          onClose={() => setShowModal(false)}
          onSuccess={fetchExpenses}
        />
      )}
      {editExpense && (
        <EditExpenseModal
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  );
}
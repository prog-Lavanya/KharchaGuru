import { useEffect, useState } from "react";
import SmartInput from "../SmartInput/SmartInput";

const API_BASE = "http://127.0.0.1:8000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")
    }`,
});

export default function BudgetForm({ onClose, onBudgetCreated }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("Monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /* ---------------- DATE LIMITS ---------------- */
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - 15);

  const formatDate = (d) => d.toISOString().split("T")[0];
  const minDateStr = formatDate(minDate);
  const maxDateStr = formatDate(today);

  /* ---------------- LOAD CATEGORIES ---------------- */
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/budgets/categories`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      setCategories(await res.json());
    } catch {
      setError("Failed to load categories");
    }
  };
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  /* ---------------- SUBMIT (FIXED) ---------------- */
  const handleSubmit = async () => {
    setError("");

    // Basic validation
    if (!selectedCat || !amount) {
      setError("Please fill all required fields");
      return;
    }

    // ONLY validate dates when Custom period is selected
    if (period === "Custom") {
      if (!startDate || !endDate) {
        setError("Please select start and end dates");
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Check start date (not earlier than 15 days ago)
      const minStart = new Date();
      minStart.setDate(minStart.getDate() - 15);
      if (start < minStart) {
        setError("Start date cannot be earlier than 15 days ago");
        return;
      }

      // Check duration (max 3 months)
      const maxEnd = new Date(start);
      maxEnd.setMonth(maxEnd.getMonth() + 3);
      if (end > maxEnd) {
        setError("Custom budget cannot exceed 3 months");
        return;
      }
    }
    setLoading(true);
    try {
      const body = {
        BudgetAmount: amount.toString(),
        BudgetPeriod: period,
        IsActive: true,
      };
      // Category selection
      if (selectedCat === "OTHER") {
        if (!customCategory.trim()) {
          setError("Please enter category name");
          setLoading(false);
          return;
        }
        body.CategoryName = customCategory.trim();
      } else {
        body.CategoryID = Number(selectedCat);
      }

      // ONLY send dates for Custom period
      if (period === "Custom") {
        body.StartDate = `${startDate}T00:00:00`;
        body.EndDate = `${endDate}T23:59:59`;
      }

      const res = await fetch(`${API_BASE}/budgets/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
       throw new Error(
          Array.isArray(err.detail)
            ? "Enter a valid amount"
            : typeof err.detail === "object"
            ? "Enter a valid amount"
            : err.detail || "Enter a valid amount"
        );
      }

      onBudgetCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm
                 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white text-slate-900 w-full max-w-md rounded-2xl
                   shadow-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Set New Budget
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition"
          >
            x
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border
                          border-red-200 rounded-lg
                          text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* CATEGORY */}
          <select
            className="w-full border border-gray-300 rounded-xl
                       py-3 px-4 text-gray-800
                       focus:outline-none focus:ring-2
                       focus:ring-teal-600 focus:border-teal-600"
            value={selectedCat}
            onChange={(e) => {
              setSelectedCat(e.target.value);
              setCustomCategory("");
            }}
          >
            <option value="">Choose Category</option>
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>
                {c.CategoryName}
              </option>
            ))}
            <option value="OTHER">Other</option>
          </select>

          {selectedCat === "OTHER" && (
            <SmartInput
              value={customCategory}
              onChange={setCustomCategory}
              placeholder="New category name"
              allowFileUpload={false}
              allowCameraCapture={false}
            />
          )}

          {/* PERIOD */}
          <div className="flex gap-2">
            {["Weekly", "Monthly", "Custom"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2.5 rounded-xl text-sm
                  font-medium transition
                  ${period === p
                    ? "bg-teal-600 text-white shadow"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* CUSTOM DATES */}
          {period === "Custom" && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-xl
                           py-2.5 px-3
                           focus:ring-2 focus:ring-teal-600"
              />
              <input
                type="date"
                min={startDate || minDateStr}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-xl
                           py-2.5 px-3
                           focus:ring-2 focus:ring-teal-600"
              />
            </div>
          )}

          {/* AMOUNT — SmartInput with voice/OCR */}
          <SmartInput
            value={amount}
            onChange={setAmount}
            placeholder="Budget amount (e.g. 5000 food budget)"
            allowFileUpload={false}
            allowCameraCapture={false}
          />

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-6 bg-teal-600 text-white
                       py-3.5 rounded-xl font-semibold
                       hover:bg-teal-700 transition
                       disabled:opacity-50"
          >
            {loading ? "Creating..." : "Confirm Budget"}
          </button>
        </div>
      </div>
    </div>
  );
}

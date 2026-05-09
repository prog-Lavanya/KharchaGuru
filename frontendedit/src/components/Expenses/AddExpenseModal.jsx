import { useEffect, useState, useMemo } from "react";
import SmartInput from "../SmartInput/SmartInput";

const BASE_URL = "http://localhost:8000";

/* 🔥 ANOMALY LOGIC */
const categoryLimits = {
  Food: 500,
  Transport: 1000,
  Shopping: 5000,
  Entertainment: 3000,
  Others: 2000,
};

function checkAnomaly(category, amount, categoriesData) {
  const categoryData = categoriesData.find(
    (c) => c.category === category
  );

  if (!categoryData || categoryData.expenses.length < 3) {
    const limit = categoryLimits[category] || 2000;
    return amount > limit;
  }

  const expenses = categoryData.expenses;
  const avg =
    expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length;

  return amount > avg * 3;
}

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
];

export default function AddExpenseModal({ onClose, onSuccess, categories }) {
  const [rawInput, setRawInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [dbCategories, setDbCategories] = useState([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {setDbCategories([]); return;  }
    fetch(`${BASE_URL}/expenses/categories`, {
      headers: {Authorization: `Bearer ${token}`,},
    })
      .then((res) => res.json())
      .then((data) => {
        setDbCategories(Array.isArray(data) ? data : []);
      }).catch(() => {setDbCategories([]);});
  }, [token]);
  useEffect(() => {
    if (!preview) return;
    const amount = parseFloat(preview.Amount);
    const category = preview.CategoryName;
    if (!isNaN(amount) && amount > 0) {
      const isAnomaly = checkAnomaly(category, amount, categories);
      if (isAnomaly) {
        setWarning(`⚠️ ₹${amount} for ${category} seems unusually high`);
      } else {
        setWarning("");
      }
    }
  }, [preview]);
  const mergedCategories = useMemo(() => {
    const dbNames = dbCategories
      .map((c) => {
        let name = c.CategoryName.trim();
        if (name.toLowerCase() === "others") return "Other";
        return name;
      })
      .filter(
        (name) =>
          name.toLowerCase() !== "savings" &&
          !["other", "choose category"].includes(name.toLowerCase()) &&
          !DEFAULT_CATEGORIES.map((c) => c.toLowerCase()).includes(
            name.toLowerCase()
          )
      );

    // Sab known categories merge karo
    const allKnown = [...DEFAULT_CATEGORIES, ...dbNames];

    // ✅ KEY FIX: Backend predicted category agar list mein nahi hai toh add karo
    const predictedCategory = preview?.CategoryName;
    if (
      predictedCategory &&
      predictedCategory !== "Other" &&
      predictedCategory !== "Choose Category" &&
      !allKnown.map((c) => c.toLowerCase()).includes(predictedCategory.toLowerCase())
    ) {
      allKnown.push(predictedCategory);
    }

    // "Other" hamesha last
    allKnown.push("Other");
    return allKnown;
  }, [dbCategories, preview?.CategoryName]);

  const handlePreview = async () => {
    const input = rawInput.trim();

    if (!input) {
      setError("❌ Please enter something first");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/expenses/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ raw_input: input }),
      });

      const data = await res.json();

      const amount = data.Amount ?? data.amount ?? 0;
      const description = data.Description ?? data.description ?? input;

      // ✅ FIX 2: Backend ki category as-is set karo (exact match ke liye)
      const backendCategory = data.CategoryName || "Food";

      setPreview({
        Description: description,
        Amount: amount,
        CategoryName: backendCategory,
        Date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error(err);

      setPreview({
        Description: input,
        Amount: "",
        CategoryName: "Food",
        Date: new Date().toISOString().split("T")[0],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!token) {
      setError("Please log in first.");
      return;
    }

    if (!preview) {
      setError("No preview data found.");
      return;
    }

    const finalCategory =
      preview.CategoryName === "Other"
        ? customCategory.trim()
        : preview.CategoryName;

    if (!finalCategory || finalCategory === "Choose Category") {
      setError("❌ Please select a category");
      return;
    }

    if (!preview.Description || !String(preview.Description).trim()) {
      setError("❌ Description is required.");
      return;
    }

    const amount = parseFloat(preview.Amount);

    if (isNaN(amount) || amount <= 0) {
      setError("❌ Enter a valid amount");
      return;
    }

    if (!preview.Date) {
      setError("❌ Date is required");
      return;
    }

    const isAnomaly = checkAnomaly(finalCategory, amount, categories);
    if (isAnomaly) {
      setWarning(`⚠️ ₹${amount} for ${finalCategory} seems unusually high`);
    } else {
      setWarning("");
    }

    try {
      const res = await fetch(`${BASE_URL}/expenses/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Description: preview.Description,
          Amount: amount,
          CategoryName: finalCategory,
          Date: preview.Date,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to save expense");
        return;
      }

      setRawInput("");
      setPreview(null);
      setCustomCategory("");
      setError("");
      setWarning("");

      window.dispatchEvent(new Event("expenseAdded"));
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-slate-900 rounded-2xl p-8 w-full max-w-md shadow-2xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Add Expense</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1: INPUT */}
        {!preview && (
          <div className="space-y-6">
            <SmartInput
              value={rawInput}
              onChange={setRawInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePreview();
              }}
              placeholder="e.g. 50 for panipuri"
            />

            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-bold transition"
            >
              {loading ? "Loading..." : "Preview"}
            </button>
          </div>
        )}

        {/* STEP 2: PREVIEW FORM */}
        {preview && (
          <div className="space-y-5">

            {/* WARNING */}
            {warning && (
              <div className="rounded-xl bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 text-sm font-medium">
                {warning}
              </div>
            )}

            {/* DESCRIPTION */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Description
              </label>
              <input
                value={preview.Description}
                onChange={(e) => {
                  setPreview({ ...preview, Description: e.target.value });
                  setError("");
                }}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Category
              </label>
              <select
                value={preview.CategoryName}
                onChange={(e) =>
                  setPreview({ ...preview, CategoryName: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-3"
              >
                {mergedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* CUSTOM CATEGORY INPUT */}
            {preview.CategoryName === "Other" && (
              <div className="mt-3">
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  New Category
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter new category"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            )}

            {/* AMOUNT + DATE */}
            <div className="flex gap-3">
              <div className="w-1/2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={preview.Amount}
                  onChange={(e) => {
                    setPreview({ ...preview, Amount: e.target.value });
                    setError("");
                  }}
                  placeholder="Amount"
                  className="w-full border px-4 py-3 rounded-xl"
                />
              </div>

              <div className="w-1/2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Date
                </label>
                <input
                  type="date"
                  value={preview.Date}
                  onChange={(e) => {
                    setPreview({ ...preview, Date: e.target.value });
                    setError("");
                  }}
                  className="w-full border px-4 py-3 rounded-xl"
                />
              </div>
            </div>

            {/* SAVE BUTTON */}
            <button
              onClick={handleConfirm}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-bold transition"
            >
              Confirm & Save Expense
            </button>

            {/* BACK */}
            <button
              onClick={() => {
                setPreview(null);
                setWarning("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
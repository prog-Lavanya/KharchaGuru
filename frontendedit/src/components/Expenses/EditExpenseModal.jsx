// import { useEffect, useState } from "react";

// const BASE_URL = "http://localhost:8000";

// const DEFAULT_CATEGORIES = [
//   "Food",
//   "Transport",
//   "Shopping",
//   "Entertainment",
//   "Other",
// ];

// export default function EditExpenseModal({
//   expense,
//   onClose,
//   onSuccess,
// }) {
//   const [form, setForm] = useState({
//     Description: expense.title,
//     Amount: expense.amount,
//     CategoryName: expense.category || "Food",
//     Date: expense.date.split("T")[0],
//   });

//   const [customCategory, setCustomCategory] = useState("");
//   const [dbCategories, setDbCategories] = useState([]);

//   const token = localStorage.getItem("token");

//   useEffect(() => {
//     fetch(`${BASE_URL}/categories?type=Expense`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         setDbCategories(Array.isArray(data) ? data : []);
//       })
//       .catch(() => {
//         setDbCategories([]);
//       });
//   }, []);

//   const mergedCategories = [
//   ...DEFAULT_CATEGORIES.filter(
//     (c) => c.toLowerCase() !== "other" && c.toLowerCase() !== "savings"
//   ),

//   ...dbCategories
//     .map((c) => {
//       let name = c.CategoryName.trim();

//       // normalize
//       if (name.toLowerCase() === "others") return "Other";

//       return name;
//     })
//     .filter(
//       (name) =>
//         name.toLowerCase() !== "savings" && // ❌ remove savings
//         !DEFAULT_CATEGORIES
//           .map((c) => c.toLowerCase())
//           .includes(name.toLowerCase())
//     ),

//   "Other", // ✅ always last
// ];

//   const handleSave = async () => {
//     const finalCategory =
//       form.CategoryName === "Other"
//         ? customCategory.trim()
//         : form.CategoryName;

//     if (!finalCategory) {
//       alert("Please enter a category");
//       return;
//     }

//     await fetch(`${BASE_URL}/expenses/${expense.ExpenseID}`, {
//       method: "PATCH",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({
//         Description: form.Description,
//         Amount: Number(form.Amount),
//         CategoryName: finalCategory,
//         Date: form.Date,
//       }),
//     });

//     onSuccess();
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//       <div className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-md">

//         <h2 className="text-xl font-bold mb-4">Edit Expense</h2>

//         <div className="space-y-4">

//           {/* DESCRIPTION */}
//           <div>
//             <label className="text-sm text-gray-600">Description</label>
//             <input
//               value={form.Description}
//               onChange={(e) =>
//                 setForm({ ...form, Description: e.target.value })
//               }
//               className="w-full border rounded-lg px-3 py-2"
//             />
//           </div>

//           {/* AMOUNT */}
//           <div>
//             <label className="text-sm text-gray-600">Amount (₹)</label>
//             <input
//               type="number"
//               value={form.Amount}
//               onChange={(e) =>
//                 setForm({ ...form, Amount: e.target.value })
//               }
//               className="w-full border rounded-lg px-3 py-2"
//             />
//           </div>

//           {/* CATEGORY */}
//           <div>
//             <label className="text-sm text-gray-600">Category</label>
//             <select
//               value={form.CategoryName}
//               onChange={(e) =>
//                 setForm({ ...form, CategoryName: e.target.value })
//               }
//               className="w-full border rounded-lg px-3 py-2"
//             >
//               {mergedCategories.map((cat) => (
//                 <option key={cat} value={cat}>
//                   {cat}
//                 </option>
//               ))}
//               <option value="Other">+ Add new</option>
//             </select>
//           </div>

//           {/* CUSTOM CATEGORY */}
//           {form.CategoryName === "Other" && (
//             <div>
//               <label className="text-sm text-gray-600">
//                 New Category
//               </label>
//               <input
//                 value={customCategory}
//                 onChange={(e) =>
//                   setCustomCategory(e.target.value)
//                 }
//                 className="w-full border rounded-lg px-3 py-2"
//               />
//             </div>
//           )}

//           {/* DATE */}
//           <div>
//             <label className="text-sm text-gray-600">Date</label>
//             <input
//               type="date"
//               value={form.Date}
//               onChange={(e) =>
//                 setForm({ ...form, Date: e.target.value })
//               }
//               className="w-full border rounded-lg px-3 py-2"
//             />
//           </div>

//           {/* ACTIONS */}
//           <button
//             onClick={handleSave}
//             className="w-full bg-teal-700 text-white py-2 rounded-lg"
//           >
//             Save Changes
//           </button>
//         </div>

//         <button
//           onClick={onClose}
//           className="mt-4 w-full text-gray-500 text-sm"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }


import { useEffect, useState } from "react";

const BASE_URL = "http://localhost:8000";

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
];

export default function EditExpenseModal({ expense, onClose, onSuccess }) {
  const [form, setForm] = useState({
    Description: expense.title,
    Amount: expense.amount,
    CategoryName: expense.category || "Food",
    Date: expense.date.split("T")[0],
  });

  const [customCategory, setCustomCategory] = useState("");
  const [dbCategories, setDbCategories] = useState([]);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    // ✅ FIX: Correct endpoint (same as AddExpenseModal)
    fetch(`${BASE_URL}/expenses/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setDbCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setDbCategories([]);
      });
  }, []);

  // ✅ FIX: expense ki current category bhi list mein ensure karo
  const mergedCategories = (() => {
    const dbNames = dbCategories
      .map((c) => {
        let name = c.CategoryName.trim();
        if (name.toLowerCase() === "others") return "Other";
        return name;
      })
      .filter(
        (name) =>
          name.toLowerCase() !== "savings" &&
          !["other"].includes(name.toLowerCase()) &&
          !DEFAULT_CATEGORIES.map((c) => c.toLowerCase()).includes(
            name.toLowerCase()
          )
      );

    const allKnown = [...DEFAULT_CATEGORIES, ...dbNames];

    // Current expense category agar list mein nahi hai toh add karo
    const currentCat = form.CategoryName;
    if (
      currentCat &&
      currentCat !== "Other" &&
      !allKnown.map((c) => c.toLowerCase()).includes(currentCat.toLowerCase())
    ) {
      allKnown.push(currentCat);
    }

    allKnown.push("Other");
    return allKnown;
  })();

  const handleSave = async () => {
    const finalCategory =
      form.CategoryName === "Other"
        ? customCategory.trim()
        : form.CategoryName;

    if (!finalCategory) {
      setError("❌ Please enter a category");
      return;
    }

    if (!form.Description || !form.Description.trim()) {
      setError("❌ Description is required");
      return;
    }

    const amount = Number(form.Amount);
    if (isNaN(amount) || amount <= 0) {
      setError("❌ Enter a valid amount");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/expenses/${expense.ExpenseID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Description: form.Description,
          Amount: amount,
          CategoryName: finalCategory,
          Date: form.Date,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to update expense");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-md">

        <h2 className="text-xl font-bold mb-4">Edit Expense</h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm text-gray-600">Description</label>
            <input
              value={form.Description}
              onChange={(e) => setForm({ ...form, Description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* AMOUNT */}
          <div>
            <label className="text-sm text-gray-600">Amount (₹)</label>
            <input
              type="number"
              value={form.Amount}
              onChange={(e) => setForm({ ...form, Amount: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              value={form.CategoryName}
              onChange={(e) => setForm({ ...form, CategoryName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              {mergedCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* CUSTOM CATEGORY */}
          {form.CategoryName === "Other" && (
            <div>
              <label className="text-sm text-gray-600">New Category</label>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter new category name"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          )}

          {/* DATE */}
          <div>
            <label className="text-sm text-gray-600">Date</label>
            <input
              type="date"
              value={form.Date}
              onChange={(e) => setForm({ ...form, Date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* SAVE */}
          <button
            onClick={handleSave}
            className="w-full bg-teal-700 text-white py-2 rounded-lg hover:bg-teal-800 transition"
          >
            Save Changes
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-500 text-sm hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
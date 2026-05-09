import { useEffect, useState } from "react";
import SmartInput from "../components/SmartInput/SmartInput";

const API_BASE = "http://127.0.0.1:8000";
const today = new Date().toISOString().split("T")[0];
const defaultGoalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")
    }`,
});

export default function Savings() {
  /* ---------------- STATE ---------------- */
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [goalMessages, setGoalMessages] = useState({});
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [savingAmount, setSavingAmount] = useState("");

  const [editingGoal, setEditingGoal] = useState(null);
  const [goalAlerts, setGoalAlerts] = useState({}); // goalId -> alert
  const [savingFeedback, setSavingFeedback] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: "",
    amount: "",
    date: defaultGoalDate,
    priority: "Medium",
    description: "",
  });
  const [savingError, setSavingError] = useState("");
  /* ---------------- FETCH GOALS ---------------- */
  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    const refreshGoals = () => fetchGoals();
    window.addEventListener("smartEntryAdded", refreshGoals);
    return () => window.removeEventListener("smartEntryAdded", refreshGoals);
  }, []);
  useEffect(() => {
  const saved = localStorage.getItem("goalMessages");
  if (saved) {
    setGoalMessages(JSON.parse(saved));
  }
}, []);
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/goals`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);

      // fetch alerts for each goal
      data.forEach((g) => fetchGoalAlert(g.GoalID));
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH ALERT PER GOAL ---------------- */
  const fetchGoalAlert = async (goalId) => {
    try {
      const res = await fetch(`${API_BASE}/goals/${goalId}/details`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      setGoalAlerts((prev) => {
        const updated = { ...prev };

        if (data?.alert) {
          updated[goalId] = data.alert;   // add/update alert
        } else {
          delete updated[goalId];         // remove old alert
        }

        return updated;
      });
    } catch (err) {
      console.error("Alert fetch failed", err);
    }
  };


  /* ---------------- SAVE / UPDATE GOAL ---------------- */
  const handleSaveGoal = async () => {
    if (!newGoal.name || !newGoal.amount || !newGoal.date) return;

    const body = {
      GoalName: newGoal.name,
      TargetAmount: newGoal.amount.toString(),
      TargetDate: `${newGoal.date}T00:00:00`,
      Priority: newGoal.priority,
      Description: newGoal.description,
    };

    const url = editingGoal
      ? `${API_BASE}/goals/${editingGoal.GoalID}`
      : `${API_BASE}/goals`;

    const method = editingGoal ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(
          editingGoal ? body : { ...body, CurrentAmount: "0" }
        ),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Save failed:", err);
        return;
      }

      // IMPORTANT: wait till backend confirms
      await res.json();

      // CLOSE MODAL AFTER SUCCESS
      setShowAddGoal(false);
      setEditingGoal(null);

      // RESET FORM
      setNewGoal({
        name: "",
        amount: "",
        date: defaultGoalDate,
        priority: "Medium",
        description: "",
      });

      // FORCE RE-FETCH (fresh data)
      await fetchGoals();
    } catch (err) {
      console.error("Save goal error:", err);
    }
  };

  /* ---------------- DELETE ---------------- */
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;

    try {
      await fetch(`${API_BASE}/goals/${goalToDelete.GoalID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setShowDeleteConfirm(false);
      setGoalToDelete(null);
      fetchGoals(); // refresh page data
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  /* ---------------- EDIT ---------------- */
  const openEditGoal = (goal) => {
    setEditingGoal({ ...goal });
    setNewGoal({
      name: goal.GoalName,
      amount: goal.TargetAmount,
      date: goal.TargetDate.split("T")[0],
      priority: goal.Priority,
      description: goal.Description || "",
    });
    setShowAddGoal(true);
  };

const handleAddSavings = async () => {
  if (!savingAmount || !selectedGoal) return;

  const remaining =
    Number(selectedGoal.TargetAmount) -
    Number(selectedGoal.CurrentAmount);

  if (Number(savingAmount) > remaining) {
    setSavingError(`You only need ₹${remaining} to complete this goal`);
    setSavingFeedback(null);
    return;
  }

  if (Number(savingAmount) <= 0) {
    setSavingError("Please enter a valid savings amount");
    setSavingFeedback(null);
    return;
  }

  setSavingError("");
  setSavingFeedback(null);

  const res = await fetch(
    `${API_BASE}/goals/${selectedGoal.GoalID}/contribute?amount=${savingAmount}`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );

  const data = await res.json();

  if (data.milestone) {
  const msg = data.milestone;

  setGoalMessages(prev => {
    const updated = {
      ...prev,
      [selectedGoal.GoalID]: msg
    };
    localStorage.setItem("goalMessages", JSON.stringify(updated));
    return updated;
  });

} else if (data.excess_alert) {
  const msg = data.excess_alert.message;

  setGoalMessages(prev => {
    const updated = {
      ...prev,
      [selectedGoal.GoalID]: msg
    };
    localStorage.setItem("goalMessages", JSON.stringify(updated));
    return updated;
  });

} else if (data.message) {
  const msg = data.message;

  setGoalMessages(prev => {
    const updated = {
      ...prev,
      [selectedGoal.GoalID]: msg
    };
    localStorage.setItem("goalMessages", JSON.stringify(updated));
    return updated;
  });
}

  setSavingAmount("");
  setShowAddSavings(false); 
  fetchGoals();
  fetchGoalAlert(selectedGoal.GoalID);
};

  /* ---------------- SUMMARY ---------------- */
  const activeGoals = goals.filter(g => !g.IsCompleted);
  const completedGoalsList = goals.filter(g => g.IsCompleted);
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.IsCompleted).length;
  const highPriority = goals.filter((g) => g.Priority === "High").length;
  const mediumPriority = goals.filter((g) => g.Priority === "Medium").length;
  const lowPriority = goals.filter((g) => g.Priority === "Low").length;
  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Savings Goals</h1>
        <button
          onClick={() => setShowAddGoal(true)}
          className="bg-teal-700 text-white px-5 py-2 rounded-lg font-semibold"
        >
          + Add Goal
        </button>
      </div>

      {/* SUMMARY BOARD */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-teal-600 to-blue-600 text-white mb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm opacity-80">Total Goals</p>
            <p className="text-3xl font-bold">{totalGoals}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Completed</p>
            <p className="text-3xl font-bold">{completedGoals}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">High Priority</p>
            <p className="text-3xl font-bold">{highPriority}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Medium Priority</p>
            <p className="text-3xl font-bold">{mediumPriority}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Low Priority</p>
            <p className="text-3xl font-bold">{lowPriority}</p>
          </div>
        </div>
      </div>

      {/* GOALS */}
{loading ? (
  <p className="text-center text-gray-500">Loading goals...</p>
) : (
  <>
    {/* ACTIVE GOALS */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {goals
        .filter(goal => !goal.IsCompleted)
        .map((goal) => {
          const progress = Math.min(
            100,
            Math.round(
              ((Number(goal.CurrentAmount) || 0) /
                Number(goal.TargetAmount)) *
              100
            )
          );

          const alert = goalAlerts[goal.GoalID];
          const message = goalMessages[goal.GoalID];
          return (
            <div
              key={goal.GoalID}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
            >
              {alert && (
                <div
                  className={`mb-3 rounded-xl p-3 text-sm font-medium ${
                    alert.type === "critical"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {alert.message}
                </div>
              )}
              {message && (
  <div className="mb-3 rounded-xl p-3 text-sm font-medium bg-green-100 text-green-700">
    {message}
  </div>
)}

              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {goal.GoalName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Goal started on {formatDate(goal.CreatedDate || today)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    goal.Priority === "High"
                      ? "bg-rose-100 text-rose-700"
                      : goal.Priority === "Low"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {goal.Priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Target
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    Rs.{goal.TargetAmount}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Saved
                  </p>
                  <p className="mt-2 text-xl font-bold text-teal-700">
                    Rs.{goal.CurrentAmount}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Target date: {formatDate(goal.TargetDate)}
                </span>
                {goal.CompletedDate && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    Completed: {formatDate(goal.CompletedDate)}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {progress}% completed
                </p>
              </div>

              {/* BUTTON */}
              <button
                disabled={goal.IsCompleted}
                onClick={() => {
                  if (goal.IsCompleted) return;
                  setSelectedGoal(goal);
                  setShowAddSavings(true);
                }}
                className={`mt-5 w-full rounded-xl border py-2.5 font-semibold transition
                  ${goal.IsCompleted
                    ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                    : "border-teal-600 text-teal-700 hover:bg-teal-50"
                  }`}
              >
                {goal.IsCompleted ? "Goal Completed" : "+ Add Savings"}
              </button>

              <div className="mt-4 flex justify-between text-sm">
                <button
                  onClick={() => openEditGoal(goal)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setGoalToDelete(goal);
                    setShowDeleteConfirm(true);
                  }}
                  className="font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
    </div>

    {/* COMPLETED GOALS */}
    {goals.some(g => g.IsCompleted) && (
      <>
        <h2 className="text-xl font-semibold text-white mt-10 mb-3">
          Completed Goals 🎉
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 opacity-70">
          {goals
            .filter(goal => goal.IsCompleted)
            .map((goal) => (
              <div
                key={goal.GoalID}
                className="rounded-2xl border border-gray-200 bg-gray-100 p-6"
              >
                <h3 className="text-xl font-semibold text-slate-900">
                  {goal.GoalName}
                </h3>

                <p className="text-sm text-gray-500">
                  Rs.{goal.CurrentAmount} / {goal.TargetAmount}
                </p>

                <p className="text-green-600 mt-2 font-medium">
                  Completed !!
                </p>

                <button
                  disabled
                  className="mt-4 w-full rounded-xl border py-2 text-gray-400 bg-gray-200 cursor-not-allowed"
                >
                  Goal Completed
                </button>
              </div>
            ))}
        </div>
      </>
    )}
  </>
)}

      {/* ADD GOAL MODAL */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-md relative">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => {
                setShowAddGoal(false);
                setEditingGoal(null);
                setSavingError("");
                
                setNewGoal({
                  name: "",
                  amount: "",
                  date: defaultGoalDate,
                  priority: "Medium",
                  description: "",
                });
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl font-bold"
            >
              x
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingGoal ? "Edit Goal" : "Add Goal"}
            </h2>

            {/* GOAL NAME — SmartInput */}
            <div className="mb-3">
              <SmartInput
                value={newGoal.name}
                onChange={(val) => setNewGoal({ ...newGoal, name: val })}
                placeholder="Goal Name (e.g. New Laptop)"
                allowFileUpload={false}
                allowCameraCapture={false}
              />
            </div>

            {/* TARGET AMOUNT — SmartInput */}
            <div className="mb-3">
              <SmartInput
                value={newGoal.amount}
                onChange={(val) => setNewGoal({ ...newGoal, amount: val })}
                placeholder="Target Amount (e.g. 50000)"
                allowFileUpload={false}
                allowCameraCapture={false}
              />
            </div>

            <input
              type="date"
              className="w-full border p-2 rounded mb-3 text-slate-900 bg-white"
              value={newGoal.date}
              min={today}
              onChange={(e) =>
                setNewGoal({ ...newGoal, date: e.target.value })
              }
            />

            <select
              className="w-full border p-2 rounded mb-3 text-slate-900 bg-white"
              value={newGoal.priority}
              onChange={(e) =>
                setNewGoal({ ...newGoal, priority: e.target.value })
              }
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            {/* DESCRIPTION — SmartInput */}
            <div className="mb-4">
              <SmartInput
                value={newGoal.description}
                onChange={(val) => setNewGoal({ ...newGoal, description: val })}
                placeholder="Description"
                multiline={true}
                rows={2}
                allowFileUpload={false}
                allowCameraCapture={false}
              />
            </div>
            <button
              onClick={handleSaveGoal}
              className="w-full bg-teal-700 text-white py-2 rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      )}
      {/* ADD SAVINGS MODAL */}
      {showAddSavings && selectedGoal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAddSavings(false)}
        >
          <div
            className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={() => {
                setShowAddSavings(false);
                setSavingAmount("");
                setNewGoal({
                  name: "",
                  amount: "",
                  date: defaultGoalDate,
                  priority: "Medium",
                  description: "",
                });
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl font-bold"
            >
              x
            </button>

            <h3 className="text-lg font-semibold mb-2">
              Add Savings
            </h3>

            {/* SAVINGS AMOUNT — SmartInput */}
            <div className="mb-4">
              <SmartInput
                value={savingAmount}
                onChange={setSavingAmount}
                placeholder="Amount (e.g. 2000)"
                allowFileUpload={false}
                allowCameraCapture={false}
              />
            </div>
              {savingError && (
  <p className="text-red-500 text-sm mt-1 font-medium">
    {savingError}
  </p>
)}

{savingFeedback && (
  <p
    className={`text-sm mt-1 font-medium ${
      savingFeedback.type === "critical"
        ? "text-red-600"
        : "text-green-600"
    }`}
  >
    {savingFeedback.message}
  </p>
)}
            <button
              onClick={handleAddSavings}
              className="w-full bg-teal-700 text-white py-2 rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      )}
      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && goalToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-sm relative">
            <h3 className="text-lg font-semibold mb-3">
              Delete Goal
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete
              <b> {goalToDelete.GoalName}</b>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setGoalToDelete(null);
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteGoal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
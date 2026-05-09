import { useEffect, useState } from "react";
import { User, Mail, Calendar, Award } from "lucide-react";
import EditableInfoCard from "../components/EditableInfoCard";
import ReportGenerator from "../components/Reports/ReportGenerator";

const BASE_URL = "http://localhost:8000";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(0);
  const [message, setMessage] = useState("");

  const [basic, setBasic] = useState({
    FullName: "",
    Username: "",
    Email: "",
    DateOfBirth: "",
    UserType: ""
  });

  const [monthlyIncome, setMonthlyIncome] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);
  useEffect(() => {
  if (message) {
    const timer = setTimeout(() => {
      setMessage("");
    }, 2500);

    return () => clearTimeout(timer);
  }
}, [message]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${BASE_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      setBasic(data);
      setMonthlyIncome(data.MonthlyIncome || "");

      calculateCompletion(data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateCompletion = (profile) => {
    const fields = [
      profile.FullName,
      profile.Username,
      profile.Email,
      profile.DateOfBirth,
      profile.UserType
    ];

    const filled = fields.filter(f => f).length;
    setCompletion(Math.round((filled / fields.length) * 100));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 w-full">

      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🔥 FULL WIDTH HEADER */}
        <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg p-8 flex justify-between items-center">

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-3xl font-bold">
              {basic.FullName?.charAt(0) || "U"}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white">
                {basic.FullName || "User"}
              </h1>
              <p className="text-slate-400">@{basic.Username}</p>
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                <Mail size={14} />
                {basic.Email}
              </p>
            </div>
          </div>
        </div>
        {message && (
          <div className="bg-teal-500/20 border border-teal-500 text-teal-300 px-4 py-2 rounded-xl text-sm">
            {message}
          </div>
        )}

        {/* 🔥 BELOW SPLIT */}
        <div className="w-full">

          {/* LEFT - PERSONAL INFO */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">

            <h2 className="text-xl font-semibold text-white mb-5">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* FULL NAME */}
              <div className="bg-slate-800/40 p-5 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Full Name</p>
                <p className="text-white font-semibold">
                  {basic.FullName || "Not provided"}
                </p>
              </div>

              {/* USERNAME EDIT */}
              <EditableInfoCard
                label="Username"
                value={basic.Username || ""}
                onSave={async (val) => {
                  const token = localStorage.getItem("token");

                  const res = await fetch(`${BASE_URL}/profile/update-username`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ Username: val })
                  });

                  const data = await res.json();

                  if (data.error) {
                    setMessage("Username already taken ❌");
                  } else {
                    setBasic(prev => ({ ...prev, Username: val }));
                    setMessage("Username updated ");
                  }
                }}
              />

              {/* EMAIL */}
              <div className="bg-slate-800/40 p-5 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Email</p>
                <p className="text-white font-semibold">
                  {basic.Email || "Not provided"}
                </p>
              </div>

              {/* DOB */}
              <div className="bg-slate-800/40 p-5 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Birth Date</p>
                <p className="text-white font-semibold">
                  {basic.DateOfBirth?.split("T")[0] || "Not provided"}
                </p>
              </div>

              {/* USER TYPE */}
              <div className="bg-slate-800/40 p-5 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">User Type</p>
                <p className="text-white font-semibold">
                  {basic.UserType || "Not provided"}
                </p>
              </div>

              {/* INCOME EDIT */}
              <EditableInfoCard
                label="Monthly Income"
                value={monthlyIncome || ""}
                type="number"
                onSave={async (val) => {
                  const token = localStorage.getItem("token");

                  await fetch(`${BASE_URL}/profile/update-income`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ MonthlyIncome: val })
                  });

                  setMonthlyIncome(val);
                  setMessage("Income updated ");
                }}
              />

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  User,
  LogOut,
  PiggyBank,
  Target,
  TrendingUp,
  LineChart,
  ChevronRight
} from "lucide-react";
import logo from "../finance_logo.png";

export default function Sidebar({ collapsed }) {

  // 🔥 USER TYPE GET (IMPORTANT)
  const userType = (localStorage.getItem("user_type") || "").toLowerCase();
  // expected: "student" or "working"

  const linkClass = ({ isActive }) =>
    `
    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
    ${
      isActive
        ? "bg-teal-500/15 text-teal-400 font-semibold border border-teal-500/25 shadow-sm shadow-teal-500/10"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
    }
    `;

  return (
    <aside
      className={`min-h-screen bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col transition-all duration-300
        ${collapsed ? "w-20 px-2" : "w-72 px-4"}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 py-6 ${collapsed ? 'justify-center' : 'px-2'}`}>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-teal-500/20">
          <img src={logo} alt="KharchaGuru logo" className="h-full w-full object-contain p-1" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            KharchaGuru
          </span>
        )}
      </div>

      <div className="h-px bg-slate-800/60 mx-2 mb-4" />

      <nav className="flex-1 space-y-1.5">
        <NavLink to="/dashboard" end className={linkClass}>
          <LayoutDashboard size={20} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink to="/dashboard/expenses" className={linkClass}>
          <Wallet size={20} />
          {!collapsed && <span>Expenses</span>}
        </NavLink>

        <NavLink to="/dashboard/budgets" className={linkClass}>
          <Target size={20} />
          {!collapsed && <span>Budget</span>}
        </NavLink>

        <NavLink to="/dashboard/savings" className={linkClass}>
          <PiggyBank size={20} />
          {!collapsed && <span>Saving Goals</span>}
        </NavLink>

        {/* 🔥 CONDITIONAL RENDERING */}
        {userType !== "student" && (
          <div className="pt-2">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-600 uppercase px-4 mb-2">
                Financial Tools
              </p>
            )}

            <div className="space-y-1.5">
              <NavLink to="/dashboard/tax" className={linkClass}>
                <TrendingUp size={20} />
                {!collapsed && <span>Tax Estimator</span>}
              </NavLink>

              <NavLink to="/dashboard/investments" className={linkClass}>
                <LineChart size={20} />
                {!collapsed && <span>Investment Advisor</span>}
              </NavLink>
            </div>
          </div>
        )}

        <NavLink to="/dashboard/profile" className={linkClass}>
          <User size={20} />
          {!collapsed && <span>Profile</span>}
        </NavLink>
      </nav>

      <div className="h-px bg-slate-800/60 mx-2 mb-4" />

      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
        className={`flex items-center gap-3 px-4 py-3 mb-4 text-red-400 hover:bg-red-500/10 rounded-xl ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut size={20} />
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}
import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Profile = lazy(() => import("./pages/Profile"));
const Savings = lazy(() => import("./pages/Savings"));
const Budget = lazy(() => import("./pages/Budgets"));
const TaxEstimator = lazy(() => import("./pages/TaxEstimator"));
const InvestmentRecommendation = lazy(() => import("./pages/Investment"));
const Landing = lazy(() => import("./pages/Landing"));
export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400">Loading KharchaGuru...</p>
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="profile" element={<Profile />} />
          <Route path="savings" element={<Savings />} />
          <Route path="budgets" element={<Budget />} />
          <Route path="tax" element={<TaxEstimator />} />
          <Route path="investments" element={<InvestmentRecommendation />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

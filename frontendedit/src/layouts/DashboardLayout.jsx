import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="flex h-screen bg-slate-950">

      {/* Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onToggle={() => setCollapsed(!collapsed)} />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

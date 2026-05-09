import { Link } from "react-router-dom";
import logo from "../../finance_logo.png";
import "../../pages/Landing.css"; // Reuse landing animations and utilities

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans overflow-x-hidden selection:bg-teal-500/30 relative z-0">
      {/* Dynamic Background (Optimized) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(13,148,136,0.15)_0%,_transparent_70%)] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.15)_0%,_transparent_70%)] rounded-full animate-pulse-glow delay-200" />
      </div>

      {/* Main Container tailored for proper scrolling */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 relative z-10 w-full">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Header Section */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-lg shadow-teal-500/20 hover:scale-105 transition-transform cursor-pointer overflow-hidden p-2">
              <img src={logo} alt="KharchaGuru Logo" className="w-full h-full object-contain" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              KharchaGuru
            </h1>
            <p className="text-slate-400 mt-2 font-light">{subtitle}</p>
          </div>

          {/* Card Section */}
          <div className="glass-card rounded-2xl shadow-xl shadow-black/50 p-6 sm:p-8 animate-fade-in-up delay-100">
            <h2 className="text-2xl font-semibold mb-6 text-white tracking-tight">{title}</h2>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

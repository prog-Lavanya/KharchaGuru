import { ArrowRight, Calculator, TrendingUp, PieChart } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logo from '../finance_logo.png';
import './Landing.css';

function AnimatedLogo() {
  const text = "kharchaguru";
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-visible text-center cursor-pointer px-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="text-[4rem] md:text-[6rem] lg:text-[8rem] tracking-tight leading-none lowercase font-serif font-light inline-flex flex-wrap justify-center">
        {text.split("").map((char, i) => (
          <span
            key={i}
            className="inline-block transition-all duration-500 ease-out"
            style={{
              transitionDelay: `${i * 40}ms`,
              transform: isHovered
                ? "scale(1.08) translateY(-4px)"
                : isInView
                  ? "scale(1) translateY(0)"
                  : "scale(0.7) translateY(20px)",
              opacity: isHovered ? 1 : isInView ? 0.4 : 0,
              color: isHovered
                ? `hsl(${168 + i * 5}, 60%, ${55 + i * 2}%)`
                : 'hsl(180, 20%, 50%)',
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h2>
    </div>
  );
}



export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Dynamic Background Orbs (Optimized) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(13,148,136,0.15)_0%,_transparent_70%)] rounded-full" />
        <div className="absolute bottom-[-10%] right-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.15)_0%,_transparent_70%)] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_rgba(45,212,191,0.08)_0%,_transparent_70%)] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-slate-950/80 backdrop-blur-lg shadow-lg border-b border-white/5'
        : 'bg-transparent'
        }`}>
        <div className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 animate-fade-in-up">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-lg shadow-teal-500/20 overflow-hidden">
              <img src={logo} alt="KharchaGuru" className="w-full h-full object-contain p-1" />
            </div>
            <Link
              to="/dashboard"
              className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
            >
              KharchaGuru
            </Link>
          </div>

          <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-400 animate-fade-in-up delay-100">
            <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
            <a href="#contact" className="hover:text-white transition-colors duration-200">Contact</a>
          </div>

          <div className="flex items-center gap-4 animate-fade-in-up delay-200">
            <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 px-5 py-2.5 rounded-full shadow-lg shadow-teal-600/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-20" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center animate-fade-in-up delay-300">

        {/* Left - Image */}
        <div className="relative h-[500px] w-full flex justify-center items-center order-2 lg:order-1">
          <div className="relative w-full h-full flex justify-center items-center">
            {/* Glow behind image (Optimized) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,_rgba(20,184,166,0.25)_0%,_transparent_60%)] rounded-full" />
            </div>
            <img
              src="/money.PNG"
              className="w-full h-full object-contain relative z-10 drop-shadow-2xl animate-float"
              alt="Finance illustration"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Right - Content */}
        <div className="max-w-xl order-1 lg:order-2">
          <h1 className="text-5xl lg:text-[60px] font-extrabold leading-tight mb-6 tracking-tight animate-fade-in-up delay-400">
            <span className="block text-white">KharchaGuru:</span>
            <span className="block mt-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
              Your Personal<br />Financial Assistant
            </span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 leading-relaxed font-light animate-fade-in-up delay-500">
            Take control of your finances entirely with KharchaGuru — a powerful financial management tool right at your fingertips.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12 animate-fade-in-up delay-500">
            <Link
              to="/signup"
              className="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-full shadow-xl shadow-teal-600/20 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-transparent border border-slate-700 hover:bg-slate-800/50 hover:border-slate-600 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              Try KharchaGuru Now
            </Link>
          </div>


        </div>
      </section>

      {/* Browser Mockup Section */}
      <section id="features" className="relative z-10 py-20 px-8 max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything you need to manage your finances
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From expense tracking to tax estimations — all in one beautiful dashboard.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="flex flex-col items-center gap-3 glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 cursor-default">
            <div className="p-3 bg-teal-500/10 rounded-2xl mb-1 text-teal-400 shrink-0 shadow-inner shadow-teal-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Tax Estimator</h3>
            <p className="text-sm text-slate-400 text-center">Accurately calculate and plan your taxes in real-time.</p>
          </div>

          <div className="flex flex-col items-center gap-3 glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 cursor-default">
            <div className="p-3 bg-emerald-500/10 rounded-2xl mb-1 text-emerald-400 shrink-0 shadow-inner shadow-emerald-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Investment Advisor</h3>
            <p className="text-sm text-slate-400 text-center">AI-powered insights to help you grow your wealth smartly.</p>
          </div>

          <div className="flex flex-col items-center gap-3 glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 cursor-default">
            <div className="p-3 bg-teal-600/10 rounded-2xl mb-1 text-teal-500 shrink-0 shadow-inner shadow-teal-600/20">
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Smart Tracking</h3>
            <p className="text-sm text-slate-400 text-center">Log expenses via voice, receipt OCR, or manual entry.</p>
          </div>
        </div>

        {/* Dark Browser Mockup */}
        <div className="w-full glass-card border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
          {/* Browser Chrome */}
          <div className="bg-slate-900/80 border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-amber-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
            </div>
            <div className="bg-slate-800/80 border border-white/5 rounded-md py-1 px-16 text-xs text-slate-500 flex items-center justify-center">
              <span className="text-teal-400 mr-2">/</span> kharchaguru.xyz
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-400 items-center">
              <div className="bg-teal-600/20 text-teal-400 px-3 py-1 rounded-full border border-teal-500/20">Dashboard</div>
            </div>
          </div>

          {/* Mock Dashboard */}
          <div className="h-80 bg-slate-950 flex">
            {/* Sidebar */}
            <div className="w-56 bg-slate-900/60 border-r border-white/5 p-4 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="text-slate-100 text-sm font-semibold px-3 py-2 bg-teal-500/10 rounded-lg border border-teal-500/20 text-teal-400">Dashboard</div>
                <div className="text-slate-500 text-sm px-3 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all">Budgets</div>
                <div className="text-slate-500 text-sm px-3 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all">Expenses</div>
                <div className="text-slate-500 text-sm px-3 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all">Tax Estimator</div>
                <div className="text-slate-500 text-sm px-3 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-all">Investments</div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-lg border border-white/5">
                <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400 text-sm font-semibold">U</div>
                <div className="text-slate-300 text-sm font-medium">Profile</div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 bg-gradient-to-br from-slate-950 to-slate-900">
              <div className="grid grid-cols-3 gap-4 h-full">
                <div className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-400">Monthly Expenses</h3>
                  </div>
                  <div className="flex items-end justify-between h-24 gap-1">
                    <div className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t opacity-80" style={{ height: '60%' }} />
                    <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t opacity-80" style={{ height: '80%' }} />
                    <div className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t opacity-80" style={{ height: '45%' }} />
                    <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t opacity-80" style={{ height: '70%' }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] text-slate-600">
                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-400">Budget Overview</h3>
                  </div>
                  <div className="flex items-center justify-center h-24">
                    <div className="relative w-20 h-20">
                      <svg className="transform -rotate-90" width="80" height="80">
                        <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                        <circle cx="40" cy="40" r="32" stroke="#2dd4bf" strokeWidth="8" fill="none"
                          strokeDasharray="201" strokeDashoffset="50" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-teal-400">75%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3 mt-2 text-[8px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-teal-500 rounded-full" />
                      <span className="text-slate-500">Spent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-700 rounded-full" />
                      <span className="text-slate-500">Left</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-400">Reports</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/30 rounded text-[9px] border border-white/5">
                      <div className="w-6 h-6 bg-teal-500/10 rounded flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2H8V8H2V2Z" stroke="#2dd4bf" strokeWidth="1" fill="none" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-300">Monthly Report</p>
                        <p className="text-slate-500">2.4 MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-800/30 rounded text-[9px] border border-white/5">
                      <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2H8V8H2V2Z" stroke="#10b981" strokeWidth="1" fill="none" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-300">Analytics</p>
                        <p className="text-slate-500">1.8 MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            to="/signup"
            className="group inline-flex items-center bg-teal-600 hover:bg-teal-500 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all shadow-xl shadow-teal-600/20 hover:shadow-teal-500/40 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Try KharchaGuru Now
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 py-16 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <AnimatedLogo />
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-sm text-slate-600">
            <p>© {new Date().getFullYear()} KHARCHAGURU. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#contact" className="hover:text-slate-300 transition-colors">Contact</a>
              <a href="#privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

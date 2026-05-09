import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import AuthLayout from "./AuthLayout";
const BASE_URL = "http://localhost:8000/auth";
export default function LoginPage({ onSwitchToSignup, onLoginSuccess }) {
  const [identifier, setIdentifier] = useState(""); // Can be username or email
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!identifier || !password) {
      setMessage("Please enter both username/email and password");
      setIsError(true);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Identifier: identifier, // Changed from Username to Identifier
          Password: password,
        }),
      });
      const data = await response.json();
      if (response.ok && data.access_token) {
        setMessage("Successfully Logged In!");
        setIsError(false);
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userId", data.UserId);
        localStorage.setItem("username", data.Username);
        localStorage.setItem("email", data.mailId);
        localStorage.setItem("user_type", data.UserType.toLowerCase());
        // Redirect to dashboard or home page after 1 second
        setTimeout(() => {
          onLoginSuccess();
          // Add your navigation logic here
          // e.g., window.location.href = "/dashboard";
          // or use React Router: navigate("/dashboard");
        }, 100);

      } else {
        // Handle error response
        setMessage(data.detail || "Invalid credentials");
        setIsError(true);
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Server error. Please try again later.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Login" subtitle="Welcome Back">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Message Display */}
        {message && (
          <div
            className={`p-3 rounded-lg text-center text-sm font-medium ${isError
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
          >
            {message}
          </div>
        )}

        {/* Email / Username Input */}
        <div className="relative group">
          <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full pl-10 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-400 transition-all font-light"
            placeholder="Email or Username"
            required
            disabled={loading}
          />
        </div>

        {/* Password Input */}
        <div className="relative group">
          <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-400 transition-all font-light"
            placeholder="Password"
            required
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-5 py-3 text-sm font-semibold text-white transition-all duration-200 bg-teal-600 border border-transparent rounded-xl hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-teal-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Authenticating..." : "Sign in"}
        </button>

        {/* Switch to Signup */}
        <p className="text-center text-sm text-slate-400 font-light">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-teal-400 font-medium hover:text-teal-300 transition-colors"
          >
            Create one
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
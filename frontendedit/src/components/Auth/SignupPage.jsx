import { HelpCircle, Lock, Mail } from "lucide-react";
import { useState } from "react";
import AuthLayout from "./AuthLayout";

const BASE_URL = "https://kharchaguru-0cgi.onrender.com/auth";

export default function SignupPage({ onSwitchToLogin }) {

  const usernameRegex = /^[a-zA-Z0-9._]+$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^()_\-+=])[A-Za-z\d@$!%*#?&^()_\-+=]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [formData, setFormData] = useState({
    mailId: "",
    username: "",
    firstName: "",
    lastName: "",
    UserType: "",
    dateOfBirth: "",
    password: "",
    securityQuestion: "",
    securityAnswer: ""
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dobError, setDobError] = useState("");

  const securityQuestions = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What city were you born in?"
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ AGE VALIDATION
  const isValidAge = (dob) => {
    if (!dob) return false;

    const [year, month, day] = dob.split("-").map(Number);
    const birthDate = new Date(year, month - 1, day);

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 15 && age <= 100;
  };

  const handleSubmit = async () => {

    setErrorMessage("");
    setSuccessMessage("");
    setDobError("");

    if (
      !formData.mailId ||
      !formData.username ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.dateOfBirth ||
      !formData.password ||
      !formData.UserType ||
      !formData.securityQuestion ||
      !formData.securityAnswer
    ) {
      setErrorMessage("Please fill all mandatory fields");
      return;
    }

    // ✅ DOB VALIDATION
    if (!isValidAge(formData.dateOfBirth)) {
      setDobError("Age must be between 15 and 100 years");
      return;
    }

    // EMAIL
    if (!emailRegex.test(formData.mailId)) {
      setEmailError("Enter a valid email address");
      return;
    } else {
      setEmailError("");
    }

    // USERNAME
    if (!usernameRegex.test(formData.username)) {
      setUsernameError("Username can only contain letters, numbers, . and _");
      return;
    } else {
      setUsernameError("");
    }

    // PASSWORD
    if (!passwordRegex.test(formData.password)) {
      setPasswordError("Password must include letter, number & special character");
      return;
    } else {
      setPasswordError("");
    }

    if (formData.password.length > 72) {
      setErrorMessage("Password too long (max 72 characters allowed)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        mailId: formData.mailId,
        Username: formData.username,
        FirstName: formData.firstName,
        LastName: formData.lastName,
        UserType: formData.UserType,
        DateOfBirth: new Date(formData.dateOfBirth).toISOString(),
        Password: formData.password,
        SecurityQuestion: formData.securityQuestion,
        SecurityAnswer: formData.securityAnswer
      };
      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail?.[0]?.msg ||
          data.detail ||
          "Signup failed"
        );
      }
      setSuccessMessage("Account created successfully! Redirecting...");
       setFormData({
        mailId: "",
        username: "",
        firstName: "",
        lastName: "",
        UserType: "",
        dateOfBirth: "",
        password: "",
        securityQuestion: "",
        securityAnswer: ""
      });
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);

    } catch (error) {
      setErrorMessage(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DATE LIMITS (ADDED)
  const today = new Date();
  const maxDate = new Date(today.setFullYear(today.getFullYear() - 15))
    .toISOString()
    .split("T")[0];

  const minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 100))
    .toISOString()
    .split("T")[0];

  return (
    <AuthLayout title="Create Account">
      <div className="space-y-5">

        {/* Email */}
        <div>
          <div className="relative group">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
            <input
              type="email"
              value={formData.mailId}
              onChange={(e) => {
                const val = e.target.value;
                handleChange("mailId", val);

                if (!emailRegex.test(val)) {
                  setEmailError("Enter a valid email");
                } else {
                  setEmailError("");
                }
              }}
              className="w-full pl-10 px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
              placeholder="Email *"
            />
          </div>
          {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
        </div>

        {/* Username */}
        <div>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => {
              const val = e.target.value;
              handleChange("username", val);

              if (!usernameRegex.test(val)) {
                setUsernameError("Only letters, numbers, . and _ allowed");
              } else {
                setUsernameError("");
              }
            }}
            className="w-full px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
            placeholder="Username *"
          />
          {usernameError && <p className="text-red-400 text-sm mt-1">{usernameError}</p>}
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="First Name"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            className="w-full px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className="w-full px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
          />
        </div>

        {/* User Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            User Category *
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() =>
                setFormData({ ...formData, UserType: "student" })
              }
              className={`cursor-pointer p-4 border rounded-xl text-center
                ${formData.UserType === "student"
                  ? "border-teal-500 bg-teal-600/10 text-white"
                  : "border-slate-700/50 bg-slate-900/50 text-slate-400"
                }`}
            >
              🎓
              <p className="mt-2">Student</p>
            </div>

            <div
              onClick={() =>
                setFormData({ ...formData, UserType: "working" })
              }
              className={`cursor-pointer p-4 border rounded-xl text-center
                ${formData.UserType === "working"
                  ? "border-teal-500 bg-teal-600/10 text-white"
                  : "border-slate-700/50 bg-slate-900/50 text-slate-400"
                }`}
            >
              💼
              <p className="mt-2">Working</p>
            </div>
          </div>
        </div>

        {/* DOB */}
        <div>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => {
              const val = e.target.value;
              handleChange("dateOfBirth", val);

              if (!val) {
                setDobError("");
                return;
              }

                if (!isValidAge(val)) {
                  setDobError("Age must be between 15 and 100 years");
                } else {
                  setDobError("");
                }
        }}
            min={minDate}
            max={maxDate}
            className="w-full px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
          />
          {dobError && <p className="text-red-400 text-sm mt-1">{dobError}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="relative group">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => {
                const val = e.target.value;
                handleChange("password", val);

                if (!passwordRegex.test(val)) {
                  setPasswordError("Must include letter, number & special char");
                } else {
                  setPasswordError("");
                }
              }}
              className="w-full pl-10 px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
              placeholder="Password *"
            />
          </div>
          {passwordError && <p className="text-red-400 text-sm mt-1">{passwordError}</p>}
        </div>

        {/* Security Question */}
        <select
          value={formData.securityQuestion}
          onChange={(e) => handleChange("securityQuestion", e.target.value)}
          className="w-full px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
        >
          <option value="">Select Security Question *</option>
          {securityQuestions.map((q, i) => (
            <option key={i} value={q}>{q}</option>
          ))}
        </select>

        {/* Security Answer */}
        <input
          type="text"
          value={formData.securityAnswer}
          onChange={(e) => handleChange("securityAnswer", e.target.value)}
          className="w-full px-4 py-2 border rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
          placeholder="Security Answer *"
        />

        {/* Messages */}
        {errorMessage && <div className="text-red-400 text-sm">{errorMessage}</div>}
        {successMessage && <div className="text-green-400 text-sm">{successMessage}</div>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 bg-teal-600 rounded-xl text-white"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

      </div>
    </AuthLayout>
  );
}
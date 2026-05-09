// import React from "react";
// import LoginPage from "../components/Auth/LoginPage";

// export default function Login({ onSwitchToSignup }) {
//   return <LoginPage onSwitchToSignup={onSwitchToSignup} />;
// }
import LoginPage from "../components/Auth/LoginPage";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  return (
    <LoginPage
      onLoginSuccess={() => navigate("/dashboard")}
      onSwitchToSignup={() => navigate("/signup")}
    />
  );
}


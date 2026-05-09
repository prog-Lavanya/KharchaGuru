import SignupPage from "../components/Auth/SignupPage";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  return (
    <SignupPage
      onSwitchToLogin={() => navigate("/login")}
    />
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { ChatPage } from "./features/chat/ChatPage";
import { ProfileSetupPage } from "./features/auth/ProfileSetupPage";
import { useSession } from "./state/session";
import { Shell } from "./components/Shell";

function LandingRedirect() {
  const { session } = useSession();
  return <Navigate to={session ? "/app" : "/auth/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/setup" element={<ProfileSetupPage />} />
      <Route
        path="/app/*"
        element={
          <AuthGuard>
            <Shell>
              <Routes>
                <Route path="" element={<ChatPage />} />
                <Route path="*" element={<ChatPage />} />
              </Routes>
            </Shell>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

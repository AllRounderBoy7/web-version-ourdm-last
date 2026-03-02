import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/state/session";

type Props = {
  children: ReactNode;
};

export function AuthGuard({ children }: Props) {
  const { session, ready } = useSession();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full border-b-2 border-cyan-400 h-10 w-10" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

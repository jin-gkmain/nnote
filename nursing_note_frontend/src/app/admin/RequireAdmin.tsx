import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { ROUTES } from "@/app/navigation/routes";

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * 관리자 라우트: 미로그인 → 로그인, 비관리자 → 홈.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, token, isReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      navigate(ROUTES.login, { replace: true, state: { from: location.pathname } });
      return;
    }
    if (user?.role !== "admin") {
      navigate(ROUTES.home, { replace: true });
    }
  }, [isReady, token, user?.role, navigate, location.pathname]);

  if (!isReady || !token || user?.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        권한 확인 중…
      </div>
    );
  }

  return <>{children}</>;
}

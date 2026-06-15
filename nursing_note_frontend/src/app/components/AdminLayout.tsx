import { Calendar } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { RequireAdmin } from "@/app/admin/RequireAdmin";
import { AdminSidebar } from "@/app/components/AdminSidebar";
import { AdminBottomNav } from "@/app/components/AdminBottomNav";
import { SidebarMenuIcon } from "@/app/components/SidebarMenuIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useAuth } from "@/app/auth/auth-context";
import { ROUTES } from "@/app/navigation/routes";
import { formatTodayYmd } from "@/app/utils/formatTodayYmd";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const todayYmd = formatTodayYmd();
  const showToday = location.pathname === ROUTES.home;
  const closeDrawer = () => setSidebarOpen(false);

  return (
    <RequireAdmin>
      <div className="flex h-dvh min-h-0 w-full flex-row overflow-hidden bg-white">
        <AdminSidebar sidebarOpen={sidebarOpen} onCloseDrawer={closeDrawer} />

        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
            onClick={closeDrawer}
            aria-hidden
          />
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          <header className="hidden min-h-[52px] shrink-0 items-center bg-white px-4 pt-[max(0px,env(safe-area-inset-top))] pb-2 md:h-[60px] md:px-6 md:py-0 md:pt-0 lg:flex">
            <div className="flex w-10 shrink-0 justify-start lg:hidden">
              {!sidebarOpen ? (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="min-h-11 min-w-11 select-none rounded-lg p-2.5 transition-[transform,background-color] duration-150 ease-out hover:bg-gray-100 active:scale-95 active:bg-gray-200/90 md:min-h-0 md:min-w-0 md:p-2"
                  aria-label="메뉴 열기"
                >
                  <SidebarMenuIcon name="openSidebar" className="!h-6 !w-6" />
                </button>
              ) : (
                <span className="inline-block h-10 w-10 shrink-0" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Link
                to={ROUTES.home}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                일반 모드로 전환
              </Link>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-blue-600 text-white transition-opacity hover:opacity-90"
                      aria-label="사용자 프로필"
                    >
                      <SidebarMenuIcon name="userProfile" variant="onPrimary" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[10rem]">
                    <DropdownMenuItem onSelect={() => logout()}>
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </header>
          {showToday ? (
            <div className="bg-white px-4 py-2 md:px-6">
              <div className="flex justify-end">
                <div
                  className="pointer-events-none inline-flex select-none items-center gap-1.5 rounded-sm border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm sm:gap-2 sm:px-4"
                  role="status"
                  aria-label={`오늘 날짜 ${todayYmd}`}
                >
                  <Calendar
                    className="h-4 w-4 shrink-0 text-gray-500"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="text-sm font-bold tracking-wide text-gray-800">
                    TODAY
                  </span>
                  <span className="text-xs text-gray-600 tabular-nums sm:text-sm">
                    {todayYmd}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <main className="flex-1 overflow-y-auto overscroll-contain bg-[#f9fafb] px-[clamp(1rem,5vw,1.5rem)] pb-[calc(88px+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:px-8 lg:bg-white lg:px-10 lg:py-10">
            <Outlet />
          </main>
          <AdminBottomNav />
        </div>
      </div>
    </RequireAdmin>
  );
}

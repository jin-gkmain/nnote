import { Calendar } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { AppSidebar } from "@/app/components/AppSidebar";
import { SidebarMenuIcon } from "@/app/components/SidebarMenuIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ROUTES } from "@/app/navigation/routes";
import { formatTodayYmd } from "@/app/utils/formatTodayYmd";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const todayYmd = formatTodayYmd();
  const showToday = location.pathname === ROUTES.home;

  const closeDrawer = () => setSidebarOpen(false);

  return (
    <div className="flex h-dvh min-h-0 w-full flex-row overflow-hidden bg-white">
      <AppSidebar
        sidebarOpen={sidebarOpen}
        onCloseDrawer={closeDrawer}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={closeDrawer}
          aria-hidden
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <header className="flex min-h-[52px] shrink-0 items-center bg-white px-4 pt-[max(0px,env(safe-area-inset-top))] pb-2 md:h-[60px] md:px-6 md:py-0 md:pt-0">
          <div className="flex w-10 shrink-0 justify-start lg:hidden">
            {!sidebarOpen ? (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="select-none rounded-lg p-2.5 transition-[transform,background-color] duration-150 ease-out hover:bg-gray-100 active:scale-95 active:bg-gray-200/90 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-2"
                aria-label="메뉴 열기"
              >
                <SidebarMenuIcon
                  name="openSidebar"
                  className="!h-6 !w-6"
                />
              </button>
            ) : (
              <span className="inline-block h-10 w-10 shrink-0" aria-hidden />
            )}
          </div>
          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
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
                  {user.role === "admin" ? (
                    <>
                      <DropdownMenuItem onSelect={() => navigate(ROUTES.adminRoot)}>
                        관리자 페이지로 이동
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem onSelect={() => logout()}>
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to={ROUTES.login}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                로그인
              </Link>
            )}
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

        <main className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

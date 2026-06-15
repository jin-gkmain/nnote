import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { AppSidebar } from "@/app/components/AppSidebar";
import { SidebarMenuIcon } from "@/app/components/SidebarMenuIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ROUTES } from "@/app/navigation/routes";
import {
  getSidebarActiveId,
  type SidebarNavId,
} from "@/app/navigation/sidebarNav";

const bottomNavItems: {
  id: SidebarNavId;
  path: string;
  icon: Parameters<typeof SidebarMenuIcon>[0]["name"];
  label: string;
}[] = [
  { id: "home", path: ROUTES.home, icon: "home", label: "홈" },
  { id: "voice", path: ROUTES.voice, icon: "voiceRecord", label: "음성기록" },
  { id: "ocr", path: ROUTES.ocr, icon: "textOCR", label: "OCR" },
  { id: "records", path: ROUTES.records, icon: "recordsList", label: "기록목록" },
  { id: "settings", path: ROUTES.settings, icon: "userProfile", label: "내정보" },
];

function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = getSidebarActiveId(location.pathname);

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 min-h-[80px] w-full max-w-[393px] -translate-x-1/2 border-t border-[#E5E7EB] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_12px_rgba(17,24,39,0.06)] backdrop-blur lg:hidden">
      <div className="mx-auto grid h-[63px] grid-cols-5">
        {bottomNavItems.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? "text-[#2563EB]" : "text-[#6B7280] hover:text-[#111827]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <SidebarMenuIcon
                name={item.icon}
                variant={active ? "menuActive" : "menu"}
                className="!h-6 !w-6"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh min-h-0 w-full flex-row overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <div className="hidden lg:block">
        <AppSidebar
          sidebarOpen={false}
          onCloseDrawer={() => undefined}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F9FAFB]">
        <header className="hidden min-h-[64px] shrink-0 items-center border-b border-[#E5E7EB] bg-white px-6 lg:flex">
          <div className="text-sm font-semibold text-[#6B7280]">NNote</div>
          <div className="flex flex-1 items-center justify-end gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#3B82F6] text-white transition-opacity hover:opacity-90"
                    aria-label="사용자 프로필"
                  >
                    <SidebarMenuIcon name="userProfile" variant="onPrimary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[10rem]">
                  <DropdownMenuItem onSelect={() => navigate(ROUTES.settings)}>
                    내 정보
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => logout()}>
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to={ROUTES.login}
                className="text-sm font-medium text-[#2563EB] hover:underline"
              >
                로그인
              </Link>
            )}
          </div>
        </header>

        <main className="mobile-safe-bottom mx-auto w-full max-w-[393px] flex-1 overflow-y-auto overscroll-contain px-5 pt-[max(1.5rem,env(safe-area-inset-top))] lg:max-w-none lg:px-10 lg:py-10 lg:pb-10">
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </div>
  );
}

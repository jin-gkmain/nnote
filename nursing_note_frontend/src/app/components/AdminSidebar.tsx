import type { ReactNode } from "react";
import { FileStack, Home, MessageSquareText, Settings, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import {
  getAdminSidebarActiveId,
  type AdminSidebarNavId,
} from "@/app/navigation/admin-sidebar-nav";
import { ROUTES } from "@/app/navigation/routes";

type AdminSidebarProps = {
  sidebarOpen: boolean;
  onCloseDrawer: () => void;
};

function NavItem({
  id,
  activeId,
  path,
  onNavigate,
  icon,
  label,
}: {
  id: AdminSidebarNavId;
  activeId: AdminSidebarNavId;
  path: string;
  onNavigate: (path: string) => void;
  icon: ReactNode;
  label: ReactNode;
}) {
  const active = activeId === id;
  return (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      className={
        active
          ? "flex flex-col items-center gap-1 text-white"
          : "flex flex-col items-center gap-1 text-white/85 hover:text-white"
      }
    >
      <div
        className={
          active
            ? "flex h-[50px] w-[50px] items-center justify-center rounded-[5px] bg-white/20 ring-1 ring-white/35 shadow-sm"
            : "flex h-[50px] w-[50px] items-center justify-center rounded-[5px] transition-colors hover:bg-white/10"
        }
      >
        {icon}
      </div>
      <span
        className={
          active
            ? "text-center text-[10px] font-semibold leading-tight text-white"
            : "text-center text-[10px] leading-tight text-white/85"
        }
      >
        {label}
      </span>
    </button>
  );
}

export function AdminSidebar({ sidebarOpen, onCloseDrawer }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeId = getAdminSidebarActiveId(pathname);

  const go = (path: string) => {
    navigate(path);
    onCloseDrawer();
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 hidden h-full w-[88px] shrink-0 flex-col items-stretch border-r border-slate-700 bg-[#1F2937] pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:static lg:flex lg:w-[100px] lg:translate-x-0 lg:pt-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex w-full min-h-[72px] shrink-0 flex-col items-center justify-center px-2 pt-2 pb-2 lg:min-h-[96px] lg:pt-4">
        <div className="hidden w-full justify-center lg:flex">
          <div className="relative mx-auto h-9 w-9 overflow-hidden sm:w-10 lg:h-10 lg:w-10">
            <img
              src={logoImg}
              alt=""
              className="absolute inset-y-0 left-0 h-full object-cover object-left brightness-0 invert"
            />
          </div>
        </div>
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] select-none items-center justify-center rounded-lg text-gray-200 transition-[transform,background-color] duration-150 ease-out hover:bg-slate-700 active:scale-95 active:bg-slate-600 lg:hidden"
          aria-label="사이드바 닫기"
          onClick={onCloseDrawer}
        >
          <X className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-y-auto px-1 py-2">
        <NavItem
          id="home"
          activeId={activeId}
          path={ROUTES.adminRoot}
          onNavigate={go}
          icon={<Home className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />}
          label="HOME"
        />
        <NavItem
          id="team"
          activeId={activeId}
          path={ROUTES.adminTeam}
          onNavigate={go}
          icon={<Users className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />}
          label={
            <>
              팀원
              <br />
              관리
            </>
          }
        />
        <NavItem
          id="templates"
          activeId={activeId}
          path={ROUTES.adminTemplates}
          onNavigate={go}
          icon={<FileStack className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />}
          label="템플릿"
        />
        <NavItem
          id="inquiries"
          activeId={activeId}
          path={ROUTES.adminInquiries}
          onNavigate={go}
          icon={<MessageSquareText className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />}
          label="문의사항"
        />
        <NavItem
          id="settings"
          activeId={activeId}
          path={ROUTES.adminSettings}
          onNavigate={go}
          icon={<Settings className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />}
          label="내정보"
        />
      </div>
    </div>
  );
}

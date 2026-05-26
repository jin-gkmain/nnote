import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarMenuIcon } from "@/app/components/SidebarMenuIcon";
import logoImg from "@/assets/logo.png";
import { ROUTES } from "@/app/navigation/routes";
import {
  getSidebarActiveId,
  type SidebarNavId,
} from "@/app/navigation/sidebarNav";

type AppSidebarProps = {
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
  id: SidebarNavId;
  activeId: SidebarNavId;
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

export function AppSidebar({ sidebarOpen, onCloseDrawer }: AppSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeId = getSidebarActiveId(pathname);

  const go = (path: string) => {
    navigate(path);
    onCloseDrawer();
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 flex h-full w-[88px] shrink-0 flex-col items-stretch border-r border-slate-700 bg-[#1F2937] pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:static lg:w-[100px] lg:translate-x-0 lg:pt-0 ${
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
          path={ROUTES.home}
          onNavigate={go}
          icon={
            <SidebarMenuIcon
              name="home"
              variant="onPrimary"
            />
          }
          label="HOME"
        />
        <NavItem
          id="voice"
          activeId={activeId}
          path={ROUTES.voice}
          onNavigate={go}
          icon={
            <SidebarMenuIcon
              name="voiceRecord"
              variant="onPrimary"
            />
          }
          label="음성기록"
        />
        <NavItem
          id="ocr"
          activeId={activeId}
          path={ROUTES.ocr}
          onNavigate={go}
          icon={
            <SidebarMenuIcon
              name="textOCR"
              variant="onPrimary"
            />
          }
          label="텍스트 OCR"
        />
        <NavItem
          id="records"
          activeId={activeId}
          path={ROUTES.records}
          onNavigate={go}
          icon={
            <SidebarMenuIcon
              name="recordsList"
              variant="onPrimary"
            />
          }
          label="기록목록"
        />
        <NavItem
          id="settings"
          activeId={activeId}
          path={ROUTES.settings}
          onNavigate={go}
          icon={
            <SidebarMenuIcon
              name="userProfile"
              variant="onPrimary"
            />
          }
          label="내정보"
        />
      </div>
    </div>
  );
}

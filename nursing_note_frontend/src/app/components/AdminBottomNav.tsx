import { FileStack, Home, MessageSquareText, Settings, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@/app/navigation/routes";

const ITEMS = [
  { to: ROUTES.adminRoot, label: "홈", icon: Home, end: true },
  { to: ROUTES.adminTeam, label: "팀원관리", icon: Users },
  { to: ROUTES.adminTemplates, label: "템플릿", icon: FileStack },
  { to: ROUTES.adminInquiries, label: "문의사항", icon: MessageSquareText },
  { to: ROUTES.adminSettings, label: "내정보", icon: Settings },
];

export function AdminBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e5e7eb] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid h-[clamp(60px,9vh,68px)] w-full max-w-[640px] grid-cols-5 px-1">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[clamp(9px,2.7vw,11px)] ${
                isActive ? "font-semibold text-[#155dfc]" : "text-[#9ca3af]"
              }`
            }
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            <span className="w-full truncate text-center">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

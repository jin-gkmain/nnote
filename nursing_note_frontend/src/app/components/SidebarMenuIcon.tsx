import { cn } from "@/app/components/ui/utils";
import {
  sidebarSvgIcons,
  type SidebarIconId,
} from "@/imports/svg_menu_sidebar";

type SidebarMenuIconProps = {
  name: SidebarIconId;
  /** menu: 회색; menuActive: 현재 페이지(파랑); onPrimary: 파란 버튼 위 흰색 */
  variant?: "menu" | "menuActive" | "onPrimary";
  className?: string;
};

export function SidebarMenuIcon({
  name,
  variant = "menu",
  className,
}: SidebarMenuIconProps) {
  const { viewBox, path } = sidebarSvgIcons[name];
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0",
        (variant === "menu" || variant === "menuActive") && "h-[22px] w-[22px]",
        variant === "onPrimary" && "h-6 w-6 text-white",
        className,
      )}
      aria-hidden
    >
      <path
        d={path}
        fill={
          variant === "onPrimary"
            ? "currentColor"
            : variant === "menuActive"
              ? "#2563eb"
              : "#4A5565"
        }
      />
    </svg>
  );
}

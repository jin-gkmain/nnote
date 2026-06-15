import { useAuth } from "@/app/auth/auth-context";
import { AdminUserManagementPanel } from "@/app/components/AdminUserManagementPanel";

export default function AdminTeamPage() {
  const { user, token } = useAuth();
  if (!user || !token) return null;
  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5">
      <h1 className="text-2xl font-bold text-[#1f2024]">팀원 관리</h1>
      <AdminUserManagementPanel token={token} actorUser={user} />
    </div>
  );
}

import { useAuth } from "@/app/auth/auth-context";
import { AdminUserManagementPanel } from "@/app/components/AdminUserManagementPanel";

export default function AdminTeamPage() {
  const { user, token } = useAuth();
  if (!user || !token) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">팀원 관리</h1>
      <AdminUserManagementPanel token={token} actorUser={user} />
    </div>
  );
}

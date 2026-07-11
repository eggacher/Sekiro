import { useAuthStore } from "@/lib/store/auth-store";
import { SUPER_ADMIN_ROLE } from "@sekiro/shared";

export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isSuperAdmin = roles.includes(SUPER_ADMIN_ROLE);
  return {
    isSuperAdmin,
    has: (code: string) => isSuperAdmin || permissions.includes(code),
    hasAny: (codes: string[]) => isSuperAdmin || codes.some((c) => permissions.includes(c)),
  };
}

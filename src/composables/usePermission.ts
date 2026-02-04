import { useAuthStore } from "@/stores/auth";

export function usePermission() {
  const auth = useAuthStore();

  function can(permission: string): boolean {
    return auth.can(permission);
  }

  function hasRole(role: string): boolean {
    return auth.hasRole(role);
  }

  return { can, hasRole };
}

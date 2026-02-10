import { defineStore } from "pinia";
import authService from "@/services/authService";

interface User {
  id: number;
  name: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    permissions: [] as string[],
    roles: [] as string[],
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async login(credentials: any) {
      try {
        await authService.getCsrfCookie();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await authService.login(credentials);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.fetchUser();

        if (!this.user) {
          throw new Error("Login succeeded, but failed to fetch user.");
        }
      } catch (error) {
        throw error;
      }
    },

    async fetchUser() {
      try {
        const response = await authService.getUser();
        const userData = response.data.data || response.data;
        this.user = userData;
        this.roles = userData.roles || [];
        this.permissions = userData.permissions || [];
      } catch (error) {
        this.resetState();
      }
    },

    async logout() {
      this.resetState();
      try {
        await authService.logout();
      } catch (error) {
        console.warn("Logout API failed, but frontend session is cleared.");
      }
    },

    resetState() {
      this.user = null;
      this.permissions = [];
      this.roles = [];
      localStorage.removeItem("token");
    },

    can(permissionName: string) {
      if (this.roles.includes("Admin") || this.roles.includes("Super Admin"))
        return true;
      return this.permissions.includes(permissionName);
    },

    hasRole(roleName: string) {
      return this.roles.includes(roleName);
    },
  },
});

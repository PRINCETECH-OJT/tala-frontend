import { defineStore } from "pinia";
import authService from "@/services/authService";
import type { User, LoginForm } from "@/types";

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
    async login(credentials: LoginForm) {
      try { 
        const response = await authService.login(credentials);

        if (response.data.requires_email_verification) {
          throw { type: "email_not_verified" };
        }

        if (response.data.requires_onboarding) {
          throw { type: "requires_onboarding" };
        }
      } catch (error) {
        throw error;
      }
    },

    async fetchUser() {
      try {
        const response = await authService.getUser();
        const userData = response.data.data; 

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

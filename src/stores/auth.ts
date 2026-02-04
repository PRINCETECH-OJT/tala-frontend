import { defineStore } from "pinia";
import api from "@/services/api";
import axios from "axios";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as any,
    permissions: [] as string[],
    roles: [] as string[],
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    async login(credentials: any) {
      try {
        await axios.get("http://localhost:8000/sanctum/csrf-cookie", {
          withCredentials: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 50));

        const token = this.getCookie("XSRF-TOKEN");

        await axios.post("http://localhost:8000/login", credentials, {
          withCredentials: true,
          headers: {
            "X-XSRF-TOKEN": token ? decodeURIComponent(token) : "",
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        await this.fetchUser();
      } catch (error) {
        throw error;
      }
    },

    async fetchUser() {
      try {
        const response = await api.get("/user");

        const userData = response.data.data || response.data;

        this.user = userData;
        this.roles = userData.roles || [];
        this.permissions = userData.permissions || [];
      } catch (error) {
        this.user = null;
        this.permissions = [];
        this.roles = [];
      }
    },

    async logout() {
      try {
        await axios.post(
          "http://localhost:8000/logout",
          {},
          { withCredentials: true },
        );
      } catch (error) {}
      this.user = null;
      this.permissions = [];
      this.roles = [];
    },

    can(permissionName: string) {
      if (this.roles.includes("Admin") || this.roles.includes("Super Admin"))
        return true;
      return this.permissions.includes(permissionName);
    },

    hasRole(roleName: string) {
      return this.roles.includes(roleName);
    },

    getCookie(name: string) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    },
  },
});

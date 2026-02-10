import axios from "axios"; // Standard axios for the CSRF cookie call
import api from "@/services/api"; // Your configured instance

const BACKEND_URL = "http://localhost:8000";

export default {
  // 1. Get the Cookie
  async getCsrfCookie() {
    // We use standard axios here because we don't need the interceptor yet
    return axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
  },

  async register(data: any) {
    await this.getCsrfCookie();
    return api.post("/register", data);
  },

  async login(credentials: any) {
    await this.getCsrfCookie();
    return api.post("/login", credentials);
  },

  async logout() {
    return api.post("/logout");
  },

  async getUser() {
    return api.get("/user");
  },
};

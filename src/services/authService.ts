import axios from "axios";
import api from "@/services/api";
import type { LoginForm, RegisterForm } from "@/types";

const BACKEND_URL = "http://localhost:8000"; 

export default {
  async getCsrfCookie() {
    return axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
  },

  async register(data: RegisterForm) {
    await this.getCsrfCookie();
    return api.post("/register", data);
  },

  async login(credentials: LoginForm) { 
    await this.getCsrfCookie();
    return api.post(`/login`, credentials);
  },

  async logout() { 
    return api.post(`/logout`);
  },

  async getUser() {
    return api.get("/user");
  },

  async verifyEmail(id: string, hash: string, expires: string, signature: string) {
    return api.get(
      `/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`
    );
  },

  async resendVerification() {
    return api.post("/email/resend");
  },
};

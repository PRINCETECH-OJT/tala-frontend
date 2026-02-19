import axios from "axios";
import api from "@/services/api";
import type { LoginForm, RegisterForm } from "@/types";

const BACKEND_URL = "http://localhost:8000";

let csrfPromise: Promise<void> | null = null;

const getCsrfCookie = async (): Promise<void> => {
  if (csrfPromise) return csrfPromise;

  csrfPromise = axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
  }).then(() => {
    csrfPromise = null;
  }).catch(() => {
    csrfPromise = null;
  });

  return csrfPromise;
};

export default {
  getCsrfCookie,

  async register(data: RegisterForm) {
    await getCsrfCookie();
    return api.post("/register", data);
  },

  async login(credentials: LoginForm) {
    await getCsrfCookie();
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

import axios from "axios";
import api from "@/services/api";

const BACKEND_URL = "http://localhost:8000";
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

export default {
  async getCsrfCookie() {
    return axios.get(`${BACKEND_URL}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
  },

  async login(credentials: any) {
    const token = getCookie("XSRF-TOKEN");

    return axios.post(`${BACKEND_URL}/login`, credentials, {
      withCredentials: true,
      headers: {
        "X-XSRF-TOKEN": token ? decodeURIComponent(token) : "",
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  },

  async logout() {
    const token = getCookie("XSRF-TOKEN");

    return axios.post(
      `${BACKEND_URL}/logout`,
      {},
      {
        withCredentials: true,
        headers: {
          "X-XSRF-TOKEN": token ? decodeURIComponent(token) : "",
          Accept: "application/json",
        },
      },
    );
  },

  async getUser() {
    return api.get("/user");
  },
};

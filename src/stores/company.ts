import { defineStore } from "pinia"
import api from "@/services/api"

export const useCompanyStore = defineStore("company", {
  state: () => ({
    companies: [] as any[],
    currentCompany: null as any | null,
    isLoading: false,
  }),

  getters: {
    companyId: (state) => state.currentCompany?.id || null,
  },

  actions: {
    async fetchCompanies() {
      if (this.companies.length || this.isLoading) return;

      this.isLoading = true;
      try {
        const res = await api.get("/companies");
        this.companies = res.data.data;

        if (!this.currentCompany && this.companies.length) {
          this.currentCompany = this.companies[0];
        }
      } finally {
        this.isLoading = false;
      }
    },

    setCurrentCompany(company: any) {
      this.currentCompany = company
    },

    addCompany(company: any) {
      this.companies.push(company);
      this.currentCompany = company;
    },

    reset() {
      this.companies = [];
      this.currentCompany = null;
      this.isLoading = false;
    },
  },
})

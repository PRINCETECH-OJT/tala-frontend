import { defineStore } from "pinia"
import api from "@/services/api"

export const useCompanyStore = defineStore("company", {
  state: () => ({
    companies: [] as any[],
    currentCompany: null as any | null,
  }),

  actions: {
    async fetchCompanies() {
      const res = await api.get("/api/my-companies")
      this.companies = res.data
    },

    setCurrentCompany(company: any) {
      this.currentCompany = company
    },
  },
})

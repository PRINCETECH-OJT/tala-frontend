import { api } from "@/services"
import type { Invoice, InvoiceFormData, InvoiceStatistics } from "@/types"

const BASE_URL = (companyUuid: string) => `/companies/${companyUuid}/invoices`

export default {
  async getAll(companyUuid: string) {
    const response = await api.get(BASE_URL(companyUuid))
    return response.data.data ?? response.data
  },

  async get(uuid: string) {
    const response = await api.get(`/invoices/${uuid}`)
    return response.data.data ?? response.data
  },

  async create(companyUuid: string, data: Partial<InvoiceFormData>) {
    const response = await api.post(BASE_URL(companyUuid), data)
    return response.data.data ?? response.data
  },

  async update(uuid: string, data: Partial<InvoiceFormData>) {
    const response = await api.put(`/invoices/${uuid}`, data)
    return response.data.data ?? response.data
  },

  async delete(uuid: string) {
    return api.delete(`/invoices/${uuid}`)
  },

  async post(uuid: string) {
    const response = await api.post(`/invoices/${uuid}/post`, {}) 
    return response.data.data ?? response.data
  },

  async markAsPaid(uuid: string) {
    const response = await api.post(`/invoices/${uuid}/mark-as-paid`, {}) 
    return response.data.data ?? response.data
  },

  async getStatistics(companyUuid: string) {
    const response = await api.get(`${BASE_URL(companyUuid)}/statistics`) 
    return response.data.data ?? response.data
  },
}

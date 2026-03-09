import { api } from "@/services"
import type { BillFormData } from "@/types"

const BASE_URL = (companyUuid: string) => `/companies/${companyUuid}/bills`

export default {
  async getAll(companyUuid: string, params?: {
    page?: number
    per_page?: number
    search?: string
    status?: string
    vendor?: string
    date_range?: { start: string; end: string }
  }) {
    const response = await api.get(BASE_URL(companyUuid), { params })
    return response.data.data ?? response.data
  },

  async get(uuid: string) {
    const response = await api.get(`/bills/${uuid}`)
    return response.data.data ?? response.data
  },

  async create(companyUuid: string, data: Partial<BillFormData>) {
    const response = await api.post(BASE_URL(companyUuid), data)
    return response.data.data ?? response.data
  },

  async update(uuid: string, data: Partial<BillFormData>) {
    const response = await api.put(`/bills/${uuid}`, data)
    return response.data.data ?? response.data
  },

  async delete(uuid: string) {
    return api.delete(`/bills/${uuid}`)
  },

  async approve(uuid: string) {
    const response = await api.post(`/bills/${uuid}/approve`, {}) 
    return response.data.data ?? response.data
  },

  async markAsPaid(uuid: string) {
    const response = await api.post(`/bills/${uuid}/mark-as-paid`, {})
    return response.data.data ?? response.data
  },

  async getStatistics(companyUuid: string) {
    const response = await api.get(`${BASE_URL(companyUuid)}/statistics`) 
    return response.data.data ?? response.data
  },
}

import { api } from "@/services"
import type { PurchaseOrder, PurchaseOrderFormData, PurchaseOrderStatistics } from '@/types'

export default {
  async getStatistics(companyId: string) {
    const response = await api.get(`/companies/${companyId}/purchase-orders/statistics`)
    return response.data.data || response.data
  },

  async get(uuid: string) {
    const response = await api.get(`/purchase-orders/${uuid}`)
    return response.data.data || response.data
  },

  async create(companyId: string, data: Partial<PurchaseOrderFormData>) {
    const response = await api.post(`/companies/${companyId}/purchase-orders`, data)
    return response.data.data || response.data
  },

  async update(uuid: string, data: Partial<PurchaseOrderFormData>) {
    const response = await api.put(`/purchase-orders/${uuid}`, data)
    return response.data.data || response.data
  },

  async delete(uuid: string) {
    await api.delete(`/purchase-orders/${uuid}`)
  },

  async requestApproval(uuid: string) {
    const response = await api.post(`/purchase-orders/${uuid}/request-approval`)
    return response.data.data || response.data
  },

  async approve(uuid: string) {
    const response = await api.post(`/purchase-orders/${uuid}/approve`)
    return response.data.data || response.data
  },

  async reject(uuid: string, reason: string) {
    const response = await api.post(`/purchase-orders/${uuid}/reject`, { reason })
    return response.data.data || response.data
  },

  async send(uuid: string) {
    const response = await api.post(`/purchase-orders/${uuid}/send`)
    return response.data.data || response.data
  },

  async convertToBill(uuid: string) {
    const response = await api.post(`/purchase-orders/${uuid}/convert-to-bill`)
    return response.data.data || response.data
  },
}
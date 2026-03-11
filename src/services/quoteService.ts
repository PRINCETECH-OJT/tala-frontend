import api from './api'
import type { Quote, QuoteFormData } from '@/types'

export default { 
  async list(companyId: string, params?: any) {
    const response = await api.get(`/companies/${companyId}/quotes`, { params })
    return response.data
  },
 
  async get(uuid: string) {
    const response = await api.get(`/quotes/${uuid}`)
    return response.data.data
  },
 
  async create(companyId: string, data: Partial<QuoteFormData>) {
    const response = await api.post(`/companies/${companyId}/quotes`, data)
    return response.data.data
  },
 
  async update(uuid: string, data: Partial<QuoteFormData>) {
    const response = await api.put(`/quotes/${uuid}`, data)
    return response.data.data
  },
 
  async delete(uuid: string) {
    const response = await api.delete(`/quotes/${uuid}`)
    return response.data
  },
 
  async send(uuid: string) {
    const response = await api.post(`/quotes/${uuid}/send`)
    return response.data.data
  },
 
  async accept(uuid: string) {
    const response = await api.post(`/quotes/${uuid}/accept`)
    return response.data.data
  },
 
  async decline(uuid: string, reason: string) {
    const response = await api.post(`/quotes/${uuid}/decline`, { reason })
    return response.data.data
  },
 
  async convertToInvoice(uuid: string) {
    const response = await api.post(`/quotes/${uuid}/convert-to-invoice`)
    return response.data.data
  },
 
  async getStatistics(companyId: string) {
    const response = await api.get(`/companies/${companyId}/quotes/statistics`)
    return response.data.data
  },
}
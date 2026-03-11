import { ref } from "vue";
import api from "@/services/api";
import type { Quote } from "@/types";

export default function useQuotes() {
  const quotes = ref<Quote[]>([]);
  const quote = ref<Quote | null>(null);
  const summary = ref(null);
  const errors = ref<string | null>(null);
  const isLoading = ref(false);

  const getQuotes = async (companyUuid: string, page = 1, filters = {}) => {
    isLoading.value = true;
    errors.value = null;
    try {
      const response = await api.get(`/companies/${companyUuid}/quotes`, {
        params: { page, ...filters },
      });
      quotes.value = response.data.data;
    } catch (err: any) {
      errors.value = err.response?.data?.message || "Failed to fetch quotes";
    } finally {
      isLoading.value = false;
    }
  };

  const getQuote = async (uuid: string) => {
    isLoading.value = true;
    errors.value = null;
    try {
      const response = await api.get(`/quotes/${uuid}`);
      quote.value = response.data.data;
    } catch (err: any) {
      errors.value = err.response?.data?.message || "Failed to fetch quote";
    } finally {
      isLoading.value = false;
    }
  };

  const sendQuote = async (uuid: string) => {
    await api.post(`/quotes/${uuid}/send`);
    await getQuote(uuid);
  };

  const convertToInvoice = async (uuid: string) => {
    const response = await api.post(`/quotes/${uuid}/convert-to-invoice`);
    return response.data.data.data;
  };

  return {
    quotes,
    quote,
    summary,
    isLoading,
    errors,
    getQuotes,
    getQuote,
    sendQuote,
    convertToInvoice,
  };
}

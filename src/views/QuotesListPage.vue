<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { quoteService } from "@/services";
import type { Quote } from "@/types";

const route = useRoute(); 
const router = useRouter();
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   STATE
------------------------------ */
const quotes = ref<Quote[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedQuotes = ref<string[]>([])
const selectedFilters = ref<string[]>([])
const searchQuery = ref("")

// Pagination
const currentPage = ref(1)
const perPage = ref(15)
const total = ref(0)
const lastPage = ref(1)

// Statistics
const statistics = ref({
  total_quotes: 0,
  draft_quotes: 0,
  sent_quotes: 0,
  accepted_quotes: 0,
  declined_quotes: 0,
  expired_quotes: 0,
  total_amount: 0,
  pending_amount: 0,
})

/* -----------------------------
   COMPUTED
------------------------------ */
const hasSelectedQuotes = computed(() => selectedQuotes.value.length > 0)

/* -----------------------------
   DATA LOADING
------------------------------ */
const loadQuotes = async (page = 1) => {
  try {
    isLoading.value = true
    error.value = null
    
    const params: any = {
      page,
      per_page: perPage.value,
    }
    
    if (selectedFilters.value.length > 0) {
      params.status = selectedFilters.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const response = await quoteService.list(companyId.value, params)
    
    quotes.value = response.data
    
    if (response.meta) {
      currentPage.value = response.meta.current_page
      lastPage.value = response.meta.last_page
      perPage.value = response.meta.per_page
      total.value = response.meta.total
    }
    
  } catch (err: any) {
    console.error("Failed to load quotes:", err)
    error.value = err.response?.data?.message || "Failed to load quotes"
  } finally {
    isLoading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const stats = await quoteService.getStatistics(companyId.value)
    statistics.value = stats
  } catch (err) {
    console.error("Failed to load statistics:", err)
  }
}

/* -----------------------------
   ACTIONS
------------------------------ */
const createQuote = () => {
  router.push(`/app/${companyId.value}/quotes/new`)
}

const viewQuote = (uuid: string) => {
  router.push(`/app/${companyId.value}/quotes/${uuid}`)
}

const deleteQuote = async (uuid: string) => {
  if (!confirm("Are you sure you want to delete this quote?")) return
  
  try {
    await quoteService.delete(uuid)
    await loadQuotes(currentPage.value)
    await loadStatistics()
  } catch (err: any) {
    error.value = err.response?.data?.message || "Failed to delete quote"
  }
}

const sendQuote = async (uuid: string) => {
  if (!confirm("Send this quote to the customer?")) return
  
  try {
    await quoteService.send(uuid)
    await loadQuotes(currentPage.value)
    await loadStatistics()
  } catch (err: any) {
    error.value = err.response?.data?.message || "Failed to send quote"
  }
}

const convertToInvoice = async (uuid: string) => {
  if (!confirm("Convert this quote to an invoice?")) return
  
  try {
    const invoice = await quoteService.convertToInvoice(uuid)
    router.push(`/app/${companyId.value}/invoices/${invoice.uuid}`)
  } catch (err: any) {
    error.value = err.response?.data?.message || "Failed to convert quote"
  }
}

const handlePageChange = (page: number) => {
  loadQuotes(page)
}

const handleSearch = () => {
  loadQuotes(1)
}

const clearSearch = () => {
  searchQuery.value = ""
  loadQuotes(1)
}

/* -----------------------------
   HELPERS
------------------------------ */
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    expired: "bg-orange-100 text-orange-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

/* -----------------------------
   WATCHERS
------------------------------ */
watch(selectedFilters, () => {
  loadQuotes(1)
  selectedQuotes.value = []
})

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(() => {
  loadQuotes()
  loadStatistics()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Quotes</h1>
        <p class="text-sm text-gray-500 mt-1">
          Manage and track your customer quotes.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          v-if="hasSelectedQuotes"
          class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Bulk Actions ({{ selectedQuotes.length }})
        </button>

        <button
          @click="createQuote"
          class="bg-[#253D90] hover:bg-[#1e327a] text-white px-4 py-2 rounded-md shadow transition-colors font-medium"
        >
          + Create Quote
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm text-gray-500">Total Quotes</div>
        <div class="text-2xl font-bold text-gray-900">{{ statistics.total_quotes }}</div>
      </div>
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm text-gray-500">Draft</div>
        <div class="text-2xl font-bold text-gray-600">{{ statistics.draft_quotes }}</div>
      </div>
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm text-gray-500">Sent</div>
        <div class="text-2xl font-bold text-blue-600">{{ statistics.sent_quotes }}</div>
      </div>
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm text-gray-500">Accepted</div>
        <div class="text-2xl font-bold text-green-600">{{ statistics.accepted_quotes }}</div>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
    >
      <span class="block sm:inline">{{ error }}</span>
      <button
        @click="error = null"
        class="absolute top-0 bottom-0 right-0 px-4 py-3"
      >
        <span class="text-2xl">&times;</span>
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="bg-white shadow rounded-lg p-4 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Status Filters -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="status in ['draft', 'sent', 'accepted', 'declined', 'expired']"
              :key="status"
              class="inline-flex items-center"
            >
              <input
                type="checkbox"
                :value="status"
                v-model="selectedFilters"
                class="rounded border-gray-300 text-[#253D90] focus:ring-[#253D90]"
              />
              <span class="ml-2 text-sm capitalize">{{ status }}</span>
            </label>
          </div>
        </div>

        <!-- Search -->
        <div class="w-full md:w-64">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Quote number, notes..."
              class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quotes Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#253D90]"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="quotes.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No quotes found</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new quote.</p>
        <div class="mt-6">
          <button
            @click="createQuote"
            class="bg-[#253D90] hover:bg-[#1e327a] text-white px-4 py-2 rounded-md shadow transition-colors font-medium"
          >
            + Create Quote
          </button>
        </div>
      </div>

      <!-- Table -->
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="w-12 px-6 py-3">
              <input
                type="checkbox"
                class="rounded border-gray-300 text-[#253D90] focus:ring-[#253D90]"
                @change="(e) => {
                  const checked = (e.target as HTMLInputElement).checked
                  selectedQuotes = checked ? quotes.map(q => q.uuid) : []
                }"
                :checked="selectedQuotes.length === quotes.length && quotes.length > 0"
              />
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quote #
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expiry
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="quote in quotes"
            :key="quote.uuid"
            class="hover:bg-gray-50 cursor-pointer"
            @click="viewQuote(quote.uuid)"
          >
            <td class="px-6 py-4 whitespace-nowrap" @click.stop>
              <input
                type="checkbox"
                :value="quote.uuid"
                v-model="selectedQuotes"
                class="rounded border-gray-300 text-[#253D90] focus:ring-[#253D90]"
              />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ quote.quote_number }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ quote.customer?.name || 'N/A' }}</div>
              <div class="text-sm text-gray-500">{{ quote.customer?.email }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ formatDate(quote.issue_date) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ formatDate(quote.expiry_date) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ formatCurrency(quote.total_amount) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusColor(quote.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize">
                {{ quote.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" @click.stop>
              <div class="flex justify-end gap-2">
                <button
                  v-if="quote.can_be_sent"
                  @click="sendQuote(quote.uuid)"
                  class="text-blue-600 hover:text-blue-900"
                  title="Send to customer"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
                <button
                  v-if="quote.can_be_converted_to_invoice"
                  @click="convertToInvoice(quote.uuid)"
                  class="text-purple-600 hover:text-purple-900"
                  title="Convert to invoice"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  @click="viewQuote(quote.uuid)"
                  class="text-gray-600 hover:text-gray-900"
                  title="View/Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  v-if="quote.can_be_deleted"
                  @click="deleteQuote(quote.uuid)"
                  class="text-red-600 hover:text-red-900"
                  title="Delete"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="lastPage > 1" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="handlePageChange(currentPage - 1)"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            @click="handlePageChange(currentPage + 1)"
            :disabled="currentPage === lastPage"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ (currentPage - 1) * perPage + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * perPage, total) }}</span>
              of
              <span class="font-medium">{{ total }}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="handlePageChange(currentPage - 1)"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="sr-only">Previous</span>
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
              
              <button
                v-for="page in Math.min(lastPage, 7)"
                :key="page"
                @click="handlePageChange(page)"
                :class="[
                  page === currentPage
                    ? 'z-10 bg-[#253D90] border-[#253D90] text-white'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                ]"
              >
                {{ page }}
              </button>
              
              <button
                @click="handlePageChange(currentPage + 1)"
                :disabled="currentPage === lastPage"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="sr-only">Next</span>
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
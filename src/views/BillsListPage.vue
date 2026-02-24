<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Bill, BillStatistics } from "@/types"
import api from "@/services/api"
import { billService } from "@/services" 

const route = useRoute()
const router = useRouter()
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   STATE
------------------------------ */
const bills = ref<Bill[]>([])
const statistics = ref<BillStatistics | null>(null)
const loading = ref(false)
const loadingStats = ref(false)
const error = ref<string | null>(null)

const currentPage = ref(1)
const perPage = ref(10)
const totalPages = ref(1)
const totalBills = ref(0)

// Filter states - these will be sent to backend
const searchQuery = ref("")
const filterStatus = ref("")
const filterVendor = ref("")
const filterDateRange = ref<{ start: string; end: string } | null>(null)

// Debounce timeout
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

/* -----------------------------
   FETCH WITH BACKEND FILTERS
------------------------------ */
const fetchBills = async () => {
  try {
    loading.value = true
    error.value = null
 
    const params: Record<string, any> = {
      page: currentPage.value,
      per_page: perPage.value,
    }
 
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
 
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
 
    if (filterVendor.value) {
      params.vendor = filterVendor.value
    }
 
    if (filterDateRange.value) {
      params.date_range = filterDateRange.value
    }
 
    const response = await api.get(`/companies/${companyId.value}/bills`, {
      params,
    })

    const data = response.data  
    bills.value = data.data
    currentPage.value = data.pagination.current_page
    totalPages.value = data.pagination.last_page
    totalBills.value = data.pagination.total
    perPage.value = data.pagination.per_page
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to load bills"
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchStatistics = async () => {
  try {
    loadingStats.value = true
    const data = await billService.getStatistics(companyId.value)
    statistics.value = data
  } catch (err) {
    console.error("Failed to load statistics:", err)
  } finally {
    loadingStats.value = false
  }
}

/* -----------------------------
   WATCHERS FOR AUTO-REFRESH
------------------------------ */
// Debounced search
watch(searchQuery, () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    fetchBills()
  }, 500) // 500ms debounce
})

// Immediate filter on status/customer/date change
watch([searchQuery, filterStatus, filterVendor, filterDateRange], () => {
  currentPage.value = 1
  fetchBills()
})

/* -----------------------------
   COMPUTED
------------------------------ */
// No frontend filtering needed - backend handles it all
const displayedBills = computed(() => {
  return Array.isArray(bills.value) ? bills.value : []
})

/* -----------------------------
   ACTIONS
------------------------------ */
const viewBill = (bill: Bill) => {
  router.push(`/app/${companyId.value}/bills/${bill.uuid}`)
}

const createBill = () => {
  router.push(`/app/${companyId.value}/bills/new`)
}

const approveBill = async (bill: Bill, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Post bill ${bill.bill_number}? This will create journal entries.`)) return

  try {
    await billService.approve(bill.uuid)
    await fetchBills()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to approve bill")
  }
}

const markAsPaid = async (bill: Bill, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Mark bill ${bill.bill_number} as paid?`)) return

  try {
    await billService.markAsPaid(bill.uuid)
    await fetchBills()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to mark as paid")
  }
}

const deleteBill = async (bill: Bill, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Delete bill ${bill.bill_number}? This cannot be undone.`)) return

  try {
    await billService.delete(bill.uuid)
    await fetchBills()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to delete bill")
  }
}
 
const clearFilters = () => {
  searchQuery.value = ""
  filterStatus.value = ""
  filterVendor.value = ""
  filterDateRange.value = null
  // fetchBills will be called automatically by watchers
}
 
const quickFilterStatus = (status: string) => {
  filterStatus.value = status
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchBills()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchBills()
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchBills()
  }
}

const changePerPage = (newPerPage: number) => {
  perPage.value = newPerPage
  currentPage.value = 1 // Reset to first page
  fetchBills()
}

/* -----------------------------
   HELPERS
------------------------------ */
const formatCurrency = (amount: number) => {
  const realAmount = amount || 0

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(realAmount)
}

const formatDate = (date: string | null) => {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const getStatusClass = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    case "pending":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    case "cancelled":
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(() => {
  fetchBills()
  fetchStatistics()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Bills</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage your company's bills
        </p>
      </div>
      <button
        @click="createBill"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Bill
      </button>
    </div>

    <!-- Statistics Cards -->
    <div v-if="statistics" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        @click="quickFilterStatus('')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-blue-500 transition-colors"
        :class="filterStatus === '' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Bills</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statistics.total_bills }}</p>
      </div>

      <div
        @click="quickFilterStatus('draft')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-gray-500 transition-colors"
        :class="filterStatus === 'draft' ? 'border-gray-500 ring-2 ring-gray-200 dark:ring-gray-700' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Draft</p>
        <p class="text-2xl font-bold text-gray-600 dark:text-gray-300">{{ statistics.draft_bills }}</p>
      </div>

      <div
        @click="quickFilterStatus('pending')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-blue-500 transition-colors"
        :class="filterStatus === 'pending' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Pending</p>
        <p class="text-2xl font-bold text-blue-600">{{ statistics.pending_bills }}</p>
      </div>

      <div
        @click="quickFilterStatus('paid')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-green-500 transition-colors"
        :class="filterStatus === 'paid' ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-900' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Paid</p>
        <p class="text-2xl font-bold text-green-600">{{ statistics.paid_bills }}</p>
      </div>

      <div
        @click="quickFilterStatus('overdue')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-red-500 transition-colors"
        :class="filterStatus === 'overdue' ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
        <p class="text-2xl font-bold text-red-600">{{ statistics.overdue_bills }}</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Unpaid</p>
        <p class="text-xl font-bold text-gray-500">{{ statistics.unpaid_bills }}</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Expense</p>
        <p class="text-xl font-bold text-blue-600">{{ formatCurrency(statistics.total_expense) }}</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
        <p class="text-2xl font-bold text-orange-600">{{ formatCurrency(statistics.outstanding_amount) }}</p>
      </div>
    </div>

    <!-- Loading Stats -->
    <div v-else-if="loadingStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 animate-pulse">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Filters</h2>
        <button
          v-if="searchQuery || filterStatus || filterVendor || filterDateRange"
          @click="clearFilters"
          class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Clear all
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="grid col-span-3">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Search
          </label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Bill #, notes..."
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ searchQuery ? 'Searching...' : 'Start typing to search' }}
          </p>
        </div>

        <!-- Status -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Status
          </label>
          <select
            v-model="filterStatus"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div> 
        <!-- Date Range (Optional - Add if needed) --> 
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading bills...</p>
      </div>

      <!-- No Results -->
      <div v-else-if="displayedBills.length === 0" class="p-8 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-400 mb-2">
          {{ searchQuery || filterStatus ? 'No bills match your filters' : 'No bills found' }}
        </p>
        <button
          v-if="searchQuery || filterStatus"
          @click="clearFilters"
          class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
        >
          Clear filters
        </button>
        <button
          v-else
          @click="createBill"
          class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
        >
          Create your first bill
        </button>
      </div>

      <!-- Table Content -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700 text-left">
            <tr>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Bill #</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Vendor</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Issue Date</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Due Date</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Amount</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="bill in displayedBills"
              :key="bill.uuid"
              @click="viewBill(bill)"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">{{ bill.bill_number }}</div>
              </td>

              <td class="px-4 py-3">
                <div class="text-gray-700 dark:text-gray-300">
                  {{ bill.vendor?.name || "No vendor" }}
                </div>
              </td>

              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ formatDate(bill.issue_date) }}
              </td>

              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ formatDate(bill.due_date) }}
              </td>

              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(bill.total_amount) }}
                </div>
              </td>

              <td class="px-4 py-3">
                <span
                  :class="getStatusClass(bill.status)"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ getStatusLabel(bill.status) }}
                </span>
              </td>

              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <!-- Approve Button (Draft only) -->
                  <button
                    v-if="bill.status === 'draft' && bill.can_be_edited"
                    @click="approveBill(bill, $event)"
                    class="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                    title="Approve Bill"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <!-- Mark as Paid (Pending only) -->
                  <button
                    v-if="bill.status === 'pending'"
                    @click="markAsPaid(bill, $event)"
                    class="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Mark as Paid"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>

                  <!-- View/Edit -->
                  <button
                    @click="viewBill(bill)"
                    class="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="View/Edit"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  <!-- Delete (Draft only) -->
                  <button
                    v-if="bill.can_be_deleted"
                    @click="deleteBill(bill, $event)"
                    class="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
      </div>

      <!-- Results Count -->
      <div v-if="!loading && displayedBills.length > 0" class="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Showing <span class="font-medium">{{ displayedBills.length }}</span>
          {{ displayedBills.length === 1 ? 'bill' : 'bills' }}
          {{ searchQuery || filterStatus ? 'matching your filters' : '' }}
        </p>
      </div>
    </div>
    
    <!-- Pagination Controls -->
    <div 
      v-if="!loading && totalPages > 0" 
      class="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center justify-between">
        <!-- Results Info -->
        <div class="flex items-center gap-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Showing 
            <span class="font-medium">{{ ((currentPage - 1) * perPage) + 1 }}</span>
            to 
            <span class="font-medium">{{ Math.min(currentPage * perPage, totalBills) }}</span>
            of 
            <span class="font-medium">{{ totalBills }}</span>
            bills
          </p>

          <!-- Per Page Selector -->
          <select
            v-model="perPage"
            @change="changePerPage(perPage)"
            class="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option :value="10">10 per page</option>
            <option :value="15">15 per page</option>
            <option :value="25">25 per page</option>
            <option :value="50">50 per page</option>
            <option :value="100">100 per page</option>
          </select>
        </div>

        <!-- Pagination Buttons -->
        <div class="flex items-center gap-2">
          <!-- Previous Button -->
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <!-- Page Numbers -->
          <div class="flex items-center gap-1">
            <!-- First Page -->
            <button
              v-if="currentPage > 2"
              @click="goToPage(1)"
              class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              1
            </button>
            
            <span v-if="currentPage > 3" class="px-2 text-gray-500">...</span>

            <!-- Previous Page -->
            <button
              v-if="currentPage > 1"
              @click="goToPage(currentPage - 1)"
              class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              {{ currentPage - 1 }}
            </button>

            <!-- Current Page -->
            <button
              class="px-3 py-1.5 border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              {{ currentPage }}
            </button>

            <!-- Next Page -->
            <button
              v-if="currentPage < totalPages"
              @click="goToPage(currentPage + 1)"
              class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              {{ currentPage + 1 }}
            </button>

            <span v-if="currentPage < totalPages - 2" class="px-2 text-gray-500">...</span>

            <!-- Last Page -->
            <button
              v-if="currentPage < totalPages - 1"
              @click="goToPage(totalPages)"
              class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              {{ totalPages }}
            </button>
          </div>

          <!-- Next Button -->
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
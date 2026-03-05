<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { PurchaseOrder, PurchaseOrderStatistics } from "@/types"
import api from "@/services/api"
import { purchaseOrderService } from "@/services"

const route = useRoute()
const router = useRouter()
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   STATE
------------------------------ */
const purchaseOrders = ref<PurchaseOrder[]>([])
const statistics = ref<PurchaseOrderStatistics | null>(null)
const loading = ref(false)
const loadingStats = ref(false)
const error = ref<string | null>(null)

const currentPage = ref(1)
const perPage = ref(10)
const totalPages = ref(1)
const totalPOs = ref(0)

// Filter states - backend filtering
const searchQuery = ref("")
const filterStatus = ref("")
const filterVendor = ref("")
const filterDateRange = ref<{ start: string; end: string } | null>(null)

// View mode for PO-specific UX
const viewMode = ref<'table' | 'timeline'>('table')

// Debounce timeout
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

/* -----------------------------
   FETCH WITH BACKEND FILTERS
------------------------------ */
const fetchPurchaseOrders = async () => {
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

    const response = await api.get(`/companies/${companyId.value}/purchase-orders`, {
      params,
    })

    const data = response.data
    purchaseOrders.value = data.data
    
    // Handle pagination from meta or pagination object
    const paginationData = data.meta || data.pagination
    if (paginationData) {
      currentPage.value = paginationData.current_page
      totalPages.value = paginationData.last_page
      totalPOs.value = paginationData.total
      perPage.value = paginationData.per_page
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to load purchase orders"
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchStatistics = async () => {
  try {
    loadingStats.value = true
    const data = await purchaseOrderService.getStatistics(companyId.value)
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
    fetchPurchaseOrders()
  }, 500) // 500ms debounce
})

// Immediate filter on status/vendor/date change
watch([filterStatus, filterVendor, filterDateRange], () => {
  currentPage.value = 1
  fetchPurchaseOrders()
})

/* -----------------------------
   COMPUTED
------------------------------ */
const displayedPurchaseOrders = computed(() => {
  return Array.isArray(purchaseOrders.value) ? purchaseOrders.value : []
})

// Calculate days until delivery
const getDaysUntilDelivery = (po: PurchaseOrder): number | null => {
  if (!po.delivery_date) return null
  const today = new Date()
  const deliveryDate = new Date(po.delivery_date)
  const diffTime = deliveryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Check if PO is overdue for delivery
const isDeliveryOverdue = (po: PurchaseOrder): boolean => {
  const days = getDaysUntilDelivery(po)
  return days !== null && days < 0 && po.status === 'sent'
}

/* -----------------------------
   ACTIONS
------------------------------ */
const viewPurchaseOrder = (po: PurchaseOrder) => {
  router.push(`/app/${companyId.value}/orders/${po.uuid}`)
}

const createPurchaseOrder = () => {
  router.push(`/app/${companyId.value}/orders/new`)
}

const requestApproval = async (po: PurchaseOrder, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Request approval for ${po.po_number}?`)) return

  try {
    await purchaseOrderService.requestApproval(po.uuid)
    await fetchPurchaseOrders()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to request approval")
  }
}

const approvePurchaseOrder = async (po: PurchaseOrder, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Approve ${po.po_number}?`)) return

  try {
    await purchaseOrderService.approve(po.uuid)
    await fetchPurchaseOrders()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to approve purchase order")
  }
}

const rejectPurchaseOrder = async (po: PurchaseOrder, event: Event) => {
  event.stopPropagation()
  const reason = prompt(`Reject ${po.po_number}? Enter reason:`)
  if (!reason) return

  try {
    await purchaseOrderService.reject(po.uuid, reason)
    await fetchPurchaseOrders()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to reject purchase order")
  }
}

const sendPurchaseOrder = async (po: PurchaseOrder, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Send ${po.po_number} to vendor?`)) return

  try {
    await purchaseOrderService.send(po.uuid)
    await fetchPurchaseOrders()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to send purchase order")
  }
}

const convertToBill = async (po: PurchaseOrder, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Convert ${po.po_number} to Bill?`)) return

  try {
    const bill = await purchaseOrderService.convertToBill(po.uuid)
    router.push(`/app/${companyId.value}/bills/${bill.uuid}`)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to convert to bill")
  }
}

const deletePurchaseOrder = async (po: PurchaseOrder, event: Event) => {
  event.stopPropagation()
  if (!confirm(`Delete ${po.po_number}? This cannot be undone.`)) return

  try {
    await purchaseOrderService.delete(po.uuid)
    await fetchPurchaseOrders()
    await fetchStatistics()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to delete purchase order")
  }
}

const clearFilters = () => {
  searchQuery.value = ""
  filterStatus.value = ""
  filterVendor.value = ""
  filterDateRange.value = null
}

const quickFilterStatus = (status: string) => {
  filterStatus.value = status
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchPurchaseOrders()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchPurchaseOrders()
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchPurchaseOrders()
  }
}

const changePerPage = (newPerPage: number) => {
  perPage.value = newPerPage
  currentPage.value = 1
  fetchPurchaseOrders()
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
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    case "sent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getDeliveryStatusClass = (po: PurchaseOrder) => {
  const days = getDaysUntilDelivery(po)
  if (days === null) return ""
  
  if (days < 0) return "text-red-600 dark:text-red-400 font-semibold"
  if (days <= 3) return "text-orange-600 dark:text-orange-400 font-semibold"
  if (days <= 7) return "text-yellow-600 dark:text-yellow-400"
  return "text-gray-600 dark:text-gray-400"
}

const getDeliveryStatusText = (po: PurchaseOrder) => {
  const days = getDaysUntilDelivery(po)
  if (days === null) return "Not set"
  
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `In ${days} days`
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(() => {
  fetchPurchaseOrders()
  fetchStatistics()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage and track your purchase orders
        </p>
      </div>
      <div class="flex gap-2">
        <!-- View Mode Toggle -->
        <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-slate-800">
          <button
            @click="viewMode = 'table'"
            :class="[
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            @click="viewMode = 'timeline'"
            :class="[
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>
        
        <button
          @click="createPurchaseOrder"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Purchase Order
        </button>
      </div>
    </div>

    <!-- Statistics Cards - PO Specific -->
    <div v-if="statistics" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        @click="quickFilterStatus('')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-blue-500 transition-colors"
        :class="filterStatus === '' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Total POs</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statistics.total_purchase_orders }}</p>
      </div>

      <div
        @click="quickFilterStatus('draft')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-gray-500 transition-colors"
        :class="filterStatus === 'draft' ? 'border-gray-500 ring-2 ring-gray-200 dark:ring-gray-700' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Draft</p>
        <p class="text-2xl font-bold text-gray-600 dark:text-gray-300">{{ statistics.draft_purchase_orders }}</p>
      </div>

      <div
        @click="quickFilterStatus('pending')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-yellow-500 transition-colors"
        :class="filterStatus === 'pending' ? 'border-yellow-500 ring-2 ring-yellow-200 dark:ring-yellow-900' : ''"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Awaiting Approval</p>
            <p class="text-2xl font-bold text-yellow-600">{{ statistics.pending_purchase_orders }}</p>
          </div>
          <svg class="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div
        @click="quickFilterStatus('approved')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-green-500 transition-colors"
        :class="filterStatus === 'approved' ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-900' : ''"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Approved</p>
            <p class="text-2xl font-bold text-green-600">{{ statistics.approved_purchase_orders }}</p>
          </div>
          <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div
        @click="quickFilterStatus('sent')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-blue-500 transition-colors"
        :class="filterStatus === 'sent' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : ''"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Sent to Vendor</p>
            <p class="text-2xl font-bold text-blue-600">{{ statistics.sent_purchase_orders }}</p>
          </div>
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      </div>

      <div
        @click="quickFilterStatus('rejected')"
        class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 cursor-pointer hover:border-red-500 transition-colors"
        :class="filterStatus === 'rejected' ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900' : ''"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
        <p class="text-2xl font-bold text-red-600">{{ statistics.rejected_purchase_orders }}</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
        <p class="text-xl font-bold text-purple-600">{{ formatCurrency(statistics.total_amount) }}</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Pending Value</p>
        <p class="text-2xl font-bold text-orange-600">{{ formatCurrency(statistics.pending_amount) }}</p>
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
        <div class="md:col-span-3">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Search
          </label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="PO #, vendor, notes..."
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
            <option value="">All Purchase Orders</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="sent">Sent</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <!-- Table View -->
    <div v-if="viewMode === 'table'" class="bg-white dark:bg-slate-800 rounded-xl shadow border overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading purchase orders...</p>
      </div>

      <!-- No Results -->
      <div v-else-if="displayedPurchaseOrders.length === 0" class="p-8 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-400 mb-2">
          {{ searchQuery || filterStatus ? 'No purchase orders match your filters' : 'No purchase orders found' }}
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
          @click="createPurchaseOrder"
          class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
        >
          Create your first purchase order
        </button>
      </div>

      <!-- Table Content -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700 text-left">
            <tr>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">PO #</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Vendor</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Issue Date</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Delivery Date</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Delivery Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Amount</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="po in displayedPurchaseOrders"
              :key="po.uuid"
              @click="viewPurchaseOrder(po)"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              :class="{ 'bg-red-50 dark:bg-red-900/10': isDeliveryOverdue(po) }"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">{{ po.po_number }}</div>
                <div v-if="po.converted_to_bill_id" class="text-xs text-green-600 dark:text-green-400 mt-0.5">
                  ✓ Converted to Bill
                </div>
              </td>

              <td class="px-4 py-3">
                <div class="text-gray-700 dark:text-gray-300">
                  {{ po.vendor?.name || "No vendor" }}
                </div>
              </td>

              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ formatDate(po.issue_date) }}
              </td>

              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ formatDate(po.delivery_date) }}
              </td>

              <td class="px-4 py-3">
                <div :class="getDeliveryStatusClass(po)" class="text-sm font-medium">
                  {{ getDeliveryStatusText(po) }}
                </div>
              </td>

              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(po.total_amount) }}
                </div>
              </td>

              <td class="px-4 py-3">
                <span
                  :class="getStatusClass(po.status)"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ getStatusLabel(po.status) }}
                </span>
              </td>

              <td class="px-4 py-3 text-right" @click.stop>
                <div class="flex items-center justify-end gap-2">
                  <!-- Request Approval (Draft only) -->
                  <button
                    v-if="po.status === 'draft'"
                    @click="requestApproval(po, $event)"
                    class="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                    title="Request Approval"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <!-- Approve (Pending only) -->
                  <button
                    v-if="po.can_be_approved"
                    @click="approvePurchaseOrder(po, $event)"
                    class="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1"
                    title="Approve"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>

                  <!-- Reject (Pending only) -->
                  <button
                    v-if="po.status === 'pending'"
                    @click="rejectPurchaseOrder(po, $event)"
                    class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                    title="Reject"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <!-- Send (Approved only) -->
                  <button
                    v-if="po.can_be_sent"
                    @click="sendPurchaseOrder(po, $event)"
                    class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    title="Send to Vendor"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>

                  <!-- Convert to Bill (Sent/Approved only) -->
                  <button
                    v-if="(po.status === 'sent' || po.status === 'approved') && !po.converted_to_bill_id"
                    @click="convertToBill(po, $event)"
                    class="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 p-1"
                    title="Convert to Bill"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>

                  <!-- Edit -->
                  <button
                    v-if="po.can_be_edited"
                    @click="router.push(`/app/${companyId}/orders/${po.uuid}`)"
                    class="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
                    title="Edit"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete -->
                  <button
                    v-if="po.can_be_deleted"
                    @click="deletePurchaseOrder(po, $event)"
                    class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
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
    </div>

    <!-- Timeline View (Unique to POs) -->
    <div v-else-if="viewMode === 'timeline'" class="space-y-4">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="displayedPurchaseOrders.length === 0" class="bg-white dark:bg-slate-800 rounded-xl shadow border p-12 text-center">
        <p class="text-gray-500 dark:text-gray-400">No purchase orders to display</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="po in displayedPurchaseOrders"
          :key="po.uuid"
          @click="viewPurchaseOrder(po)"
          class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4 hover:border-blue-500 transition-colors cursor-pointer"
          :class="{ 'border-red-300 dark:border-red-700': isDeliveryOverdue(po) }"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ po.po_number }}</h3>
                <span :class="getStatusClass(po.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getStatusLabel(po.status) }}
                </span>
                <div v-if="po.converted_to_bill_id" class="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓ Converted to Bill
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-gray-500 dark:text-gray-400">Vendor</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ po.vendor?.name || "No vendor" }}</p>
                </div>

                <div>
                  <p class="text-gray-500 dark:text-gray-400">Issue Date</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(po.issue_date) }}</p>
                </div>

                <div>
                  <p class="text-gray-500 dark:text-gray-400">Delivery</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(po.delivery_date) }}</p>
                  <p :class="getDeliveryStatusClass(po)" class="text-xs mt-0.5">
                    {{ getDeliveryStatusText(po) }}
                  </p>
                </div>

                <div>
                  <p class="text-gray-500 dark:text-gray-400">Total Amount</p>
                  <p class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(po.total_amount) }}</p>
                </div>
              </div>

              <!-- Approval Workflow Visualization -->
              <div v-if="po.status !== 'draft'" class="mt-4 flex items-center gap-2 text-xs">
                <div class="flex items-center gap-1">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center"
                    :class="['draft', 'pending', 'approved', 'rejected', 'sent'].indexOf(po.status) >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <span class="text-gray-600 dark:text-gray-400">Created</span>
                </div>

                <div class="flex-1 h-0.5" :class="['pending', 'approved', 'rejected', 'sent'].indexOf(po.status) >= 0 ? 'bg-blue-300' : 'bg-gray-300'"></div>

                <div class="flex items-center gap-1">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center"
                    :class="['approved', 'rejected', 'sent'].indexOf(po.status) >= 0 ? 'bg-blue-100 text-blue-600' : po.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'"
                  >
                    <svg v-if="po.status === 'rejected'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="['approved', 'sent'].indexOf(po.status) >= 0" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else class="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ po.status === 'rejected' ? 'Rejected' : po.status === 'approved' || po.status === 'sent' ? 'Approved' : 'Approval' }}
                  </span>
                </div>

                <div class="flex-1 h-0.5" :class="po.status === 'sent' ? 'bg-blue-300' : 'bg-gray-300'"></div>

                <div class="flex items-center gap-1">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center"
                    :class="po.status === 'sent' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </div>
                  <span class="text-gray-600 dark:text-gray-400">Sent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>Show</span>
        <select
          :value="perPage"
          @change="changePerPage(parseInt(($event.target as HTMLSelectElement).value))"
          class="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span>per page</span>
        <span class="ml-4">{{ (currentPage - 1) * perPage + 1 }}-{{ Math.min(currentPage * perPage, totalPOs) }} of {{ totalPOs }}</span>
      </div>

      <div class="flex gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <button
          v-for="page in Math.min(5, totalPages)"
          :key="page"
          @click="goToPage(page)"
          :class="[
            'px-3 py-1.5 border rounded transition-colors',
            page === currentPage
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          ]"
        >
          {{ page }}
        </button>

        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

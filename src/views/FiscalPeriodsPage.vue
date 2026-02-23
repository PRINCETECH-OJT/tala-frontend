<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import { useRoute } from "vue-router"
import api from "@/services/api"
import type { FiscalPeriod, FiscalPeriodForm } from "@/types/"

const route = useRoute()
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   TABLE STATE
------------------------------ */
const periods = ref<FiscalPeriod[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const filterStatus = ref("all")

const fetchPeriods = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await api.get(`/companies/${companyId.value}/fiscal-periods`)
    periods.value = response.data.data ?? response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || "Failed to load fiscal periods"
    console.error(err)
  } finally {
    loading.value = false
  }
}

const filteredPeriods = computed(() => {
  let result = periods.value

  if (filterStatus.value === "open") {
    result = result.filter(p => !p.is_closed)
  } else if (filterStatus.value === "closed") {
    result = result.filter(p => p.is_closed)
  } else if (filterStatus.value === "current") {
    result = result.filter(p => p.is_current)
  }

  return result
})

// Get unique years from periods
const availableYears = computed(() => {
  const years = new Set<number>()
  periods.value.forEach(p => {
    const year = new Date(p.start_date).getFullYear()
    years.add(year)
  })
  return Array.from(years).sort((a, b) => b - a)
})

/* -----------------------------
   MODAL STATE
------------------------------ */
const showModal = ref(false)
const modalMode = ref<"create" | "edit">("create")
const editingPeriod = ref<FiscalPeriod | null>(null)
const savingPeriod = ref(false)

const form = ref<FiscalPeriodForm>({
  period_name: "",
  start_date: "",
  end_date: "",
})

const formErrors = ref<Record<string, string[]>>({})

const openCreateModal = () => {
  modalMode.value = "create"
  editingPeriod.value = null
  
  // Reset form
  form.value = {
    period_name: "",
    start_date: "",
    end_date: "",
  }
  
  formErrors.value = {}
  showModal.value = true
}

const openEditModal = (period: FiscalPeriod) => {
  if (period.is_closed) {
    alert("Closed periods cannot be edited")
    return
  }

  modalMode.value = "edit"
  editingPeriod.value = period
  
  // Populate form
  form.value = {
    period_name: period.period_name,
    start_date: period.start_date,
    end_date: period.end_date,
  }
  
  formErrors.value = {}
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPeriod.value = null
  formErrors.value = {}
}

const savePeriod = async () => {
  try {
    savingPeriod.value = true
    formErrors.value = {}

    if (modalMode.value === "create") {
      await api.post(`/companies/${companyId.value}/fiscal-periods`, form.value)
    } else if (editingPeriod.value) {
      await api.put(`/companies/${companyId.value}/fiscal-periods/${editingPeriod.value.uuid}`, form.value)
    }

    closeModal()
    await fetchPeriods()
  } catch (err: any) {
    if (err.response?.status === 422) {
      formErrors.value = err.response.data.errors || {}
    } else {
      alert(err.response?.data?.message || "Failed to save fiscal period")
    }
  } finally {
    savingPeriod.value = false
  }
}

/* -----------------------------
   BULK GENERATION
------------------------------ */
const showGenerateModal = ref(false)
const generatingPeriods = ref(false)
const generateYear = ref(new Date().getFullYear())
const generateType = ref<"monthly" | "quarterly">("monthly")

const openGenerateModal = () => {
  generateYear.value = new Date().getFullYear()
  generateType.value = "monthly"
  showGenerateModal.value = true
}

const closeGenerateModal = () => {
  showGenerateModal.value = false
}

const generatePeriods = async () => {
  try {
    generatingPeriods.value = true
    
    const endpoint = generateType.value === "monthly" 
      ? `/companies/${companyId.value}/fiscal-periods/generate/monthly`
      : `/companies/${companyId.value}/fiscal-periods/generate/quarterly`
    
    await api.post(endpoint, { year: generateYear.value })
    
    closeGenerateModal()
    await fetchPeriods()
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to generate periods")
  } finally {
    generatingPeriods.value = false
  }
}

/* -----------------------------
   DELETE FUNCTIONALITY
------------------------------ */
const deletingPeriod = ref<string | null>(null)

const deletePeriod = async (period: FiscalPeriod) => {
  if (!period.can_be_deleted) {
    alert("This period cannot be deleted")
    return
  }

  const confirmed = confirm(
    `Are you sure you want to delete "${period.period_name}"?\n\nThis action cannot be undone.`
  )

  if (!confirmed) return

  try {
    deletingPeriod.value = period.uuid
    await api.delete(`/companies/${companyId.value}/fiscal-periods/${period.uuid}`)
    await fetchPeriods()
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to delete fiscal period")
  } finally {
    deletingPeriod.value = null
  }
}

/* -----------------------------
   CLOSE/REOPEN FUNCTIONALITY
------------------------------ */
const closingPeriod = ref<string | null>(null)

const closePeriod = async (period: FiscalPeriod) => {
  if (!period.can_be_closed) {
    alert("This period cannot be closed. Ensure all entries are posted.")
    return
  }

  const confirmed = confirm(
    `Are you sure you want to close "${period.period_name}"?\n\nOnce closed, no transactions can be posted to this period.`
  )

  if (!confirmed) return

  try {
    closingPeriod.value = period.uuid
    await api.post(`/companies/${companyId.value}/fiscal-periods/${period.uuid}/close`)
    await fetchPeriods()
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to close fiscal period")
  } finally {
    closingPeriod.value = null
  }
}

const reopenPeriod = async (period: FiscalPeriod) => {
  if (!period.can_be_reopened) {
    alert("This period cannot be reopened")
    return
  }

  const confirmed = confirm(
    `Are you sure you want to reopen "${period.period_name}"?\n\nTransactions will be allowed in this period again.`
  )

  if (!confirmed) return

  try {
    closingPeriod.value = period.uuid
    await api.post(`/companies/${companyId.value}/fiscal-periods/${period.uuid}/reopen`)
    await fetchPeriods()
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to reopen fiscal period")
  } finally {
    closingPeriod.value = null
  }
}

/* -----------------------------
   DETAILS VIEW WITH SUMMARY
------------------------------ */
const showDetailsModal = ref(false)
const selectedPeriod = ref<FiscalPeriod | null>(null)
const periodSummary = ref<any>(null)
const loadingSummary = ref(false)

const viewPeriodDetails = async (period: FiscalPeriod) => {
  selectedPeriod.value = period
  showDetailsModal.value = true
  
  // Load summary
  try {
    loadingSummary.value = true
    const res = await api.get(`/companies/${companyId.value}/fiscal-periods/${period.uuid}/summary`)
    periodSummary.value = res.data.data
  } catch (err) {
    console.error("Failed to load summary:", err)
  } finally {
    loadingSummary.value = false
  }
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedPeriod.value = null
  periodSummary.value = null
}

// Helper to format date
const formatDate = (date: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Helper to get period type badge
const getPeriodTypeBadge = (period: FiscalPeriod) => {
  if (period.is_monthly) return { label: 'Monthly', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' }
  if (period.is_quarterly) return { label: 'Quarterly', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' }
  if (period.is_yearly) return { label: 'Yearly', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
  return { label: 'Custom', class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(fetchPeriods)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Fiscal Periods</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage your company's accounting periods and period closures
        </p>
      </div>

      <div class="flex gap-3">
        <button
          @click="openGenerateModal"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Generate Periods
        </button>

        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Period
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Filter by Status
          </label>
          <select
            v-model="filterStatus"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Periods</option>
            <option value="current">Current Period</option>
            <option value="open">Open Periods</option>
            <option value="closed">Closed Periods</option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            @click="fetchPeriods"
            class="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading fiscal periods...</p>
      </div>

      <div v-else-if="filteredPeriods.length === 0" class="p-8 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-400">No fiscal periods found</p>
        <button
          @click="openGenerateModal"
          class="mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Generate periods for the year
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700 text-left">
            <tr>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Period Name</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Start Date</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">End Date</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Duration</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Entries</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="period in filteredPeriods"
              :key="period.uuid"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              :class="{ 'bg-blue-50 dark:bg-blue-900/10': period.is_current }"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-white">{{ period.display_name }}</span>
                  <span v-if="period.is_current" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Current
                  </span>
                </div>
              </td>
              
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getPeriodTypeBadge(period).class"
                >
                  {{ getPeriodTypeBadge(period).label }}
                </span>
              </td>
              
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ formatDate(period.start_date) }}
              </td>
              
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ formatDate(period.end_date) }}
              </td>
              
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ period.duration_days }} days
              </td>
              
              <td class="px-4 py-3">
                <span
                  :class="period.is_closed
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ period.is_closed ? 'Closed' : 'Open' }}
                </span>
              </td>
              
              <td class="px-4 py-3">
                <div class="text-xs">
                  <div class="text-green-600 dark:text-green-400">✓ {{ period.posted_entries_count }} posted</div>
                  <div v-if="period.unposted_entries_count > 0" class="text-orange-600 dark:text-orange-400">⚠ {{ period.unposted_entries_count }} unposted</div>
                </div>
              </td>
              
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <!-- View Button -->
                  <button
                    @click="viewPeriodDetails(period)"
                    class="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="View Details"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  <!-- Edit Button -->
                  <button
                    @click="openEditModal(period)"
                    :disabled="period.is_closed"
                    :class="period.is_closed 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :title="period.is_closed ? 'Closed periods cannot be edited' : 'Edit Period'"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Close/Reopen Button -->
                  <button
                    @click="period.is_closed ? reopenPeriod(period) : closePeriod(period)"
                    :disabled="closingPeriod === period.uuid || (period.is_closed && !period.can_be_reopened) || (!period.is_closed && !period.can_be_closed)"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :class="period.is_closed
                      ? 'hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'"
                    :title="period.is_closed ? 'Reopen Period' : 'Close Period'"
                  >
                    <svg v-if="closingPeriod === period.uuid" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else-if="period.is_closed" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>

                  <!-- Delete Button -->
                  <button
                    @click="deletePeriod(period)"
                    :disabled="!period.can_be_deleted || deletingPeriod === period.uuid"
                    :class="!period.can_be_deleted || deletingPeriod === period.uuid
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :title="!period.can_be_deleted ? 'Cannot delete: period is closed or has entries' : 'Delete Period'"
                  >
                    <svg v-if="deletingPeriod === period.uuid" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <!-- =========================
         GENERATE PERIODS MODAL
    ========================== -->
    <div
      v-if="showGenerateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeGenerateModal"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
        <!-- Modal Header -->
        <div class="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Generate Fiscal Periods
            </h2>
            <button
              @click="closeGenerateModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <input
              v-model.number="generateYear"
              type="number"
              :min="new Date().getFullYear() - 5"
              :max="new Date().getFullYear() + 10"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period Type
            </label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                :class="generateType === 'monthly' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'"
              >
                <input
                  v-model="generateType"
                  type="radio"
                  value="monthly"
                  class="text-blue-600"
                />
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">Monthly Periods</div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">Generate 12 periods (Jan-Dec)</div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                :class="generateType === 'quarterly' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'"
              >
                <input
                  v-model="generateType"
                  type="radio"
                  value="quarterly"
                  class="text-blue-600"
                />
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">Quarterly Periods</div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">Generate 4 periods (Q1-Q4)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              @click="closeGenerateModal"
              :disabled="generatingPeriods"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              @click="generatePeriods"
              :disabled="generatingPeriods"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="generatingPeriods" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ generatingPeriods ? "Generating..." : "Generate Periods" }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =========================
         CREATE/EDIT MODAL
    ========================== -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ modalMode === "create" ? "Create Fiscal Period" : "Edit Fiscal Period" }}
            </h2>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-4 space-y-4">
          <!-- Period Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.period_name"
              type="text"
              placeholder="e.g., January 2024 or Q1 2024"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.period_name }"
            />
            <p v-if="formErrors.period_name" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.period_name[0] }}
            </p>
          </div>

          <!-- Date Range -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.start_date"
                type="date"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.start_date }"
              />
              <p v-if="formErrors.start_date" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ formErrors.start_date[0] }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.end_date"
                type="date"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.end_date }"
              />
              <p v-if="formErrors.end_date" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ formErrors.end_date[0] }}
              </p>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              @click="closeModal"
              :disabled="savingPeriod"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              @click="savePeriod"
              :disabled="savingPeriod"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="savingPeriod" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ savingPeriod ? "Saving..." : modalMode === "create" ? "Create Period" : "Update Period" }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =========================
         DETAILS MODAL WITH SUMMARY
    ========================== -->
    <div
      v-if="showDetailsModal && selectedPeriod"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeDetailsModal"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ selectedPeriod.display_name }}
            </h2>
            <button
              @click="closeDetailsModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-4 space-y-6">
          <!-- Status Cards -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p class="text-xs text-blue-600 dark:text-blue-400 mb-1">Status</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedPeriod.is_closed ? 'Closed' : 'Open' }}
              </p>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p class="text-xs text-purple-600 dark:text-purple-400 mb-1">Type</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ getPeriodTypeBadge(selectedPeriod).label }}
              </p>
            </div>
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p class="text-xs text-green-600 dark:text-green-400 mb-1">Duration</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedPeriod.duration_days }} days
              </p>
            </div>
          </div>

          <!-- Date Range -->
          <div class="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Range</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Start Date</p>
                <p class="text-base font-medium text-gray-900 dark:text-white">
                  {{ formatDate(selectedPeriod.start_date) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">End Date</p>
                <p class="text-base font-medium text-gray-900 dark:text-white">
                  {{ formatDate(selectedPeriod.end_date) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Journal Entries -->
          <div class="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Journal Entries</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Posted Entries</p>
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                  {{ selectedPeriod.posted_entries_count }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Unposted Entries</p>
                <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {{ selectedPeriod.unposted_entries_count }}
                </p>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Financial Summary</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Total Debits</p>
                <p class="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {{ formatCurrency(selectedPeriod.total_debits) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Total Credits</p>
                <p class="text-xl font-bold text-green-600 dark:text-green-400">
                  {{ formatCurrency(selectedPeriod.total_credits) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Closure Info -->
          <div v-if="selectedPeriod.is_closed && selectedPeriod.closed_by" class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p class="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Period Closure</p>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Closed By:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ selectedPeriod.closed_by.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Closed At:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(selectedPeriod.closed_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar (for current period) -->
          <div v-if="selectedPeriod.is_current" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p class="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Period Progress</p>
            <div class="relative pt-1">
              <div class="flex mb-2 items-center justify-between">
                <div>
                  <span class="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
                    {{ selectedPeriod.progress_percentage.toFixed(0) }}% Complete
                  </span>
                </div>
              </div>
              <div class="overflow-hidden h-2 text-xs flex rounded bg-blue-200 dark:bg-blue-900">
                <div
                  :style="{ width: selectedPeriod.progress_percentage + '%' }"
                  class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              @click="closeDetailsModal"
              class="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
            
            <button
              v-if="!selectedPeriod.is_closed"
              @click="openEditModal(selectedPeriod); closeDetailsModal()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Edit Period
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for modals */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}
</style>
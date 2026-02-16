<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import { useRoute } from "vue-router"
import type { TaxRate, TaxRateFormData, Account } from "@/types"
import api from "@/services/api"

const route = useRoute()
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   TABLE STATE
------------------------------ */
const taxRates = ref<TaxRate[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref("")
const filterAppliesTo = ref("")
const filterStatus = ref("all")

const fetchTaxRates = async () => {
  try {
    loading.value = true
    error.value = null

    const params: Record<string, unknown> = {}
    if (filterStatus.value === "active") params.active_only = true
    if (filterAppliesTo.value === "sales") params.for_sales = true
    if (filterAppliesTo.value === "purchases") params.for_purchases = true

    const response = await api.get(`/companies/${companyId.value}/tax-rates`, { params })
    taxRates.value = response.data.data ?? response.data
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to load tax rates"
    console.error(err)
  } finally {
    loading.value = false
  }
}

const filteredTaxRates = computed(() => {
  let result = taxRates.value
  if (filterStatus.value === "inactive") {
    result = result.filter((t) => !t.is_active)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (t) =>
        t.tax_code?.toLowerCase().includes(q) ||
        t.tax_name?.toLowerCase().includes(q) ||
        t.tax_type?.toLowerCase().includes(q)
    )
  }
  return result
})

/* -----------------------------
   MODAL STATE
------------------------------ */
const showModal = ref(false)
const modalMode = ref<"create" | "edit">("create")
const editingTaxRate = ref<TaxRate | null>(null)
const savingTaxRate = ref(false)
const loadingAccounts = ref(false)
const accounts = ref<Account[]>([])

const form = ref<TaxRateFormData>({
  tax_code: "",
  tax_name: "",
  tax_type: "",
  rate_percent: 0,
  effective_from: "",
  effective_to: null,
  is_compound: false,
  compound_order: 0,
  applies_to: "BOTH",
  sales_tax_payable_account_id: "",
  purchase_tax_receivable_account_id: "",
  tax_expense_account_id: null,
  is_active: true,
})

const formErrors = ref<Record<string, string[]>>({})

const openCreateModal = async () => {
  modalMode.value = "create"
  editingTaxRate.value = null
  form.value = {
    tax_code: "",
    tax_name: "",
    tax_type: "",
    rate_percent: 0,
    effective_from: "",
    effective_to: null,
    is_compound: false,
    compound_order: 0,
    applies_to: "BOTH",
    sales_tax_payable_account_id: "",
    purchase_tax_receivable_account_id: "",
    tax_expense_account_id: null,
    is_active: true,
  }
  formErrors.value = {}
  showModal.value = true
  await loadModalData()
}

const openEditModal = async (taxRate: TaxRate) => {
  modalMode.value = "edit"
  editingTaxRate.value = taxRate
  const pay = taxRate.sales_tax_payable_account
  const recv = taxRate.purchase_tax_receivable_account
  const exp = taxRate.tax_expense_account
  form.value = {
    tax_code: taxRate.tax_code,
    tax_name: taxRate.tax_name,
    tax_type: taxRate.tax_type,
    rate_percent: Number(taxRate.rate_percent),
    effective_from: taxRate.effective_from || "",
    effective_to: taxRate.effective_to ?? null,
    is_compound: taxRate.is_compound ?? false,
    compound_order: taxRate.compound_order ?? 0,
    applies_to: (taxRate.applies_to as "SALES" | "PURCHASES" | "BOTH") || "BOTH",
    sales_tax_payable_account_id: pay?.id ?? "",
    purchase_tax_receivable_account_id: recv?.id ?? "",
    tax_expense_account_id: exp?.id ?? null,
    is_active: taxRate.is_active ?? true,
  }
  formErrors.value = {}
  showModal.value = true
  await loadModalData()
}

const loadModalData = async () => {
  if (accounts.value.length === 0) {
    try {
      loadingAccounts.value = true
      const res = await api.get(`/companies/${companyId.value}/accounts`, {
        params: { active_only: true },
      })
      accounts.value = res.data.data ?? res.data
    } catch (err) {
      console.error("Failed to load accounts:", err)
    } finally {
      loadingAccounts.value = false
    }
  }
}

// Filter accounts by type for item form dropdowns (match backend account type categories)
const salesTaxPayableAccounts = computed(() =>
  accounts.value.filter(
    (acc) => acc.is_active && acc.account_type?.category === "liability" && acc.account_type?.type_name === "Current Liabilities"
  )
)
const purchaseTaxReceivableAccounts = computed(() =>
  accounts.value.filter(
    (acc) => acc.is_active && acc.account_type?.category === "asset" && acc.account_type?.type_name === "Current Assets"
  )
)
const taxExpenseAccounts = computed(() =>
  accounts.value.filter(
    (acc) => acc.is_active && acc.account_type?.category === "expense"
  )
)

const closeModal = () => {
  showModal.value = false
  editingTaxRate.value = null
  formErrors.value = {}
}

const saveTaxRate = async () => {
  try {
    savingTaxRate.value = true
    formErrors.value = {}

    const payload = {
      ...form.value,
      sales_tax_payable_account_id: Number(form.value.sales_tax_payable_account_id) || undefined,
      purchase_tax_receivable_account_id:
        Number(form.value.purchase_tax_receivable_account_id) || undefined,
      tax_expense_account_id: form.value.tax_expense_account_id
        ? Number(form.value.tax_expense_account_id)
        : null,
    }

    if (modalMode.value === "create") {
      await api.post(`/companies/${companyId.value}/tax-rates`, payload)
    } else if (editingTaxRate.value) {
      await api.put(`/tax-rates/${editingTaxRate.value.uuid}`, payload)
    }

    closeModal()
    await fetchTaxRates()
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } }
    if (e.response?.status === 422) {
      formErrors.value = e.response.data?.errors || {}
    } else {
      alert(e.response?.data?.message || "Failed to save tax rate")
    }
  } finally {
    savingTaxRate.value = false
  }
}

/* -----------------------------
   DELETE
------------------------------ */
const deletingTaxRate = ref<string | null>(null)

const deleteTaxRate = async (taxRate: TaxRate) => {
  const confirmed = confirm(
    `Are you sure you want to delete "${taxRate.tax_name}" (${taxRate.tax_code})?\n\nThis action cannot be undone.`
  )
  if (!confirmed) return

  try {
    deletingTaxRate.value = taxRate.uuid
    await api.delete(`/tax-rates/${taxRate.uuid}`)
    await fetchTaxRates()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message || "Failed to delete tax rate")
  } finally {
    deletingTaxRate.value = null
  }
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(fetchTaxRates)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tax Rates</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage tax rates for this company
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Tax Rate
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by code, name, or type..."
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Applies to</label>
          <select
            v-model="filterAppliesTo"
            @change="fetchTaxRates"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="sales">Sales only</option>
            <option value="purchases">Purchases only</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Status</label>
          <select
            v-model="filterStatus"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading tax rates...</p>
      </div>
      <div v-else-if="filteredTaxRates.length === 0" class="p-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">No tax rates found</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700 text-left">
            <tr>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Code</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Name</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Rate</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Applies to</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Effective</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="tr in filteredTaxRates"
              :key="tr.uuid"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-gray-900 dark:text-white">{{ tr.tax_code }}</td>
              <td class="px-4 py-3 text-gray-900 dark:text-white">{{ tr.tax_name }}</td>
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">{{ tr.tax_type }}</td>
              <td class="px-4 py-3 text-gray-900 dark:text-white">{{ tr.formatted_rate }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': tr.applies_to === 'SALES',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': tr.applies_to === 'PURCHASES',
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': tr.applies_to === 'BOTH',
                  }"
                >
                  {{ tr.applies_to }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ tr.effective_from }}
                <span v-if="tr.effective_to"> – {{ tr.effective_to }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="tr.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ tr.is_active ? "Active" : "Inactive" }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(tr)"
                    class="p-1.5 text-gray-600 hover:text-yellow-600 dark:text-gray-400 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                    title="Edit"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="deleteTaxRate(tr)"
                    :disabled="deletingTaxRate === tr.uuid"
                    class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg v-if="deletingTaxRate === tr.uuid" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ modalMode === "create" ? "Create Tax Rate" : "Edit Tax Rate" }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax code <span class="text-red-500">*</span></label>
              <input
                v-model="form.tax_code"
                type="text"
                placeholder="e.g. VAT"
                maxlength="50"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.tax_code }"
              />
              <p v-if="formErrors.tax_code" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.tax_code[0] }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax name <span class="text-red-500">*</span></label>
              <input
                v-model="form.tax_name"
                type="text"
                placeholder="e.g. Value Added Tax"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.tax_name }"
              />
              <p v-if="formErrors.tax_name" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.tax_name[0] }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax type</label>
              <input
                v-model="form.tax_type"
                type="text"
                placeholder="e.g. Sales Tax"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.tax_type }"
              />
              <p v-if="formErrors.tax_type" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.tax_type[0] }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate % <span class="text-red-500">*</span></label>
              <input
                v-model.number="form.rate_percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.rate_percent }"
              />
              <p v-if="formErrors.rate_percent" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.rate_percent[0] }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effective from <span class="text-red-500">*</span></label>
              <input
                v-model="form.effective_from"
                type="date"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.effective_from }"
              />
              <p v-if="formErrors.effective_from" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.effective_from[0] }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effective to (optional)</label>
              <input
                v-model="form.effective_to"
                type="date"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.effective_to }"
              />
              <p v-if="formErrors.effective_to" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.effective_to[0] }}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-6 items-center">
            <div class="flex items-center gap-2">
              <input
                v-model="form.is_compound"
                type="checkbox"
                id="is_compound"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="is_compound" class="text-sm font-medium text-gray-700 dark:text-gray-300">Compound tax</label>
            </div>
            <div v-if="form.is_compound" class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Order</label>
              <input
                v-model.number="form.compound_order"
                type="number"
                min="0"
                class="w-20 border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applies to <span class="text-red-500">*</span></label>
            <select
              v-model="form.applies_to"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.applies_to }"
            >
              <option value="SALES">Sales</option>
              <option value="PURCHASES">Purchases</option>
              <option value="BOTH">Both</option>
            </select>
            <p v-if="formErrors.applies_to" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.applies_to[0] }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales tax payable account <span class="text-red-500">*</span></label>
            <select
              v-model="form.sales_tax_payable_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.sales_tax_payable_account_id }"
              :disabled="loadingAccounts"
            >
              <option value="">Select account</option>
              <option v-for="acc in salesTaxPayableAccounts" :key="acc.uuid" :value="acc.id">
                {{ acc.full_number }} - {{ acc.name }}
              </option>
            </select>
            <p v-if="formErrors.sales_tax_payable_account_id" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.sales_tax_payable_account_id[0] }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase tax receivable account <span class="text-red-500">*</span></label>
            <select
              v-model="form.purchase_tax_receivable_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.purchase_tax_receivable_account_id }"
              :disabled="loadingAccounts"
            >
              <option value="">Select account</option>
              <option v-for="acc in purchaseTaxReceivableAccounts" :key="acc.uuid" :value="acc.id">
                {{ acc.full_number }} - {{ acc.name }}
              </option>
            </select>
            <p v-if="formErrors.purchase_tax_receivable_account_id" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.purchase_tax_receivable_account_id[0] }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax expense account (optional)</label>
            <select
              v-model="form.tax_expense_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :disabled="loadingAccounts"
            >
              <option :value="null">None</option>
              <option v-for="acc in taxExpenseAccounts" :key="acc.uuid" :value="acc.id">
                {{ acc.full_number }} - {{ acc.name }}
              </option>
            </select>
            <p v-if="formErrors.tax_expense_account_id" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ formErrors.tax_expense_account_id[0] }}</p>
          </div>

          <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <input
              v-model="form.is_active"
              type="checkbox"
              id="is_active"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="is_active" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Tax rate is active</label>
          </div>
        </div>

        <div class="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            @click="closeModal"
            :disabled="savingTaxRate"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="saveTaxRate"
            :disabled="savingTaxRate"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg v-if="savingTaxRate" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ savingTaxRate ? "Saving..." : modalMode === "create" ? "Create Tax Rate" : "Update Tax Rate" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

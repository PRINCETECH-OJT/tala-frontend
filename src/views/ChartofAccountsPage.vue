<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import { useRoute } from "vue-router"
import type { Account, AccountType, AccountFormData } from '@/types';
import api from "@/services/api"  

const route = useRoute()
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   TABLE STATE
------------------------------ */  
const accounts = ref<Account[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref("")
const filterCategory = ref("")
const filterStatus = ref("all")

const fetchAccounts = async () => {
  try {
    loading.value = true
    error.value = null
    
    const params: any = {}
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    if (filterCategory.value) {
      params.category = filterCategory.value
    }
    
    if (filterStatus.value === "active") {
      params.active_only = true
    }
    
    const response = await api.get(`/companies/${companyId.value}/accounts`, { params })
    accounts.value = response.data.data ?? response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || "Failed to load accounts"
    console.error(err)
  } finally {
    loading.value = false
  }
}

const filteredAccounts = computed(() => {
  let result = accounts.value

  if (filterStatus.value === "inactive") {
    result = result.filter(a => !a.is_active)
  }

  return result
})

/* -----------------------------
   MODAL STATE
------------------------------ */
const showModal = ref(false)
const modalMode = ref<"create" | "edit">("create")
const editingAccount = ref<Account | null>(null)
const loadingTypes = ref(false)
const loadingParentAccounts = ref(false)
const savingAccount = ref(false)

const accountTypes = ref<AccountType[]>([])
const parentAccounts = ref<Account[]>([])

const form = ref<AccountFormData>({
  number: "",
  name: "",
  account_type_id: "",
  parent_account_id: null,
  description: "",
  is_active: true,
})

const formErrors = ref<Record<string, string[]>>({}) 

const openCreateModal = async () => {
  modalMode.value = "create"
  editingAccount.value = null
  
  // Reset form
  form.value = {
    number: "",
    name: "",
    account_type_id: "",
    parent_account_id: null,
    description: "",
    is_active: true,
  }
  
  formErrors.value = {}
  showModal.value = true

  await loadModalData()
}

const openEditModal = async (account: Account) => {
  if (account.is_system_account) {
    alert("System accounts cannot be edited")
    return
  }

  modalMode.value = "edit"
  editingAccount.value = account
  
  // Populate form with account data
  form.value = {
    number: account.number,
    name: account.name,
    account_type_id: account.account_type.id,
    parent_account_id: account.parent_account_id,
    description: account.description || "",
    is_active: account.is_active,
  }
  
  formErrors.value = {}
  showModal.value = true

  await loadModalData()
}

const loadModalData = async () => {
  // Load account types
  if (accountTypes.value.length === 0) {
    try {
      loadingTypes.value = true
      const res = await api.get("/account-types")
      accountTypes.value = res.data.data ?? res.data
    } catch (err) {
      console.error("Failed to load account types:", err)
    } finally {
      loadingTypes.value = false
    }
  }

  // Load parent accounts
  try {
    loadingParentAccounts.value = true
    const res = await api.get(`/companies/${companyId.value}/accounts`, {
      params: { parent_only: true }
    })
    parentAccounts.value = res.data.data ?? res.data
    
    // Remove current account from parent list when editing
    if (modalMode.value === "edit" && editingAccount.value) {
      parentAccounts.value = parentAccounts.value.filter(
        a => a.uuid !== editingAccount.value?.uuid
      )
    }
  } catch (err) {
    console.error("Failed to load parent accounts:", err)
  } finally {
    loadingParentAccounts.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  editingAccount.value = null
  formErrors.value = {}
}

const saveAccount = async () => {
  try {
    savingAccount.value = true
    formErrors.value = {}

    if (modalMode.value === "create") {
      await api.post(`/companies/${companyId.value}/accounts`, form.value)
    } else if (editingAccount.value) {
      await api.put(`/accounts/${editingAccount.value.uuid}`, form.value)
    }

    closeModal()
    await fetchAccounts()
  } catch (err: any) {
    if (err.response?.status === 422) {
      formErrors.value = err.response.data.errors || {}
    } else {
      alert(err.response?.data?.message || "Failed to save account")
    }
  } finally {
    savingAccount.value = false
  }
}

/* -----------------------------
   DELETE FUNCTIONALITY
------------------------------ */
const deletingAccount = ref<string | null>(null)

const deleteAccount = async (account: Account) => {
  if (account.is_system_account) {
    alert("System accounts cannot be deleted")
    return
  }

  if (!account.can_be_deleted) {
    alert("This account cannot be deleted. It may have sub-accounts or transaction history.")
    return
  }

  const confirmed = confirm(
    `Are you sure you want to delete "${account.name}"?\n\nThis action cannot be undone.`
  )

  if (!confirmed) return

  try {
    deletingAccount.value = account.uuid
    await api.delete(`/accounts/${account.uuid}`)
    await fetchAccounts()
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to delete account")
  } finally {
    deletingAccount.value = null
  }
}

/* -----------------------------
   ACCOUNT DETAILS VIEW
------------------------------ */
const showDetailsModal = ref(false)
const selectedAccount = ref<Account | null>(null)
const accountBalance = ref<any>(null)
const loadingBalance = ref(false)

const viewAccountDetails = async (account: Account) => {
  selectedAccount.value = account
  showDetailsModal.value = true
  
  // Load balance
  try {
    loadingBalance.value = true
    const res = await api.get(`/accounts/${account.uuid}/balance`)
    accountBalance.value = res.data.data
  } catch (err) {
    console.error("Failed to load balance:", err)
  } finally {
    loadingBalance.value = false
  }
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedAccount.value = null
  accountBalance.value = null
}

/* -----------------------------
   CATEGORIES FOR FILTER
------------------------------ */
const categories = [
  { value: "", label: "All Categories" },
  { value: "asset", label: "Assets" },
  { value: "liability", label: "Liabilities" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expenses" },
]

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(fetchAccounts)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage your company's accounts and financial structure
        </p>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Account
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="md:col-span-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Search
          </label>
          <input
            v-model="searchQuery"
            @input="fetchAccounts"
            type="text"
            placeholder="Search by name, number, or description..."
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Category Filter -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Category
          </label>
          <select
            v-model="filterCategory"
            @change="fetchAccounts"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Status
          </label>
          <select
            v-model="filterStatus"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
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
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading accounts...</p>
      </div>

      <div v-else-if="filteredAccounts.length === 0" class="p-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">No accounts found</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700 text-left">
            <tr>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Code</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Name</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Category</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Balance</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="account in filteredAccounts"
              :key="account.uuid"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-4 py-3">
                <span class="font-mono font-medium text-gray-900 dark:text-white">
                  {{ account.full_number }}
                </span>
              </td>
              
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-gray-900 dark:text-white">{{ account.full_name }}</span>
                  <span
                    v-if="account.is_system_account"
                    class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded"
                  >
                    System
                  </span>
                </div>
              </td>
              
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ account.account_type?.type_name }}
              </td>
              
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                  :class="{
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': account.account_type?.category === 'asset',
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': account.account_type?.category === 'liability',
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': account.account_type?.category === 'equity',
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': account.account_type?.category === 'revenue',
                    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300': account.account_type?.category === 'expense',
                  }"
                >
                  {{ account.account_type?.category }}
                </span>
              </td>
              
              <td class="px-4 py-3">
                <span
                  :class="account.account_type?.normal_balance === 'DR' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'"
                  class="font-medium"
                >
                  {{ account.account_type?.normal_balance }}
                </span>
              </td>
              
              <td class="px-4 py-3">
                <span
                  :class="account.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ account.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <!-- View Button -->
                  <button
                    @click="viewAccountDetails(account)"
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
                    @click="openEditModal(account)"
                    :disabled="account.is_system_account"
                    :class="account.is_system_account 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :title="account.is_system_account ? 'System accounts cannot be edited' : 'Edit Account'"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete Button -->
                  <button
                    @click="deleteAccount(account)"
                    :disabled="!account.can_be_deleted || deletingAccount === account.uuid"
                    :class="!account.can_be_deleted || deletingAccount === account.uuid
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :title="!account.can_be_deleted ? 'Cannot delete: has sub-accounts or transactions' : 'Delete Account'"
                  >
                    <svg v-if="deletingAccount === account.uuid" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {{ modalMode === "create" ? "Create New Account" : "Edit Account" }}
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
          <!-- Account Code -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Code <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.number"
              type="text"
              placeholder="e.g., 1000"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.number }"
            />
            <p v-if="formErrors.number" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.number[0] }}
            </p>
          </div>

          <!-- Account Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g., Cash"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.name }"
            />
            <p v-if="formErrors.name" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.name[0] }}
            </p>
          </div>

          <!-- Account Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Type <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.account_type_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.account_type_id }"
              :disabled="loadingTypes"
            >
              <option value="">Select Account Type</option>
              <optgroup
                v-for="statement in ['balance_sheet', 'income_statement']"
                :key="statement"
                :label="statement === 'balance_sheet' ? 'Balance Sheet' : 'Income Statement'"
              >
                <option
                  v-for="type in accountTypes.filter(t => t.statement_type === statement)"
                  :key="type.id"
                  :value="type.id"
                >
                  {{ type.type_name }} ({{ type.category }} - {{ type.normal_balance }})
                </option>
              </optgroup>
            </select>
            <p v-if="loadingTypes" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Loading account types...
            </p>
            <p v-if="formErrors.account_type_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.account_type_id[0] }}
            </p>
          </div>

          <!-- Parent Account -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent Account (Optional)
            </label>
            <select
              v-model="form.parent_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :disabled="loadingParentAccounts"
            >
              <option :value="null">None (Top-level account)</option>
              <option
                v-for="account in parentAccounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.full_number }} - {{ account.name }}
              </option>
            </select>
            <p v-if="loadingParentAccounts" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Loading parent accounts...
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select a parent account to create a sub-account
            </p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Enter account description..."
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <!-- Active Status -->
          <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <input
              type="checkbox"
              v-model="form.is_active"
              id="is_active"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="is_active" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Account is active
            </label>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              @click="closeModal"
              :disabled="savingAccount"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              @click="saveAccount"
              :disabled="savingAccount"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="savingAccount" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ savingAccount ? "Saving..." : modalMode === "create" ? "Create Account" : "Update Account" }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =========================
         ACCOUNT DETAILS MODAL
    ========================== -->
    <div
      v-if="showDetailsModal && selectedAccount"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeDetailsModal"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Account Details
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
          <!-- Account Info -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Account Code</p>
              <p class="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                {{ selectedAccount.full_number }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Account Name</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedAccount.full_name }}
              </p>
            </div>
          </div>

          <!-- Type & Category -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Type</p>
              <p class="text-base text-gray-900 dark:text-white">
                {{ selectedAccount.account_type?.type_name }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Category</p>
              <p class="text-base capitalize text-gray-900 dark:text-white">
                {{ selectedAccount.account_type?.category }}
              </p>
            </div>
          </div>

          <!-- Balance -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p class="text-sm text-blue-600 dark:text-blue-400 mb-1">Current Balance</p>
            <div v-if="loadingBalance" class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
            <p v-else-if="accountBalance" class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ accountBalance.balance >= 0 ? '+' : '' }}{{ accountBalance.balance.toFixed(2) }}
              <span class="text-sm font-normal text-gray-600 dark:text-gray-400">
                ({{ accountBalance.normal_balance }})
              </span>
            </p>
          </div>

          <!-- Description -->
          <div v-if="selectedAccount.description">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
            <p class="text-base text-gray-900 dark:text-white">
              {{ selectedAccount.description }}
            </p>
          </div>

          <!-- Parent Account -->
          <div v-if="selectedAccount.parent_account">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Parent Account</p>
            <p class="text-base text-gray-900 dark:text-white">
              {{ selectedAccount.parent_account.full_number }} - {{ selectedAccount.parent_account.name }}
            </p>
          </div>

          <!-- Sub Accounts -->
          <div v-if="selectedAccount.has_sub_accounts">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Sub Accounts</p>
            <div class="space-y-2">
              <div
                v-for="sub in selectedAccount.sub_accounts"
                :key="sub.uuid"
                class="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded"
              >
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ sub.full_number }} - {{ sub.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Status Badges -->
          <div class="flex flex-wrap gap-2">
            <span
              :class="selectedAccount.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            >
              {{ selectedAccount.is_active ? 'Active' : 'Inactive' }}
            </span>
            
            <span
              v-if="selectedAccount.is_system_account"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            >
              System Account
            </span>
            
            <span
              v-if="!selectedAccount.can_be_deleted"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            >
              Cannot Be Deleted
            </span>
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
              v-if="!selectedAccount.is_system_account"
              @click="openEditModal(selectedAccount); closeDetailsModal()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Edit Account
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

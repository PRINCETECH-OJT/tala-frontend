<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue"
import { useRoute } from "vue-router"
import type { Account, Item, ItemFormData } from '@/types';
import api from "@/services/api"  

const route = useRoute()
const companyId = computed(() => route.params.companyId as string)

/* -----------------------------
   TABLE STATE
------------------------------ */  
const items = ref<Item[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref("")
const filterType = ref("")
const filterStatus = ref("all")

const fetchItems = async () => {
  try {
    loading.value = true
    error.value = null
    
    const params: any = {}
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    if (filterType.value) {
      params.type = filterType.value
    }
    
    if (filterStatus.value === "active") {
      params.active_only = true
    }
    
    const response = await api.get(`/companies/${companyId.value}/items`, { params })
    items.value = response.data.data ?? response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || "Failed to load items"
    console.error(err)
  } finally {
    loading.value = false
  }
}

const filteredItems = computed(() => {
  let result = items.value

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
const editingItem = ref<Item | null>(null)
const savingItem = ref(false)

const loadingAccounts = ref(false)
const accounts = ref<Account[]>([]) 

const form = ref<ItemFormData>({
  sku: "",
  name: "", 
  type: "",
  description: "",
  is_sale: true,
  is_purchase: false,
  sales_price: 0,
  cost_price: 0,
  taxable: true,
  is_inventory: false,
  quantity_on_hand: 0,
  income_account_id: "",
  expense_account_id: "",
  inventory_account_id: null, 
  is_active: true,
})

const formErrors = ref<Record<string, string[]>>({}) 

// Watch for type changes to reset inventory-related fields
watch(() => form.value.type, (newType) => {
  if (newType === 'service') {
    form.value.is_inventory = false
    form.value.inventory_account_id = null
    form.value.quantity_on_hand = 0
  }
})

// Watch for is_inventory changes to reset related fields
watch(() => form.value.is_inventory, (newValue) => {
  if (!newValue) {
    form.value.inventory_account_id = null
    form.value.quantity_on_hand = 0
  }
})

// Watch for is_sale changes to reset income account if unchecked
watch(() => form.value.is_sale, (newValue) => {
  if (!newValue) {
    form.value.income_account_id = ""
    form.value.sales_price = 0
  }
})

// Watch for is_purchase changes to reset expense account if unchecked
watch(() => form.value.is_purchase, (newValue) => {
  if (!newValue) {
    form.value.expense_account_id = ""
    form.value.cost_price = 0
  }
})

const openCreateModal = async () => {
  modalMode.value = "create"
  editingItem.value = null
  
  // Reset form
  form.value = {
    sku: "",
    name: "", 
    type: "",
    description: "",
    is_sale: true,
    is_purchase: false,
    sales_price: 0,
    cost_price: 0,
    taxable: true,
    is_inventory: false,
    quantity_on_hand: 0,
    income_account_id: "",
    expense_account_id: "",
    inventory_account_id: null, 
    is_active: true,
  }
  
  formErrors.value = {}
  showModal.value = true

  await loadModalData()
}

const openEditModal = async (item: Item) => {  
  modalMode.value = "edit"
  editingItem.value = item
  
  // Populate form with item data
  form.value = {
    sku: item.sku,
    name: item.name,
    type: item.type,
    description: item.description ?? "",
    is_sale: item.is_sale ?? true,
    is_purchase: item.is_purchase ?? false,
    sales_price: item.sales_price ?? 0,
    cost_price: item.cost_price ?? 0,
    taxable: item.taxable ?? true,
    is_inventory: item.is_inventory ?? false,
    quantity_on_hand: item.quantity ?? 0,
    income_account_id: item.income_account?.id ?? "",
    expense_account_id: item.expense_account?.id ?? "",
    inventory_account_id: item.inventory_account?.id ?? null,
    is_active: item.is_active ?? true,
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
const incomeAccounts = computed(() =>
  accounts.value.filter(
    (acc) => acc.is_active && acc.account_type?.category === "revenue"
  )
)
const expenseAccounts = computed(() =>
  accounts.value.filter(
    (acc) => acc.is_active && acc.account_type?.category === "expense"
  )
)
const inventoryAccounts = computed(() =>
  accounts.value.filter(
    (acc) => acc.is_active && acc.account_type?.category === "asset"
  )
)

// Check if at least one usage is selected
const hasUsageSelected = computed(() => form.value.is_sale || form.value.is_purchase)

const closeModal = () => {
  showModal.value = false
  editingItem.value = null
  formErrors.value = {}
}

const saveItem = async () => {
  try {
    savingItem.value = true
    formErrors.value = {}

    if (modalMode.value === "create") {
      await api.post(`/companies/${companyId.value}/items`, form.value)
    } else if (editingItem.value) {
      await api.put(`/items/${editingItem.value.uuid}`, form.value)
    }

    closeModal()
    await fetchItems()
  } catch (err: any) {
    if (err.response?.status === 422) {
      formErrors.value = err.response.data.errors || {}
    } else {
      alert(err.response?.data?.message || "Failed to save item")
    }
  } finally {
    savingItem.value = false
  }
}

/* -----------------------------
   DELETE FUNCTIONALITY
------------------------------ */
const deletingItem = ref<string | null>(null)

const deleteItem = async (item: Item) => { 
  if (!item.can_be_deleted) {
    alert("This item cannot be deleted. It may have transaction history.")
    return
  }

  const confirmed = confirm(
    `Are you sure you want to delete "${item.sku} - ${item.name}"?\n\nThis action cannot be undone.`
  )

  if (!confirmed) return

  try {
    deletingItem.value = item.uuid
    await api.delete(`/items/${item.uuid}`)
    await fetchItems()
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to delete item")
  } finally {
    deletingItem.value = null
  }
}

/* -----------------------------
   ITEM DETAILS VIEW
------------------------------ */
const showDetailsModal = ref(false)
const selectedItem = ref<Item | null>(null)  

const viewItemDetails = async (item: Item) => {
  selectedItem.value = item
  showDetailsModal.value = true 
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedItem.value = null 
}

/* -----------------------------
   ITEM TYPES FOR FILTER
------------------------------ */
const types = [
  { value: "", label: "All Types" },
  { value: "service", label: "Services" },
  { value: "product", label: "Products" }, 
]

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(fetchItems)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Items</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage your company's items and inventory. Create products or services, set prices, and track inventory levels.
        </p>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Item
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
            @input="fetchItems"
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
            v-model="filterType"
            @change="fetchItems"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="type in types" :key="type.value" :value="type.value">
              {{ type.label }}
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
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading items...</p>
      </div>

      <div v-else-if="filteredItems.length === 0" class="p-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">No items found</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700 text-left">
            <tr>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">SKU</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Name</th> 
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Description</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Sales Price / Cost Price</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Quantity on Hand</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="item in filteredItems"
              :key="item.uuid"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-4 py-3">
                <span class="font-mono font-medium text-gray-900 dark:text-white">
                  {{ item.sku }}
                </span>
              </td>

              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-gray-900 dark:text-white">{{ item.name }}</span>
                  <span
                    v-if="item.is_product"
                    class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded"
                  >
                    Product
                  </span>
                  <span
                    v-else-if="item.is_service"
                    class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                  >
                    Service
                  </span>
                </div>
              </td> 

              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ item.description }}
              </td>

              <td class="px-4 py-3">
                <span class="font-medium">
                  {{ item.formatted_sales_price }} / {{ item.formatted_cost_price }}
                </span>
              </td>

              <td class="px-4 py-3">
                <span class="font-medium">{{ item.quantity }}</span>
              </td>

              <td class="px-4 py-3">
                <span
                  :class="item.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ item.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <!-- View Button -->
                  <button
                    @click="viewItemDetails(item)"
                    class="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="View Details"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  <!-- Edit Button -->
                  <!-- <button
                    @click="openEditModal(item)"
                    :disabled="!item.is_inventory"
                    :class="!item.is_inventory 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :title="!item.is_inventory ? 'Non-inventory items cannot be edited' : 'Edit Item'"
                  > --> 
                  <button
                    @click="openEditModal(item)"  
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    title="Edit Item"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete Button -->
                  <button
                    @click="deleteItem(item)"
                    :disabled="!item.can_be_deleted || deletingItem === item.uuid"
                    :class="!item.can_be_deleted || deletingItem === item.uuid
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'"
                    class="p-1.5 text-gray-600 dark:text-gray-400 rounded transition-colors"
                    :title="!item.can_be_deleted ? 'Cannot delete: has transactions' : 'Delete Item'"
                  >
                    <svg v-if="deletingItem === item.uuid" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ modalMode === "create" ? "Create New Item" : "Edit Item" }}
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
          <!-- Warning: No Usage Selected -->
          <div v-if="!hasUsageSelected" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Please select at least one usage
                </p>
                <p class="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Items must be used for sales, purchases, or both.
                </p>
              </div>
            </div>
          </div>

          <!-- SKU -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU
            </label>
            <input
              v-model="form.sku"
              type="text"
              placeholder="Leave blank to auto-generate"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.sku }"
            />
            <p v-if="formErrors.sku" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.sku[0] }}
            </p>
            <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional. Will be auto-generated if left blank.
            </p>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g., Consulting Hour"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.name }"
            />
            <p v-if="formErrors.name" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.name[0] }}
            </p>
          </div>

          <!-- Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.type"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.type }"
            >
              <option value="">Select type</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
            <p v-if="formErrors.type" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.type[0] }}
            </p>
          </div>

          <!-- Usage Flags -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Usage <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap gap-6">
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  v-model="form.is_sale"
                  id="is_sale"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label for="is_sale" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Used for sales
                </label>
              </div>
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  v-model="form.is_purchase"
                  id="is_purchase"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label for="is_purchase" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Used for purchases
                </label>
              </div>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select at least one. This determines which accounts and prices are required.
            </p>
            <p v-if="formErrors.is_sale" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.is_sale[0] }}
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
              placeholder="Enter item description..."
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <!-- Sales Price & Cost Price -->
          <div class="grid grid-cols-2 gap-4">
            <div v-if="form.is_sale">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sales Price <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="form.sales_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.sales_price }"
              />
              <p v-if="formErrors.sales_price" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ formErrors.sales_price[0] }}
              </p>
            </div>
            <div v-if="form.is_purchase">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Price <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="form.cost_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.cost_price }"
              />
              <p v-if="formErrors.cost_price" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ formErrors.cost_price[0] }}
              </p>
            </div>
          </div>

          <!-- Taxable & Is inventory -->
          <div class="flex flex-wrap gap-6">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.taxable"
                id="taxable"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="taxable" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Taxable
              </label>
            </div>
            <div v-if="form.type === 'product'" class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.is_inventory"
                id="is_inventory"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="is_inventory" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Track inventory
              </label>
            </div>
          </div>
          <p v-if="form.type === 'service'" class="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Service items cannot track inventory
          </p>

          <!-- Quantity (when tracking inventory) -->
          <div v-if="form.type === 'product' && form.is_inventory">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity on hand
            </label>
            <input
              v-model.number="form.quantity_on_hand"
              type="number"
              min="0"
              step="1"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.quantity_on_hand }"
            />
            <p v-if="formErrors.quantity_on_hand" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.quantity_on_hand[0] }}
            </p>
          </div>

          <!-- Income Account -->
          <div v-if="form.is_sale">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Income Account <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.income_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.income_account_id }"
              :disabled="loadingAccounts"
            >
              <option value="">Select income account</option>
              <option
                v-for="acc in incomeAccounts"
                :key="acc.uuid"
                :value="acc.id"
              >
                {{ acc.full_number }} - {{ acc.name }}
              </option>
            </select>
            <p v-if="formErrors.income_account_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.income_account_id[0] }}
            </p>
          </div>

          <!-- Expense Account -->
          <div v-if="form.is_purchase">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expense Account <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.expense_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.expense_account_id }"
              :disabled="loadingAccounts"
            >
              <option value="">Select expense account</option>
              <option
                v-for="acc in expenseAccounts"
                :key="acc.uuid"
                :value="acc.id"
              >
                {{ acc.full_number }} - {{ acc.name }}
              </option>
            </select>
            <p v-if="formErrors.expense_account_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.expense_account_id[0] }}
            </p>
          </div>

          <!-- Inventory Account (when tracking inventory) -->
          <div v-if="form.type === 'product' && form.is_inventory">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Inventory Account <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.inventory_account_id"
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': formErrors.inventory_account_id }"
              :disabled="loadingAccounts"
            >
              <option :value="null">Select inventory account</option>
              <option
                v-for="acc in inventoryAccounts"
                :key="acc.uuid"
                :value="acc.id"
              >
                {{ acc.full_number }} - {{ acc.name }}
              </option>
            </select>
            <p v-if="formErrors.inventory_account_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ formErrors.inventory_account_id[0] }}
            </p>
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
              Item is active
            </label>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              @click="closeModal"
              :disabled="savingItem"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              @click="saveItem"
              :disabled="savingItem"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="savingItem" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ savingItem ? "Saving..." : modalMode === "create" ? "Create Item" : "Update Item" }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =========================
         ITEM DETAILS MODAL
    ========================== -->
    <div
      v-if="showDetailsModal && selectedItem"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeDetailsModal"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Item Details
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
          <!-- SKU & Name -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">SKU</p>
              <p class="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                {{ selectedItem.sku }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Name</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedItem.name }}
              </p>
            </div>
          </div>

          <!-- Type -->
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Type</p>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
              :class="{
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': selectedItem.type === 'service',
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': selectedItem.type === 'product'
              }"
            >
              {{ selectedItem.type }}
            </span>
          </div>

          <!-- Description -->
          <div v-if="selectedItem.description">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
            <p class="text-base text-gray-900 dark:text-white">
              {{ selectedItem.description }}
            </p>
          </div>

          <!-- Pricing -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Sales Price</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedItem.formatted_sales_price }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Cost Price</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedItem.formatted_cost_price }}
              </p>
            </div>
          </div>

          <!-- Margin & Markup (when cost > 0) -->
          <div v-if="selectedItem.cost_price > 0" class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Margin</p>
              <p class="text-base text-gray-900 dark:text-white">
                {{ selectedItem.margin_percent }}%
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Markup</p>
              <p class="text-base text-gray-900 dark:text-white">
                {{ selectedItem.markup_percent }}%
              </p>
            </div>
          </div>

          <!-- Inventory (for products with inventory) -->
          <div v-if="selectedItem.is_inventory" class="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Inventory</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Quantity on hand</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ selectedItem.quantity }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Total value</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ selectedItem.total_value }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-if="selectedItem.is_out_of_stock"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              >
                Out of stock
              </span>
              <span
                v-else-if="selectedItem.is_low_stock"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
              >
                Low stock
              </span>
              <span
                v-else-if="selectedItem.is_in_stock"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                In stock
              </span>
            </div>
          </div>

          <!-- Accounts -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Accounts</p>
            <div class="space-y-2">
              <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
                <span class="text-sm text-gray-600 dark:text-gray-400">Income</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ selectedItem.income_account?.number }} - {{ selectedItem.income_account?.name }}
                </span>
              </div>
              <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
                <span class="text-sm text-gray-600 dark:text-gray-400">Expense</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ selectedItem.expense_account?.number }} - {{ selectedItem.expense_account?.name }}
                </span>
              </div>
              <div
                v-if="selectedItem.inventory_account"
                class="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400">Inventory</span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ selectedItem.inventory_account.number }} - {{ selectedItem.inventory_account.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Flags & Status -->
          <div class="flex flex-wrap gap-2">
            <span
              :class="selectedItem.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            >
              {{ selectedItem.is_active ? 'Active' : 'Inactive' }}
            </span>
            <span
              v-if="selectedItem.taxable"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            >
              Taxable
            </span>
            <span
              v-if="selectedItem.is_inventory"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            >
              Inventory tracked
            </span>
            <span
              v-if="!selectedItem.can_be_deleted"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            >
              Cannot be deleted
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
              v-if="selectedItem.is_inventory"
              @click="openEditModal(selectedItem); closeDetailsModal()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Edit Item
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
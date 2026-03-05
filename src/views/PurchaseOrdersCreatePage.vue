<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { PurchaseOrder, PurchaseOrderFormData, PurchaseOrderItem, Contact, Item, TaxRate } from "@/types"
import { purchaseOrderService } from "@/services"
import api from "@/services/api"

const route = useRoute()
const router = useRouter()
const companyId = computed(() => route.params.companyId as string)
const poUuid = computed(() => route.params.uuid as string)
const isEditMode = computed(() => !!poUuid.value && poUuid.value !== 'new')

/* -----------------------------
   STATE
------------------------------ */
const loading = ref(false)
const saving = ref(false)
const requestingApproval = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lastSaved = ref<Date | null>(null)

const vendors = ref<Contact[]>([])
const items = ref<Item[]>([])
const taxRates = ref<TaxRate[]>([])
const currentPO = ref<PurchaseOrder | null>(null)

const form = ref<PurchaseOrderFormData>({
  vendor_id: null,
  po_number: "",
  issue_date: new Date().toISOString().split("T")[0]!,
  delivery_date: "",
  delivery_address: "",
  payment_terms: "",
  notes: "",
  items: [],
  order_taxes: [],
})

const formErrors = ref<Record<string, string[]>>({})
const validationErrors = ref<string[]>([])
const autoSaveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const isAlive = ref(true)

// Computed
const hasErrors = computed(() => {
  return Object.keys(formErrors.value).length > 0 || validationErrors.value.length > 0 || !!error.value
})

const allErrorMessages = computed(() => {
  const messages: string[] = []
  if (error.value) messages.push(error.value)
  validationErrors.value.forEach(err => messages.push(err))
  Object.entries(formErrors.value).forEach(([field, errors]) => {
    errors.forEach(err => messages.push(err))
  })
  return messages
})

// Calculate totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)
})

const totalDiscount = computed(() => {
  return form.value.items.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price
    const discount = lineSubtotal * ((item.discount_percent || 0) / 100)
    return sum + discount
  }, 0)
})

const taxAmount = computed(() => {
  let total = 0
  
  // Line-level taxes
  form.value.items.forEach(item => {
    const lineSubtotal = item.quantity * item.unit_price
    const lineDiscount = lineSubtotal * ((item.discount_percent || 0) / 100)
    const taxableAmount = lineSubtotal - lineDiscount
    
    item.taxes.forEach(tax => {
      const rate = taxRates.value.find(r => r.id === tax.tax_rate_id)
      if (rate) {
        total += taxableAmount * (rate.rate_percent / 100)
      }
    })
  })
  
  // Order-level taxes
  const orderTaxableAmount = subtotal.value - totalDiscount.value
  form.value.order_taxes.forEach(tax => {
    const rate = taxRates.value.find(r => r.id === tax.tax_rate_id)
    if (rate) {
      total += orderTaxableAmount * (rate.rate_percent / 100)
    }
  })
  
  return total
})

const totalAmount = computed(() => {
  return subtotal.value - totalDiscount.value + taxAmount.value
})

// Delivery days calculation
const deliveryDays = computed(() => {
  if (!form.value.issue_date || !form.value.delivery_date) return null
  const issue = new Date(form.value.issue_date)
  const delivery = new Date(form.value.delivery_date)
  const diffTime = delivery.getTime() - issue.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

/* -----------------------------
   ERROR HANDLING
------------------------------ */
const clearErrors = () => {
  error.value = null
  formErrors.value = {}
  validationErrors.value = []
}

const showSuccess = (message: string, duration = 3000) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, duration)
}

const showError = (message: string) => {
  error.value = message
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleApiError = (err: any, defaultMessage: string) => {
  clearErrors()
  const response = err?.response
  
  if (response?.status === 422) {
    if (response.data?.errors) {
      formErrors.value = response.data.errors
      const messages: string[] = []
      Object.entries(response.data.errors as Record<string, string[]>).forEach(([field, errors]) => {
        errors.forEach(error => {
          messages.push(`${field}: ${error}`)
        })
      })
      validationErrors.value = messages
      showError(response.data.message || 'Validation failed. Please check the form.')
    } else {
      showError(response.data?.message || 'Validation failed')
    }
    return
  }
  
  if (response?.data?.message) {
    showError(response.data.message)
    return
  }
  
  if (err.message) {
    showError(`${defaultMessage}: ${err.message}`)
    return
  }
  
  showError(defaultMessage)
}

/* -----------------------------
   VALIDATION
------------------------------ */
const validateForm = (): boolean => {
  clearErrors()
  const errors: string[] = []
  
  if (!form.value.vendor_id) {
    errors.push('Vendor is required')
    formErrors.value.vendor_id = ['Vendor is required']
  }
  
  if (!form.value.issue_date) {
    errors.push('Issue date is required')
  }
  
  if (!form.value.delivery_date) {
    errors.push('Delivery date is required')
  }
  
  if (form.value.items.length === 0) {
    errors.push('At least one item is required')
  }
  
  form.value.items.forEach((item, index) => {
    if (!item.item_id) {
      errors.push(`Item ${index + 1}: Product is required`)
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
    }
  })
  
  validationErrors.value = errors
  if (errors.length > 0) {
    showError('Please fix the validation errors')
    return false
  }
  
  return true
}

/* -----------------------------
   DATA LOADING
------------------------------ */
const loadVendors = async () => {
  try {
    const response = await api.get(`/companies/${companyId.value}/contacts`, {
      params: { type: 'vendor' }
    })
    vendors.value = response.data.data || response.data
  } catch (err) {
    console.error("Failed to load vendors:", err)
  }
}

const loadItems = async () => {
  try {
    const response = await api.get(`/companies/${companyId.value}/items`, {
      params: { for_purchase: true, active_only: true },
    })
    items.value = response.data.data || response.data
  } catch (err) {
    console.error("Failed to load items:", err)
  }
}

const loadTaxRates = async () => {
  try {
    const response = await api.get(`/companies/${companyId.value}/tax-rates`, {
      params: { applies_to: "PURCHASES", active_only: true },
    })
    taxRates.value = response.data.data || response.data
  } catch (err) {
    console.error("Failed to load tax rates:", err)
  }
}

const loadPurchaseOrder = async () => {
  if (!isEditMode.value || poUuid.value === 'new') return
  
  try {
    loading.value = true
    const po = await purchaseOrderService.get(poUuid.value)
    currentPO.value = po
     
    form.value = {
      vendor_id: po.vendor.id,
      po_number: po.po_number,
      issue_date: po.issue_date || '',
      delivery_date: po.delivery_date || '',
      delivery_address: po.delivery_address || '',
      payment_terms: po.payment_terms || '',
      notes: po.notes || '',
      items: po.items.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        notes: item.notes || '',
        taxes: item.line_taxes.map(tax => ({
          tax_rate_id: tax.tax_rate_id,
          is_compound: tax.is_compound,
          compound_order: tax.compound_order,
        })),
      })),
      order_taxes: po.taxes.map(tax => ({
        tax_rate_id: tax.tax_rate_id,
        is_compound: tax.is_compound,
        compound_order: tax.compound_order,
      })),
    }
  } catch (err: any) {
    handleApiError(err, "Failed to load purchase order")
  } finally {
    loading.value = false
  }
}

/* -----------------------------
   ITEM MANAGEMENT
------------------------------ */
const addItem = () => {
  form.value.items.push({
    item_id: 0,
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    notes: '',
    taxes: [],
  })
}

const removeItem = (index: number) => {
  form.value.items.splice(index, 1)
}

const duplicateItem = (index: number) => {
  const item = form.value.items[index]
  form.value.items.splice(index + 1, 0, { ...item })
}

const onItemSelect = (index: number, itemId: number) => {
  const selectedItem = items.value.find(i => i.id === itemId)
  if (selectedItem) {
    form.value.items[index].unit_price = selectedItem.cost_price
  }
}

const addLineTax = (itemIndex: number) => {
  if (taxRates.value.length > 0) {
    form.value.items[itemIndex].taxes.push({
      tax_rate_id: taxRates.value[0].id,
      is_compound: false,
      compound_order: 1,
    })
  }
}

const removeLineTax = (itemIndex: number, taxIndex: number) => {
  form.value.items[itemIndex].taxes.splice(taxIndex, 1)
}

const addOrderTax = () => {
  if (taxRates.value.length > 0) {
    form.value.order_taxes.push({
      tax_rate_id: taxRates.value[0].id,
      is_compound: false,
      compound_order: 1,
    })
  }
}

const removeOrderTax = (index: number) => {
  form.value.order_taxes.splice(index, 1)
}

/* -----------------------------
   SAVE/SUBMIT FUNCTIONS
------------------------------ */
const savePurchaseOrder = async (showMessage = true) => {
  try {
    saving.value = true
    clearErrors()

    const payload = {
      ...form.value,
      vendor_id: form.value.vendor_id || undefined,
    }

    let result
    if (isEditMode.value) {
      result = await purchaseOrderService.update(poUuid.value, payload)
    } else {
      result = await purchaseOrderService.create(companyId.value, payload)
      if (!poUuid.value || poUuid.value === 'new') {
        router.replace(`/app/${companyId.value}/orders/${result.uuid}`)
      }
    }

    lastSaved.value = new Date()
    currentPO.value = result
    form.value.po_number = result.po_number

    if (showMessage) {
      showSuccess("Purchase order saved successfully")
    }
  } catch (err: any) {
    handleApiError(err, "Failed to save purchase order")
  } finally {
    saving.value = false
  }
}

const autoSave = () => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
  autoSaveTimeout.value = setTimeout(() => {
    if (!isAlive.value) return
    savePurchaseOrder(false)
  }, 2500)
}

const requestApproval = async () => {
  if (!validateForm()) return
  
  if (!confirm("Request approval for this purchase order?")) return

  try {
    requestingApproval.value = true
    clearErrors()

    // Save first if needed
    if (!currentPO.value) {
      await savePurchaseOrder(false)
    }

    const result = await purchaseOrderService.requestApproval(currentPO.value?.uuid || poUuid.value)
    currentPO.value = result

    showSuccess("Approval requested successfully")
    await loadPurchaseOrder()
  } catch (err: any) {
    handleApiError(err, "Failed to request approval")
  } finally {
    requestingApproval.value = false
  }
}

const goBack = () => {
  router.push(`/app/${companyId.value}/orders`)
}

/* -----------------------------
   WATCHERS
------------------------------ */
watch(
  () => form.value,
  () => {
    if (isEditMode.value && currentPO.value?.can_be_edited) {
      autoSave()
    }
  },
  { deep: true }
)

/* -----------------------------
   HELPERS
------------------------------ */
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}

const formatDateTime = (date: Date | null) => {
  if (!date) return ""
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function toDateInputValue(date: Date): string {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function setDeliveryDays(days: number) {
  const base = form.value.issue_date
    ? new Date(form.value.issue_date)
    : new Date()
  
  base.setDate(base.getDate() + days)
  form.value.delivery_date = toDateInputValue(base)
}

function setPaymentTerms(terms: string) {
  form.value.payment_terms = terms
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(async () => {
  await Promise.all([loadVendors(), loadItems(), loadTaxRates(), loadPurchaseOrder()])
})

onBeforeUnmount(() => {
  isAlive.value = false
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <button
          @click="goBack"
          class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode ? `Edit PO ${currentPO?.po_number || ''}` : "New Purchase Order" }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span v-if="currentPO?.status" class="inline-flex items-center gap-2">
              <span :class="[
                currentPO.status === 'draft' && 'text-gray-600',
                currentPO.status === 'pending' && 'text-yellow-600',
                currentPO.status === 'approved' && 'text-green-600',
                currentPO.status === 'rejected' && 'text-red-600',
                currentPO.status === 'sent' && 'text-blue-600',
              ]">
                Status: {{ currentPO.status.charAt(0).toUpperCase() + currentPO.status.slice(1) }}
              </span>
            </span>
            <span v-if="lastSaved" class="ml-4">
              Last saved: {{ formatDateTime(lastSaved) }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          v-if="currentPO?.can_be_edited || !isEditMode"
          @click="savePurchaseOrder()"
          :disabled="saving || loading"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ saving ? 'Saving...' : 'Save Draft' }}</span>
        </button> 
        <button
          v-if="!currentPO || currentPO.status === 'draft'"
          @click="requestApproval"
          :disabled="requestingApproval || saving || loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ requestingApproval ? 'Requesting...' : 'Request Approval' }}
        </button>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <p class="text-sm text-green-800 dark:text-green-200">{{ successMessage }}</p>
    </div>

    <!-- Error Messages -->
    <div v-if="hasErrors" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p class="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Please fix the following errors:</p>
      <ul class="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
        <li v-for="(msg, idx) in allErrorMessages" :key="idx">{{ msg }}</li>
      </ul>
    </div>

    <!-- Main Form -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Form Fields -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Basic Information -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Vendor -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vendor <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.vendor_id"
                :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                :class="[
                  'w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white',
                  formErrors.vendor_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                ]"
              >
                <option :value="null">Select a vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.contact_name }}
                </option>
              </select>
            </div>

            <!-- PO Number (Read-only if exists) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                PO Number
              </label>
              <input
                v-model="form.po_number"
                type="text"
                readonly
                class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400"
                placeholder="Auto-generated"
              />
            </div>

            <!-- Issue Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.issue_date"
                :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                type="date"
                :class="[
                  'w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white',
                  formErrors.issue_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                ]"
              />
            </div>

            <!-- Delivery Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Delivery Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.delivery_date"
                :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                type="date"
                :min="form.issue_date"
                :class="[
                  'w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white',
                  formErrors.delivery_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                ]"
              />
              <div v-if="currentPO?.can_be_edited || !isEditMode" class="mt-1 flex gap-2">
                <button @click="setDeliveryDays(7)" type="button" class="text-xs text-blue-600 hover:text-blue-700">
                  +7 days
                </button>
                <button @click="setDeliveryDays(14)" type="button" class="text-xs text-blue-600 hover:text-blue-700">
                  +14 days
                </button>
                <button @click="setDeliveryDays(30)" type="button" class="text-xs text-blue-600 hover:text-blue-700">
                  +30 days
                </button>
              </div>
              <p v-if="deliveryDays !== null" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ deliveryDays }} days from issue date
              </p>
            </div>

            <!-- Delivery Address -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Address
              </label>
              <textarea
                v-model="form.delivery_address"
                :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                rows="2"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="Enter delivery address..."
              ></textarea>
            </div>

            <!-- Payment Terms -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Terms
              </label>
              <div class="flex gap-2">
                <input
                  v-model="form.payment_terms"
                  :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                  type="text"
                  class="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Net 30"
                />
                <div v-if="currentPO?.can_be_edited || !isEditMode" class="flex gap-1">
                  <button @click="setPaymentTerms('Net 15')" type="button" class="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">
                    Net 15
                  </button>
                  <button @click="setPaymentTerms('Net 30')" type="button" class="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">
                    Net 30
                  </button>
                  <button @click="setPaymentTerms('Net 60')" type="button" class="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">
                    Net 60
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
            <button
              @click="addItem"
              v-if="currentPO?.can_be_edited || !isEditMode"
              type="button"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div v-if="form.items.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            No items added. Click "Add Item" to get started.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(item, index) in form.items"
              :key="index"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">Item {{ index + 1 }}</h3>
                <div class="flex gap-1">
                  <button
                    @click="duplicateItem(index)"
                    v-if="currentPO?.can_be_edited || !isEditMode"
                    type="button"
                    class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Duplicate"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    @click="removeItem(index)"
                    v-if="currentPO?.can_be_edited || !isEditMode"
                    type="button"
                    class="p-1 text-red-400 hover:text-red-600"
                    title="Remove"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product/Service <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="item.item_id"
                    :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                    @change="onItemSelect(index, item.item_id)"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option :value="0">Select an item</option>
                    <option v-for="i in items" :key="i.id" :value="i.id">
                      {{ i.name }} {{ i.sku ? `(${i.sku})` : '' }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="item.quantity"
                    :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit Price <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="item.unit_price"
                    :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount (%)
                  </label>
                  <input
                    v-model.number="item.discount_percent"
                    :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Line Total
                  </label>
                  <div class="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-medium">
                    {{ formatCurrency(item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)) }}
                  </div>
                </div>

                <!-- Line Taxes -->
                <div class="md:col-span-2">
                  <div 
                    v-if="taxRates.length > 0" 
                    class="flex items-center justify-between mb-2"
                  >
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Line Taxes
                    </label>
                    <button
                      @click="addLineTax(index)"
                      :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                      type="button"
                      class="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add Tax
                    </button>
                  </div>
                  <div v-if="item.taxes.length > 0" class="space-y-2">
                    <div
                      v-for="(tax, taxIndex) in item.taxes"
                      :key="taxIndex"
                      class="flex items-center gap-2"
                    >
                      <select
                        v-model="tax.tax_rate_id"
                        class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700"
                      >
                        <option v-for="rate in taxRates" :key="rate.id" :value="rate.id">
                          {{ rate.tax_name }} ({{ rate.rate_percent }}%)
                        </option>
                      </select>
                      <button
                        @click="removeLineTax(index, taxIndex)"
                        type="button"
                        class="p-1 text-red-400 hover:text-red-600"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Notes -->
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    v-model="item.notes"
                    :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
                    rows="2"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="Optional notes for this item..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Order-Level Taxes -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Order-Level Taxes</h2>
            <button
              @click="addOrderTax"
              v-if="taxRates.length > 0"
              type="button"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add Tax
            </button>
          </div>

          <div v-if="form.order_taxes.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No order-level taxes. Click "+ Add Tax" to apply taxes to the entire order.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(tax, index) in form.order_taxes"
              :key="index"
              class="flex items-center gap-2"
            >
              <select
                v-model="tax.tax_rate_id"
                class="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700"
              >
                <option v-for="rate in taxRates" :key="rate.id" :value="rate.id">
                  {{ rate.tax_name }} ({{ rate.rate_percent }}%)
                </option>
              </select>
              <button
                @click="removeOrderTax(index)"
                type="button"
                class="p-2 text-red-400 hover:text-red-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Internal Notes -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Internal Notes</h2>
          <textarea
            v-model="form.notes"
            :disabled="currentPO?.status === 'pending' || currentPO?.status === 'sent' || currentPO?.status === 'approved'"
            rows="4"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            placeholder="Add any internal notes or special instructions..."
          ></textarea>
        </div>
      </div>

      <!-- Right Column - Summary -->
      <div class="lg:col-span-1">
        <div class="sticky top-6 space-y-6">
          <!-- Order Summary -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(subtotal) }}</span>
              </div>
              
              <div v-if="totalDiscount > 0" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Discount</span>
                <span class="font-medium text-red-600">-{{ formatCurrency(totalDiscount) }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Tax</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(taxAmount) }}</span>
              </div>
              
              <div class="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <span class="font-semibold text-gray-900 dark:text-white">Total</span>
                <span class="font-bold text-lg text-gray-900 dark:text-white">{{ formatCurrency(totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- Status & Info -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
            <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Purchase Order Info</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Save as draft anytime</span>
              </div>
              <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Auto-saves every 2.5s</span>
              </div>
              <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Request approval when ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

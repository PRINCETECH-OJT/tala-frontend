<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Bill, BillFormData, BillItem, Contact, Item, TaxRate, BillTax } from "@/types"
import { billService } from "@/services"
import api from "@/services/api"

const route = useRoute()
const router = useRouter()
const companyId = computed(() => route.params.companyId as string)
const billUuid = computed(() => route.params.uuid as string)
const isEditMode = computed(() => !!billUuid.value && billUuid.value !== 'new') 

/* -----------------------------
   STATE
------------------------------ */
const loading = ref(false)
const saving = ref(false)
const approving = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lastSaved = ref<Date | null>(null)

const vendors = ref<Contact[]>([])
const items = ref<Item[]>([])
const taxRates = ref<TaxRate[]>([])
const currentBill = ref<Bill | null>(null)

const form = ref<BillFormData>({
  vendor_id: null,
  bill_number: "",
  issue_date: new Date().toISOString().split("T")[0]!,
  due_date: "", 
  notes: "",
  items: [],
  bill_taxes: [],
})

const formErrors = ref<Record<string, string[]>>({})
const validationErrors = ref<string[]>([])
const autoSaveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const isAlive = ref(true)

// Computed: Check if form has any errors
const hasErrors = computed(() => {
  return Object.keys(formErrors.value).length > 0 || validationErrors.value.length > 0 || !!error.value
})

// Computed: Get all error messages as flat array
const allErrorMessages = computed(() => {
  const messages: string[] = []
  
  // General error message
  if (error.value) {
    messages.push(error.value)
  }
  
  // Validation errors
  validationErrors.value.forEach(err => messages.push(err))
  
  // Form field errors
  Object.entries(formErrors.value).forEach(([field, errors]) => {
    errors.forEach(err => messages.push(err))
  })
  
  return messages
})

/* -----------------------------
   ERROR HANDLING HELPERS
------------------------------ */
const clearErrors = () => {
  error.value = null
  formErrors.value = {}
  validationErrors.value = []
}

const clearSuccess = () => {
  successMessage.value = null
}

const showSuccess = (message: string, duration = 3000) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, duration)
}

const showError = (message: string) => {
  error.value = message
  // Scroll to top to show error
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleApiError = (err: any, defaultMessage: string) => {
  clearErrors()
  
  const response = err?.response
  
  // Handle 422 Validation Errors
  if (response?.status === 422) {
    if (response.data?.errors) {
      formErrors.value = response.data.errors
      
      // Extract validation messages for display
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
  
  // Handle other HTTP errors
  if (response?.data?.message) {
    showError(response.data.message)
    return
  }
  
  // Network or unknown errors
  if (err.message) {
    showError(`${defaultMessage}: ${err.message}`)
    return
  }
  
  showError(defaultMessage)
} 

/* -----------------------------
   CLIENT-SIDE VALIDATION
------------------------------ */
const validateForm = (): boolean => {
  clearErrors()
  
  const errors: string[] = []
  
  // Check if approving (status='pending') or just saving draft
  const isSending = currentBill.value?.status === 'draft' && !isEditMode.value
  
  if (isSending) {
    if (!form.value.vendor_id) {
      errors.push('Vendor is required when sending a bill')
      formErrors.value.vendor_id = ['Vendor is required']
    }
    
    if (!form.value.due_date) {
      errors.push('Due date is required when sending a bill')
      formErrors.value.due_date = ['Due date is required']
    }
    
    if (!form.value.items || form.value.items.length === 0) {
      errors.push('At least one item is required when sending a bill')
      formErrors.value.items = ['At least one item is required']
    }
  }
  
  // Validate items
  form.value.items.forEach((item, index) => {
    if (!item.item_id) {
      errors.push(`Line ${index + 1}: Item is required`)
      formErrors.value[`items.${index}.item_id`] = ['Item is required']
    }
    
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Line ${index + 1}: Quantity must be greater than 0`)
      formErrors.value[`items.${index}.quantity`] = ['Quantity must be greater than 0']
    }
  })
  
  if (errors.length > 0) {
    validationErrors.value = errors
    showError('Please fix the validation errors before saving')
    return false
  }
  
  return true
}

/* -----------------------------
   COMPUTED
------------------------------ */ 
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => {
    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0) 
    return sum + lineSubtotal
  }, 0)
})

const totalDiscount = computed(() => {
  return form.value.items.reduce((sum, item) => {
    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0)
    const discount = lineSubtotal * ((item.discount_percent || 0) / 100)
    return sum + discount
  }, 0)
})

const lineTaxTotal = computed(() => {
  return form.value.items.reduce((sum, item) => {
    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0)
    const discount = lineSubtotal * ((item.discount_percent || 0) / 100)
    const taxableAmount = lineSubtotal - discount
    const itemTaxes = (item.taxes || []).reduce((taxSum, tax) => {
      const taxRate = taxRates.value.find(t => t.id === tax.tax_rate_id)
      if (!taxRate) return taxSum
      let taxable = taxableAmount
      if (tax.is_compound) {
        const previousTaxes = (item.taxes || [])
          .filter(t => t.compound_order < tax.compound_order)
          .reduce((prevSum, t) => {
            const tr = taxRates.value.find(tr => tr.id === t.tax_rate_id)
            return prevSum + (tr ? (taxableAmount * tr.rate_percent / 100) : 0)
          }, 0)
        taxable += previousTaxes
      }
      return taxSum + (taxable * (taxRate.rate_percent / 100))
    }, 0)
    return sum + itemTaxes
  }, 0)
})

const billTaxTotal = computed(() => {
  const taxableAmount = subtotal.value - totalDiscount.value
  return form.value.bill_taxes.reduce((sum, tax) => {
    const taxRate = taxRates.value.find(t => t.id === tax.tax_rate_id)
    if (!taxRate) return sum
    let taxable = tax.custom_taxable_amount ?? taxableAmount
    if (tax.is_compound) {
      const previousTaxes = form.value.bill_taxes
        .filter(t => t.compound_order < tax.compound_order)
        .reduce((prevSum, t) => {
          const tr = taxRates.value.find(tr => tr.id === t.tax_rate_id)
          return prevSum + (tr ? ((tax.custom_taxable_amount ?? taxableAmount) * tr.rate_percent / 100) : 0)
        }, 0)
      taxable += previousTaxes
    }
    return sum + (taxable * (taxRate.rate_percent / 100))
  }, 0)
})

const totalTax = computed(() => lineTaxTotal.value + billTaxTotal.value)

const totalAmount = computed(() => {
  return subtotal.value - totalDiscount.value + totalTax.value
})

/* -----------------------------
   FETCH
------------------------------ */
const loadVendors = async () => {
  try {
    const res = await api.get(`/companies/${companyId.value}/contacts`, {
      params: { type: "vendor" },
    })
    vendors.value = res.data.data ?? res.data
  } catch (err) {
    console.error("Failed to load vendors:", err)
  }
}

const loadPurchaseItems = async () => {
  try {
    const res = await api.get(`/companies/${companyId.value}/items`, {
      params: { for_purchase: true, active_only: true },
    })
    items.value = res.data.data ?? res.data 
  } catch (err) {
    console.error("Failed to load items:", err)
  }
}

const loadPurchaseTaxRates = async () => {
  try {
    const res = await api.get(`/companies/${companyId.value}/tax-rates`, {
      params: { applies_to: "PURCHASES", active_only: true },
    })
    taxRates.value = res.data.data ?? res.data
  } catch (err) {
    console.error("Failed to load tax rates:", err)
  }
}

const loadBill = async () => {
  if (!isEditMode.value) return

  try {
    loading.value = true
    const bill = await billService.get(billUuid.value)
    currentBill.value = bill  

    form.value = {
      vendor_id: bill.vendor?.id ?? null,
      bill_number: bill.bill_number,
      issue_date: bill.issue_date || "",
      due_date: bill.due_date || "", 
      notes: bill.notes || "",
      items: bill.items?.map((item: BillItem) => ({
        item_id: item.item_id,
        item: item.item,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        taxes: (item.line_taxes || []).map(lt => ({
          tax_rate_id: lt.tax_rate_id,
          is_compound: lt.is_compound || false,
          compound_order: lt.compound_order || 1,
        })),
      })) || [],
      bill_taxes: bill.taxes?.map((t: BillTax) => ({
        tax_rate_id: t.tax_rate_id,
        is_compound: t.is_compound || false,
        compound_order: t.compound_order || 1,
      })) || [],
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to load bill"
    console.error(err)
  } finally {
    loading.value = false
  }
}

/* -----------------------------
   ACTIONS
------------------------------ */
const addLineItem = () => {
  form.value.items.push({
    item_id: 0,
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    taxes: [],
  })
}

const removeLineItem = (index: number) => {
  form.value.items.splice(index, 1)
  // Clear any errors for this item
  Object.keys(formErrors.value).forEach(key => {
    if (key.startsWith(`items.${index}.`)) {
      delete formErrors.value[key]
    }
  })
}

const addLineTax = (index: number) => {
  if (!form.value.items[index]?.taxes) {
    form.value.items[index].taxes = []
  }
  form.value.items[index]?.taxes!.push({
    tax_rate_id: 0,
    is_compound: false,
    compound_order: (form.value.items[index]?.taxes?.length || 0) + 1,
  })
}

const removeLineTax = (itemIndex: number, taxIndex: number) => {
  form.value.items[itemIndex]?.taxes!.splice(taxIndex, 1)
  // Recalculate compound orders
  form.value.items[itemIndex]?.taxes?.forEach((t, i) => {
    t.compound_order = i + 1
  })
} 

const selectItem = (index: number) => {
  const item = form.value.items[index]
  const realItem = items.value.find(i => i.id === item?.item_id) 
  if (item && realItem) {
    item.item = realItem
    item.unit_price = realItem.sales_price || 0
  }
  delete formErrors.value[`items.${index}.item_id`]
}

const addBillTax = () => {
  form.value.bill_taxes.push({
    tax_rate_id: 0,
    is_compound: false,
    compound_order: form.value.bill_taxes.length + 1,
  })
}

const removeBillTax = (index: number) => {
  form.value.bill_taxes.splice(index, 1)
  // Recalculate compound orders
  form.value.bill_taxes.forEach((t, i) => {
    t.compound_order = i + 1
  })
} 

/* -----------------------------
   SAVE/POST FUNCTIONS
------------------------------ */
const saveBill = async (showMessage = true) => {
  try {
    saving.value = true
    clearErrors() 
    
    const payload = {
      ...form.value,
      vendor_id: form.value.vendor_id || undefined,
    } 

    let result
    if (isEditMode.value) {
      result = await billService.update(billUuid.value, payload) 
    } else {
      result = await billService.create(companyId.value, payload) 
      if (!billUuid.value || billUuid.value === 'new') {
        router.replace(`/app/${companyId.value}/bills/${result.uuid}`)
      }
    } 

    lastSaved.value = new Date()
    currentBill.value = result

    form.value.bill_number = result.bill_number
    if (showMessage) {
      showSuccess("Bill saved successfully")
    }
  } catch (err: any) {
    handleApiError(err, "Failed to save bill")
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
    saveBill(false)
  }, 2500) 
}

const approveBill = async () => {
  if (!validateForm()) {
    return
  }
  
  if (!confirm("Approve this bill? This will create journal entries and cannot be undone.")) return

  try {
    approving.value = true
    clearErrors()

    // Save first if needed
    if (!currentBill.value) {
      await saveBill(false)
    }

    const result = await billService.approve(currentBill.value?.uuid || billUuid.value)
    currentBill.value = result

    showSuccess("Bill approved successfully")
     
    await loadBill()
  } catch (err: any) {
    handleApiError(err, "Failed to approve bill")
  } finally {
    approving.value = false
  }
}

const markAsPaid = async () => {
  if (!confirm("Mark this invoice as paid?")) return

  try {
    saving.value = true
    clearErrors()
    
    const result = await billService.markAsPaid(currentBill.value?.uuid || billUuid.value)
    currentBill.value = result 

    showSuccess("Bill marked as paid")
     
    await loadBill()
  } catch (err: any) {
    handleApiError(err, "Failed to mark as paid")
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push(`/app/${companyId.value}/bills`)
}

/* -----------------------------
   WATCHERS
------------------------------ */
watch(
  () => form.value,
  () => {
    // Clear errors when form changes
    if (hasErrors.value) {
      // Don't clear immediately, just clear as user fixes issues
    }
    
    if (isEditMode.value && currentBill.value?.can_be_edited) {
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
    currency: "USD",
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

function setDueDays(days: number) {
  const base = form.value.issue_date
    ? new Date(form.value.issue_date)
    : new Date()

  base.setDate(base.getDate() + days)
  form.value.due_date = toDateInputValue(base)
}

function setFirstNextMonth() {
  const d = new Date()
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  form.value.due_date = toDateInputValue(next)
}

function setEndNextMonth() {
  const d = new Date()
  const end = new Date(d.getFullYear(), d.getMonth() + 2, 0)
  form.value.due_date = toDateInputValue(end)
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(async () => {
  await Promise.all([loadVendors(), loadPurchaseItems(), loadPurchaseTaxRates(), loadBill()])
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
            {{ isEditMode ? `Edit Bill ${currentBill?.bill_number || ''}` : "New Bill" }}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <span v-if="currentBill?.status === 'draft'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              Draft
            </span>
            <span v-else-if="currentBill?.status === 'pending'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Pending
            </span>
            <span v-else-if="currentBill?.status === 'paid'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Paid
            </span>
            <span v-else-if="currentBill?.status === 'overdue'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              Overdue
            </span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="lastSaved" class="text-sm text-gray-500 dark:text-gray-400">
          Last saved: {{ formatDateTime(lastSaved) }}
        </span> 
        <button
          v-if="currentBill?.can_be_edited || !isEditMode"
          @click="saveBill()"
          :disabled="saving"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ saving ? 'Saving...' : 'Save Draft' }}
        </button>
        <button
          v-if="(currentBill?.can_be_edited && currentBill.status === 'draft') || (!isEditMode && form.items.length > 0)"
          @click="approveBill"
          :disabled="approving || saving"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="approving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ approving ? 'Approving...' : 'Approve Bill' }}
        </button>
        <button
          v-if="currentBill?.status === 'pending'"
          @click="markAsPaid"
          :disabled="saving"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          Mark as Paid
        </button>
      </div>
    </div>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3"
    >
      <svg class="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="flex-1">
        <p class="text-sm font-medium text-green-800 dark:text-green-200">{{ successMessage }}</p>
      </div>
      <button @click="clearSuccess" class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Error Messages -->
    <div
      v-if="hasErrors"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            {{ allErrorMessages.length === 1 ? 'Error' : `${allErrorMessages.length} Errors Found` }}
          </h3>
          <ul class="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
            <li v-for="(msg, index) in allErrorMessages" :key="index">{{ msg }}</li>
          </ul>
        </div>
        <button @click="clearErrors" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Form -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Form -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Bill Details -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bill Details</h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor <span class="text-red-500">*</span></label>
              <select
                v-model="form.vendor_id"
                :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.vendor_id }"
              >
                <option :value="null">Select vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.contact_name }} ({{ vendor.person_name ? `- ${vendor.person_name}` : '' }})
                </option>
              </select>
              <p v-if="formErrors.vendor_id" class="mt-1 text-sm text-red-600">{{ formErrors.vendor_id[0] }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bill Number</label>
              <input
                v-model="form.bill_number"
                :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                type="text"
                placeholder="Auto-generated if empty"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
              <input
                v-model="form.issue_date"
                :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                type="date"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>

              <div class="flex gap-2 items-start">
                <!-- Date Picker -->
                <input
                  v-model="form.due_date"
                  :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                  type="date"
                  class="flex-1 border rounded-lg px-3 py-2
                        bg-white dark:bg-slate-700
                        text-gray-900 dark:text-white
                        border-gray-300 dark:border-gray-600
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <!-- Quick Options -->
                <div v-if="currentBill?.status !== 'pending' && currentBill?.status !== 'paid'" class="flex flex-wrap gap-1">
                  <button
                    type="button"
                    class="preset-btn"
                    @click="setDueDays(7)"
                  >+7d</button>

                  <button
                    type="button"
                    class="preset-btn"
                    @click="setDueDays(14)"
                  >+14d</button>

                  <button
                    type="button"
                    class="preset-btn"
                    @click="setFirstNextMonth"
                  >1st next month</button>

                  <button
                    type="button"
                    class="preset-btn"
                    @click="setEndNextMonth"
                  >End next month</button>
                </div>
              </div>
            </div>  
          </div>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              v-model="form.notes"
              :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
              rows="2"
              placeholder="Additional notes..."
              class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>

        <!-- Line Items -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
            <button
              v-if="currentBill?.can_be_edited || !isEditMode"
              @click="addLineItem"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <p v-if="formErrors.items" class="mb-4 text-sm text-red-600 dark:text-red-400">
            {{ formErrors.items[0] }}
          </p>

          <div v-if="form.items.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg">
            <p>No items added yet</p>
            <p class="text-sm mt-1">Click "Add Item" to get started</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(item, index) in form.items"
              :key="index"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="grid grid-cols-12 gap-3 items-start">
                <div class="col-span-5">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Item</label>
                  <select
                    v-model="item.item_id"
                    :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                    @change="selectItem(index)"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option :value="null">Select item</option>
                    <option v-for="i in items" :key="i.id" :value="i.id">
                      {{ i.name }} ({{ i.sku }})
                    </option>
                  </select>
                  <p v-if="formErrors[`items.${index}.item_id`]" class="mt-1 text-xs text-red-600">
                    {{ formErrors[`items.${index}.item_id`][0] }}
                  </p>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                  <input
                    v-model.number="item.quantity"
                    :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                    type="number"
                    min="1"
                    step="1"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                  <p v-if="formErrors[`items.${index}.quantity`]" class="mt-1 text-xs text-red-600">
                    {{ formErrors[`items.${index}.quantity`][0] }}
                  </p>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                  <input
                    v-model.number="item.unit_price"
                    :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Discount %</label>
                  <input
                    v-model.number="item.discount_percent"
                    :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div class="col-span-1 pt-5">
                  <button
                    v-if="currentBill?.can_be_edited || !isEditMode"
                    @click="removeLineItem(index)"
                    class="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="mt-2 flex items-center justify-between">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  Subtotal: {{ formatCurrency((item.quantity || 0) * (item.unit_price || 0) - ((item.quantity || 0) * (item.unit_price || 0) * (item.discount_percent || 0) / 100)) }}
                </div>
                <button
                  v-if="currentBill?.can_be_edited || !isEditMode"
                  @click="addLineTax(index)"
                  class="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Tax
                </button>
              </div>

              <!-- Line Taxes -->
              <div v-if="item.taxes && item.taxes.length > 0" class="mt-2 space-y-1">
                <div 
                  v-for="(tax, taxIndex) in item.taxes" 
                  :key="taxIndex" 
                  class="flex items-center gap-2"
                >
                  <select
                    v-model="tax.tax_rate_id"
                    :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                    class="text-xs border rounded px-2 py-1 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600"
                  >
                    <option :value="0">Select tax</option>
                    <option v-for="tr in taxRates" :key="tr.id" :value="tr.id">
                      {{ tr.tax_name }} ({{ tr.rate_percent }}%)
                    </option>
                  </select>
                  <button
                    v-if="currentBill?.can_be_edited || !isEditMode"
                    @click="removeLineTax(index, taxIndex)"
                    class="text-red-600 hover:text-red-700"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bill-level Taxes -->
        <div v-if="form.items.length > 0" class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Bill-level Taxes</h2>
            <button
              v-if="currentBill?.can_be_edited || !isEditMode"
              @click="addBillTax"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Tax
            </button>
          </div>

          <div v-if="form.bill_taxes.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            No additional taxes
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(tax, index) in form.bill_taxes"
              :key="index"
              class="flex items-center gap-3"
            >
              <select
                v-model="tax.tax_rate_id"
                :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                class="flex-1 border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              >
                <option :value="0">Select tax</option>
                <option v-for="tr in taxRates" :key="tr.id" :value="tr.id">
                  {{ tr.tax_name }} ({{ tr.rate_percent }}%)
                </option>
              </select>
              <label class="flex items-center gap-1 text-sm">
                <input
                  v-model="tax.is_compound"
                  :disabled="currentBill?.status === 'pending' || currentBill?.status === 'paid'"
                  type="checkbox"
                  class="rounded border-gray-300"
                />
                Compound
              </label>
              <button
                v-if="currentBill?.can_be_edited || !isEditMode"
                @click="removeBillTax(index)"
                class="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Sidebar -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6 sticky top-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
          
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span class="text-gray-900 dark:text-white font-medium">{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Discount</span>
              <span class="text-red-600 dark:text-red-400">-{{ formatCurrency(totalDiscount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Tax (Line)</span>
              <span class="text-gray-900 dark:text-white">{{ formatCurrency(lineTaxTotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Tax (Bill)</span>
              <span class="text-gray-900 dark:text-white">{{ formatCurrency(billTaxTotal) }}</span>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
              <span class="text-gray-900 dark:text-white font-semibold">Total</span>
              <span class="text-gray-900 dark:text-white font-bold text-lg">{{ formatCurrency(totalAmount) }}</span>
            </div>
            <div v-if="currentBill?.amount_paid" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Paid</span>
              <span class="text-green-600 dark:text-green-400">{{ formatCurrency(currentBill.amount_paid) }}</span>
            </div>
            <div v-if="currentBill?.amount_due" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Amount Due</span>
              <span class="text-orange-600 dark:text-orange-400 font-medium">{{ formatCurrency(currentBill.amount_due) }}</span>
            </div>
          </div>  

          <div class="mt-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p v-if="currentBill?.status === 'draft'"><strong>Draft:</strong> Save without validation</p>
              <p v-if="currentBill?.status === 'draft'"><strong>Post:</strong> Creates journal entry & marks as pending</p>
              <p v-if="currentBill?.status === 'pending' || currentBill?.status === 'paid'" class="text-yellow-600 dark:text-yellow-400 mt-2">⚠️ Posted invoices cannot be edited</p>
            </div>
          </div>

          <!-- Journal Entry Info -->
          <div v-if="currentBill?.journal_entry" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Journal Entry</h3>
            <div class="text-xs space-y-1 text-gray-600 dark:text-gray-400">
              <p>Entry #: {{ currentBill.journal_entry.entry_number }}</p>
              <p>Date: {{ currentBill.journal_entry.entry_date }}</p>
              <p>Status: {{ currentBill.journal_entry.posted ? 'Posted' : 'Draft' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 
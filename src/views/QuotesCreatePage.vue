<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Quote, QuoteFormData, Contact, Item, TaxRate, QuoteItem, QuoteTax } from "@/types"
import { quoteService } from "@/services"
import api from "@/services/api"

const route = useRoute()
const router = useRouter()
const companyId = computed(() => route.params.companyId as string)
const quoteUuid = computed(() => route.params.uuid as string)
const isEditMode = computed(() => !!quoteUuid.value && quoteUuid.value !== 'new')

/* -----------------------------
   STATE
------------------------------ */
const loading = ref(false)
const saving = ref(false)
const sending = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lastSaved = ref<Date | null>(null)

const customers = ref<Contact[]>([])
const items = ref<Item[]>([])
const taxRates = ref<TaxRate[]>([])
const currentQuote = ref<Quote | null>(null)

// Calculate default expiry date (30 days from today)
const defaultExpiryDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().split("T")[0]!
}

const form = ref<QuoteFormData>({
  customer_id: null,
  quote_number: "",
  issue_date: new Date().toISOString().split("T")[0]!,
  delivery_date: "",
  expiry_date: defaultExpiryDate(),
  payment_terms: "",
  notes: "",
  terms: "",
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

// Expiry days calculation
const expiryDays = computed(() => {
  if (!form.value.issue_date || !form.value.expiry_date) return null
  const issue = new Date(form.value.issue_date)
  const expiry = new Date(form.value.expiry_date)
  const diffTime = expiry.getTime() - issue.getTime()
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
  
  if (!form.value.customer_id) {
    errors.push('Customer is required')
    formErrors.value.customer_id = ['Customer is required']
  }
  
  if (!form.value.issue_date) {
    errors.push('Issue date is required')
  }
  
  if (!form.value.expiry_date) {
    errors.push('Expiry date is required')
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
const loadCustomers = async () => {
  try {
    const response = await api.get(`/companies/${companyId.value}/contacts`, {
      params: { type: 'customer' }
    })
    customers.value = response.data.data || response.data
  } catch (err) {
    console.error("Failed to load customers:", err)
  }
}

const loadItems = async () => {
  try {
    const response = await api.get(`/companies/${companyId.value}/items`, {
      params: { is_sale: true, active_only: true },
    })
    items.value = response.data.data || response.data
  } catch (err) {
    console.error("Failed to load items:", err)
  }
}

const loadTaxRates = async () => {
  try {
    const response = await api.get(`/companies/${companyId.value}/tax-rates`, {
      params: { applies_to: "SALES", active_only: true },
    })
    taxRates.value = response.data.data || response.data
  } catch (err) {
    console.error("Failed to load tax rates:", err)
  }
}

const loadQuote = async () => {
  if (!isEditMode.value || quoteUuid.value === 'new') return
  
  try {
    loading.value = true
    const quote = await quoteService.get(quoteUuid.value)
    currentQuote.value = quote
     
    form.value = {
      customer_id: quote.customer?.id || null,
      quote_number: quote.quote_number,
      issue_date: quote.issue_date || '',
      delivery_date: quote.delivery_date || '',
      expiry_date: quote.expiry_date || '',
      payment_terms: quote.payment_terms || '',
      notes: quote.notes || '',
      terms: quote.terms || '',
      items: quote.items.map((item: QuoteItem) => ({
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
      order_taxes: quote.taxes.map((tax: QuoteTax) => ({
        tax_rate_id: tax.tax_rate_id,
        is_compound: tax.is_compound,
        compound_order: tax.compound_order,
      })),
    }
  } catch (err: any) {
    handleApiError(err, "Failed to load quote")
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
  form.value.items.splice(index + 1, 0, { ...item, taxes: [...item.taxes] })
}

const updateItemFromSelect = (index: number, itemId: number) => {
  const selectedItem = items.value.find(i => i.id === itemId)
  if (selectedItem) {
    form.value.items[index].item_id = itemId
    form.value.items[index].unit_price = selectedItem.sales_price || 0
    
    // Auto-add default tax if configured
    if (selectedItem.income_tax_id && !form.value.items[index].taxes.some(t => t.tax_rate_id === selectedItem.income_tax_id)) {
      form.value.items[index].taxes.push({
        tax_rate_id: selectedItem.income_tax_id,
        is_compound: false,
        compound_order: 1,
      })
    }
  }
}

const addItemTax = (itemIndex: number) => {
  if (!form.value.items[itemIndex].taxes) {
    form.value.items[itemIndex].taxes = []
  }
  
  form.value.items[itemIndex].taxes.push({
    tax_rate_id: 0,
    is_compound: false,
    compound_order: 1,
  })
}

const removeItemTax = (itemIndex: number, taxIndex: number) => {
  form.value.items[itemIndex].taxes.splice(taxIndex, 1)
}

/* -----------------------------
   ORDER TAX MANAGEMENT
------------------------------ */
const addOrderTax = () => {
  form.value.order_taxes.push({
    tax_rate_id: 0,
    is_compound: false,
    compound_order: 1,
  })
}

const removeOrderTax = (index: number) => {
  form.value.order_taxes.splice(index, 1)
}

/* -----------------------------
   SAVE/SUBMIT FUNCTIONS
------------------------------ */
const saveQuote = async (showMessage = true) => {
  try {
    saving.value = true
    clearErrors()

    const payload = {
      ...form.value,
      customer_id: form.value.customer_id || undefined,
    }

    let result
    if (isEditMode.value) {
      result = await quoteService.update(quoteUuid.value, payload)
    } else {
      result = await quoteService.create(companyId.value, payload)
      if (!quoteUuid.value || quoteUuid.value === 'new') {
        router.replace(`/app/${companyId.value}/quotes/${result.uuid}`)
      }
    }

    lastSaved.value = new Date()
    currentQuote.value = result
    form.value.quote_number = result.quote_number

    if (showMessage) {
      showSuccess("Quote saved successfully")
    }
  } catch (err: any) {
    handleApiError(err, "Failed to save quote")
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
    saveQuote(false)
  }, 2500)
}

const sendQuote = async () => {
  if (!validateForm()) return
  
  if (!confirm("Send this quote to the customer?")) return

  try {
    sending.value = true
    clearErrors()

    // Save first if needed
    if (!currentQuote.value) {
      await saveQuote(false)
    }

    const result = await quoteService.send(currentQuote.value?.uuid || quoteUuid.value)
    currentQuote.value = result

    showSuccess("Quote sent successfully")
    await loadQuote()
  } catch (err: any) {
    handleApiError(err, "Failed to send quote")
  } finally {
    sending.value = false
  }
}

const acceptQuote = async () => {
  if (!confirm("Accept this quote?")) return

  try {
    clearErrors()
    const result = await quoteService.accept(quoteUuid.value)
    currentQuote.value = result
    showSuccess("Quote accepted successfully")
    await loadQuote()
  } catch (err: any) {
    handleApiError(err, "Failed to accept quote")
  }
}

const declineQuote = async () => {
  const reason = prompt("Enter decline reason:")
  if (!reason) return

  try {
    clearErrors()
    const result = await quoteService.decline(quoteUuid.value, reason)
    currentQuote.value = result
    showSuccess("Quote declined")
    await loadQuote()
  } catch (err: any) {
    handleApiError(err, "Failed to decline quote")
  }
}

const convertToInvoice = async () => {
  if (!confirm("Convert this quote to an invoice?")) return

  try {
    clearErrors()
    const invoice = await quoteService.convertToInvoice(quoteUuid.value)
    showSuccess("Quote converted to invoice successfully")
    router.push(`/app/${companyId.value}/invoices/${invoice.uuid}`)
  } catch (err: any) {
    handleApiError(err, "Failed to convert quote to invoice")
  }
}

const goBack = () => {
  router.push(`/app/${companyId.value}/quotes`)
}

/* -----------------------------
   WATCHERS
------------------------------ */
watch(
  () => form.value,
  () => {
    if (isEditMode.value && currentQuote.value?.can_be_edited) {
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

function setExpiryDays(days: number) {
  const base = form.value.issue_date
    ? new Date(form.value.issue_date)
    : new Date()
  
  base.setDate(base.getDate() + days)
  form.value.expiry_date = toDateInputValue(base)
}

function setPaymentTerms(terms: string) {
  form.value.payment_terms = terms
}

/* -----------------------------
   LIFECYCLE
------------------------------ */
onMounted(async () => {
  await Promise.all([loadCustomers(), loadItems(), loadTaxRates(), loadQuote()])
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
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to quotes"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isEditMode ? `Edit Quote ${form.quote_number || ''}` : 'Create Quote' }}
          </h1>
          <p v-if="currentQuote" class="text-sm text-gray-500 mt-1">
            Status: 
            <span :class="{
              'text-gray-600': currentQuote.status === 'draft',
              'text-blue-600': currentQuote.status === 'sent',
              'text-green-600': currentQuote.status === 'accepted',
              'text-red-600': currentQuote.status === 'declined',
              'text-orange-600': currentQuote.status === 'expired',
            }" class="font-medium capitalize">
              {{ currentQuote.status }}
            </span>
            <span v-if="lastSaved" class="ml-4">
              Last saved: {{ formatDateTime(lastSaved) }}
            </span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Action buttons based on status -->
        <button
          v-if="currentQuote?.can_be_sent"
          @click="sendQuote"
          :disabled="sending || !validateForm()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ sending ? 'Sending...' : 'Send to Customer' }}
        </button>

        <button
          v-if="currentQuote?.can_be_accepted"
          @click="acceptQuote"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow transition-colors font-medium"
        >
          Accept Quote
        </button>

        <button
          v-if="currentQuote?.can_be_accepted"
          @click="declineQuote"
          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow transition-colors font-medium"
        >
          Decline Quote
        </button>

        <button
          v-if="currentQuote?.can_be_converted_to_invoice"
          @click="convertToInvoice"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow transition-colors font-medium"
        >
          Convert to Invoice
        </button>

        <button
          v-if="!currentQuote || currentQuote?.can_be_edited"
          @click="saveQuote(true)"
          :disabled="saving"
          class="bg-[#253D90] hover:bg-[#1e327a] text-white px-4 py-2 rounded-md shadow transition-colors font-medium disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Quote' }}
        </button>
      </div>
    </div>

    <!-- Error Messages -->
    <div v-if="hasErrors" class="bg-red-50 border-l-4 border-red-400 p-4 rounded">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            There were errors with your submission
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <ul class="list-disc list-inside space-y-1">
              <li v-for="(msg, index) in allErrorMessages" :key="index">{{ msg }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="bg-green-50 border-l-4 border-green-400 p-4 rounded">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#253D90]"></div>
    </div>

    <!-- Main Form -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Form Fields -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Basic Information Card -->
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Quote Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Customer -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Customer <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.customer_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                :class="{ 'border-red-500': formErrors.customer }"
              >
                <option :value="null">Select customer</option>
                <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                  {{ customer.contact_name }}
                </option>
              </select>
              <p v-if="formErrors.customer_id" class="mt-1 text-sm text-red-600">
                {{ formErrors.customer_id[0] }}
              </p>
            </div>

            <!-- Quote Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Quote Number</label>
              <input
                v-model="form.quote_number"
                type="text"
                placeholder="Auto-generated"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90] bg-gray-50"
                readonly
              />
              <p class="mt-1 text-xs text-gray-500">Will be auto-generated on save</p>
            </div>

            <!-- Issue Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Issue Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.issue_date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                :class="{ 'border-red-500': formErrors.issue_date }"
              />
            </div>

            <!-- Expiry Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.expiry_date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                :class="{ 'border-red-500': formErrors.expiry_date }"
              />
              <div class="mt-1 flex gap-2">
                <button @click="setExpiryDays(30)" class="text-xs text-blue-600 hover:underline">30 days</button>
                <button @click="setExpiryDays(60)" class="text-xs text-blue-600 hover:underline">60 days</button>
                <button @click="setExpiryDays(90)" class="text-xs text-blue-600 hover:underline">90 days</button>
              </div>
              <p v-if="expiryDays" class="mt-1 text-xs text-gray-500">
                {{ expiryDays }} days from issue date
              </p>
            </div>

            <!-- Delivery Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.delivery_date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                :class="{ 'border-red-500': formErrors.delivery_date }"
              />
              <div class="mt-1 flex gap-2">
                <button @click="setDeliveryDays(7)" class="text-xs text-blue-600 hover:underline">7 days</button>
                <button @click="setDeliveryDays(14)" class="text-xs text-blue-600 hover:underline">14 days</button>
                <button @click="setDeliveryDays(30)" class="text-xs text-blue-600 hover:underline">30 days</button>
              </div>
              <p v-if="deliveryDays" class="mt-1 text-xs text-gray-500">
                {{ deliveryDays }} days from issue date
              </p>
            </div>

            <!-- Payment Terms -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <input
                v-model="form.payment_terms"
                type="text"
                placeholder="e.g., Net 30, 50% upfront"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
              />
              <div class="mt-1 flex gap-2">
                <button @click="setPaymentTerms('Net 30')" class="text-xs text-blue-600 hover:underline">Net 30</button>
                <button @click="setPaymentTerms('Net 60')" class="text-xs text-blue-600 hover:underline">Net 60</button>
                <button @click="setPaymentTerms('50% upfront, 50% on delivery')" class="text-xs text-blue-600 hover:underline">50/50</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Line Items Card -->
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Line Items</h2>
            <button
              @click="addItem"
              class="bg-[#253D90] hover:bg-[#1e327a] text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              + Add Item
            </button>
          </div>

          <div v-if="form.items.length === 0" class="text-center py-8 text-gray-500">
            <p>No items added yet. Click "Add Item" to get started.</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(item, index) in form.items"
              :key="index"
              class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div class="flex justify-between items-start mb-3">
                <h3 class="font-medium text-gray-900">Item {{ index + 1 }}</h3>
                <div class="flex gap-2">
                  <button
                    @click="duplicateItem(index)"
                    class="text-blue-600 hover:text-blue-800 text-sm"
                    title="Duplicate"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    @click="removeItem(index)"
                    class="text-red-600 hover:text-red-800 text-sm"
                    title="Remove"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Product/Service -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Product/Service <span class="text-red-500">*</span>
                  </label>
                  <select
                    :value="item.item_id"
                    @change="(e) => updateItemFromSelect(index, Number((e.target as HTMLSelectElement).value))"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                  >
                    <option :value="0">Select item</option>
                    <option v-for="availableItem in items" :key="availableItem.id" :value="availableItem.id">
                      {{ availableItem.name }} ({{ availableItem.sku }})
                    </option>
                  </select>
                </div>

                <!-- Quantity -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                  />
                </div>

                <!-- Unit Price -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    v-model.number="item.unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                  />
                </div>

                <!-- Discount % -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    v-model.number="item.discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                  />
                </div>

                <!-- Line Total (read-only) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Line Total</label>
                  <input
                    :value="formatCurrency((item.quantity * item.unit_price) * (1 - (item.discount_percent || 0) / 100))"
                    type="text"
                    readonly
                    class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <!-- Notes -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    v-model="item.notes"
                    rows="2"
                    placeholder="Additional notes for this item..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                  ></textarea>
                </div>

                <!-- Item Taxes -->
                <div class="md:col-span-2">
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-medium text-gray-700">Item-Level Taxes</label>
                    <button
                      @click="addItemTax(index)"
                      class="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Tax
                    </button>
                  </div>
                  
                  <div v-if="item.taxes.length > 0" class="space-y-2">
                    <div
                      v-for="(tax, taxIndex) in item.taxes"
                      :key="taxIndex"
                      class="flex gap-2 items-start"
                    >
                      <select
                        v-model="tax.tax_rate_id"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
                      >
                        <option :value="0">Select tax</option>
                        <option v-for="rate in taxRates" :key="rate.id" :value="rate.id">
                          {{ rate.tax_name }} ({{ rate.rate_percent }}%)
                        </option>
                      </select>
                      <button
                        @click="removeItemTax(index, taxIndex)"
                        class="p-2 text-red-600 hover:text-red-800"
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
          </div>
        </div>

        <!-- Order-Level Taxes -->
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Order-Level Taxes</h2>
            <button
              @click="addOrderTax"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Tax
            </button>
          </div>

          <div v-if="form.order_taxes.length === 0" class="text-center py-4 text-gray-500 text-sm">
            No order-level taxes. Add taxes that apply to the entire order.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(tax, index) in form.order_taxes"
              :key="index"
              class="flex gap-2 items-start"
            >
              <select
                v-model="tax.tax_rate_id"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
              >
                <option :value="0">Select tax</option>
                <option v-for="rate in taxRates" :key="rate.id" :value="rate.id">
                  {{ rate.tax_name }} ({{ rate.rate_percent }}%)
                </option>
              </select>
              <button
                @click="removeOrderTax(index)"
                class="p-2 text-red-600 hover:text-red-800"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Notes & Terms -->
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Internal notes (not visible to customer)..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea
                v-model="form.terms"
                rows="4"
                placeholder="Terms and conditions visible to customer..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253D90]"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary -->
      <div class="lg:col-span-1">
        <div class="bg-white shadow rounded-lg p-6 sticky top-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h2>
          
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Subtotal:</span>
              <span class="font-medium">{{ formatCurrency(subtotal) }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Discount:</span>
              <span class="font-medium text-red-600">-{{ formatCurrency(totalDiscount) }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Tax:</span>
              <span class="font-medium">{{ formatCurrency(taxAmount) }}</span>
            </div>

            <div class="border-t pt-3 mt-3">
              <div class="flex justify-between">
                <span class="font-semibold text-gray-900">Total:</span>
                <span class="font-bold text-lg text-gray-900">{{ formatCurrency(totalAmount) }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentQuote" class="mt-6 pt-6 border-t space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Created:</span>
              <span>{{ new Date(currentQuote.created_at).toLocaleDateString() }}</span>
            </div>
            <div v-if="currentQuote.sent_at" class="flex justify-between">
              <span class="text-gray-600">Sent:</span>
              <span>{{ new Date(currentQuote.sent_at).toLocaleDateString() }}</span>
            </div>
            <div v-if="currentQuote.accepted_at" class="flex justify-between">
              <span class="text-gray-600">Accepted:</span>
              <span>{{ new Date(currentQuote.accepted_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
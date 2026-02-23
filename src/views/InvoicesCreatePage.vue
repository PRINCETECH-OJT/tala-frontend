<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Invoice, InvoiceFormData, InvoiceItem, Contact, Item, TaxRate } from "@/types"
import invoiceService from "@/services/invoiceService"
import api from "@/services/api"

const route = useRoute()
const router = useRouter()
const companyId = computed(() => route.params.companyId as string)
const invoiceUuid = computed(() => route.params.uuid as string)
const isEditMode = computed(() => !!invoiceUuid.value && invoiceUuid.value !== 'new')

/* -----------------------------
   STATE
------------------------------ */
const loading = ref(false)
const saving = ref(false)
const posting = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lastSaved = ref<Date | null>(null)

const customers = ref<Contact[]>([])
const items = ref<Item[]>([])
const taxRates = ref<TaxRate[]>([])
const currentInvoice = ref<Invoice | null>(null)

const form = ref<InvoiceFormData>({
  customer_id: null,
  invoice_number: "",
  issue_date: new Date().toISOString().split("T")[0]!,
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  discount_amount: 0,
  status: "draft",
  notes: "",
  items: [],
  invoice_taxes: [],
})

const formErrors = ref<Record<string, string[]>>({})
const autoSaveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

/* -----------------------------
   COMPUTED
------------------------------ */
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => {
    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0)
    const discount = lineSubtotal * ((item.discount_percent || 0) / 100)
    return sum + lineSubtotal - discount
  }, 0)
})

const totalDiscount = computed(() => {
  return form.value.discount_amount || 0
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

const invoiceTaxTotal = computed(() => {
  const taxableAmount = subtotal.value - totalDiscount.value
  return form.value.invoice_taxes.reduce((sum, tax) => {
    const taxRate = taxRates.value.find(t => t.id === tax.tax_rate_id)
    if (!taxRate) return sum
    let taxable = tax.custom_taxable_amount ?? taxableAmount
    if (tax.is_compound) {
      const previousTaxes = form.value.invoice_taxes
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

const totalTax = computed(() => lineTaxTotal.value + invoiceTaxTotal.value)

const totalAmount = computed(() => {
  return subtotal.value - totalDiscount.value + totalTax.value
})

/* -----------------------------
   FETCH
------------------------------ */
const loadCustomers = async () => {
  try {
    const res = await api.get(`/companies/${companyId.value}/contacts`, {
      params: { type: "customer" },
    })
    customers.value = res.data.data ?? res.data
  } catch (err) {
    console.error("Failed to load customers:", err)
  }
}

const loadItems = async () => {
  try {
    const res = await api.get(`/companies/${companyId.value}/items`)
    items.value = res.data.data ?? res.data 
  } catch (err) {
    console.error("Failed to load items:", err)
  }
}

const loadTaxRates = async () => {
  try {
    const res = await api.get(`/companies/${companyId.value}/tax-rates`, {
      params: { for_sales: true, active_only: true },
    })
    taxRates.value = res.data.data ?? res.data
  } catch (err) {
    console.error("Failed to load tax rates:", err)
  }
}

const loadInvoice = async () => {
  if (!isEditMode.value) return

  try {
    loading.value = true
    const invoice = await invoiceService.get(invoiceUuid.value)
    currentInvoice.value = invoice 

    form.value = {
      customer_id: invoice.customer?.id ?? null,
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date || "",
      due_date: invoice.due_date || "",
      discount_amount: invoice.discount_amount || 0,
      status: invoice.status as "draft" | "sent",
      notes: invoice.notes || "",
      items: invoice.items?.map((item: InvoiceItem) => ({
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
      invoice_taxes: invoice.taxes?.map(t => ({
        tax_rate_id: t.tax_rate_id,
        is_compound: t.is_compound || false,
        compound_order: t.compound_order || 1,
      })) || [],
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to load invoice"
    console.error(err)
  } finally {
    loading.value = false
  }
}

/* -----------------------------
   ACTIONS
------------------------------ */
const addItem = () => {
  form.value.items.push({
    item_id: null,
    item: undefined,
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    taxes: [],
  })
}

const removeItem = (index: number) => {
  form.value.items.splice(index, 1)
}

const selectItem = (index: number) => {
  const item = form.value.items[index]
  const realItem = items.value.find(i => i.id === item?.item_id) 
  if (item && realItem) {
    item.item = realItem
    item.unit_price = realItem.sales_price || 0
  }
}

const addInvoiceTax = () => {
  form.value.invoice_taxes.push({
    tax_rate_id: 0,
    is_compound: false,
    compound_order: form.value.invoice_taxes.length + 1,
  })
}

const removeInvoiceTax = (index: number) => {
  form.value.invoice_taxes.splice(index, 1)
  // Recalculate compound orders
  form.value.invoice_taxes.forEach((t, i) => {
    t.compound_order = i + 1
  })
}

const saveInvoice = async (showMessage = true) => {
  try {
    saving.value = true
    error.value = null
    formErrors.value = {}

    const payload = {
      ...form.value,
      customer_id: form.value.customer_id || undefined,
    }
    console.log(payload)

    let result
    if (isEditMode.value) {
      result = await invoiceService.update(invoiceUuid.value, payload)
      console.log(result)
    } else {
      result = await invoiceService.create(companyId.value, payload)
      console.log(result)
      if (!invoiceUuid.value || invoiceUuid.value === 'new') {
        router.replace(`/app/${companyId.value}/invoices/${result.uuid}`)
      }
    }
    console.log("Save result:", result)

    lastSaved.value = new Date()
    currentInvoice.value = result
    if (showMessage) {
      successMessage.value = "Invoice saved successfully"
      setTimeout(() => {
        successMessage.value = null
      }, 3000)
    }
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } }
    if (e.response?.status === 422) {
      formErrors.value = e.response.data?.errors || {}
    } else {
      error.value = e.response?.data?.message || "Failed to save invoice"
    }
    console.error(err)
  } finally {
    saving.value = false
  }
}

const autoSave = () => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
  autoSaveTimeout.value = setTimeout(() => {
    saveInvoice(false)
  }, 2000)
}

const postInvoice = async () => {
  if (!confirm("Post this invoice? This will create journal entries and cannot be undone.")) return

  try {
    posting.value = true
    error.value = null

    // Save first if needed
    if (!currentInvoice.value) {
      await saveInvoice(false)
    }

    const result = await invoiceService.post(currentInvoice.value?.uuid || invoiceUuid.value)
    currentInvoice.value = result
    
    successMessage.value = "Invoice posted successfully"
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to post invoice"
    console.error(err)
  } finally {
    posting.value = false
  }
}

const markAsPaid = async () => {
  if (!confirm("Mark this invoice as paid?")) return

  try {
    saving.value = true
    const result = await invoiceService.markAsPaid(currentInvoice.value?.uuid || invoiceUuid.value)
    currentInvoice.value = result
    form.value.status = "paid"
    
    successMessage.value = "Invoice marked as paid"
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || "Failed to mark as paid"
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push(`/app/${companyId.value}/invoices`)
}

/* -----------------------------
   WATCHERS
------------------------------ */
watch(
  () => form.value,
  () => {
    if (isEditMode.value && currentInvoice.value?.can_be_edited) {
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
  await Promise.all([loadCustomers(), loadItems(), loadTaxRates(), loadInvoice()])
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
            {{ isEditMode ? `Edit Invoice ${currentInvoice?.invoice_number || ''}` : "New Invoice" }}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ form.status === 'draft' ? 'Draft' : form.status === 'sent' ? 'Sent' : '' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="lastSaved" class="text-sm text-gray-500 dark:text-gray-400">
          Last saved: {{ formatDateTime(lastSaved) }}
        </span>
        <span v-if="successMessage" class="text-sm text-green-600 dark:text-green-400">
          {{ successMessage }}
        </span>
        <button
          v-if="currentInvoice?.can_be_edited || !isEditMode"
          @click="saveInvoice()"
          :disabled="saving"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button
          v-if="currentInvoice?.can_be_edited && form.status === 'draft'"
          @click="postInvoice"
          :disabled="posting"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="posting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ posting ? 'Posting...' : 'Post Invoice' }}
        </button>
        <button
          v-if="currentInvoice?.status === 'sent'"
          @click="markAsPaid"
          :disabled="saving"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          Mark as Paid
        </button>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Form -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Form -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Invoice Details -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Details</h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer <span class="text-red-500">*</span></label>
              <select
                v-model="form.customer_id"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': formErrors.customer_id }"
              >
                <option :value="null">Select customer</option>
                <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                  {{ customer.contact_name }} ({{ customer.person_name ? `- ${customer.person_name}` : '' }})
                </option>
              </select>
              <p v-if="formErrors.customer_id" class="mt-1 text-sm text-red-600">{{ formErrors.customer_id[0] }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Number</label>
              <input
                v-model="form.invoice_number"
                type="text"
                placeholder="Auto-generated if empty"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
              <input
                v-model="form.issue_date"
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
                  type="date"
                  class="flex-1 border rounded-lg px-3 py-2
                        bg-white dark:bg-slate-700
                        text-gray-900 dark:text-white
                        border-gray-300 dark:border-gray-600
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <!-- Quick Options -->
                <div class="flex flex-wrap gap-1">
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
                  >1st next</button>

                  <button
                    type="button"
                    class="preset-btn"
                    @click="setEndNextMonth"
                  >End next</button>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                v-model="form.status"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Amount</label>
              <input
                v-model.number="form.discount_amount"
                type="number"
                min="0"
                step="0.01"
                class="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              v-model="form.notes"
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
              v-if="currentInvoice?.can_be_edited || !isEditMode"
              @click="addItem"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div v-if="form.items.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            No items added yet
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
                    @change="selectItem(index)"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option :value="null">Select item</option>
                    <option v-for="i in items" :key="i.id" :value="i.id">
                      {{ i.name }} ({{ i.sku }})
                    </option>
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                  <input
                    v-model.number="item.unit_price"
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
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div class="col-span-1 pt-5">
                  <button
                    v-if="currentInvoice?.can_be_edited || !isEditMode"
                    @click="removeItem(index)"
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
                  v-if="currentInvoice?.can_be_edited || !isEditMode"
                  @click="item.taxes.push({ tax_rate_id: 0, is_compound: false, compound_order: 1 })"
                  class="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Tax
                </button>
              </div>
              <div v-if="item.taxes && item.taxes.length > 0" class="mt-2 space-y-1">
                <div v-for="(tax, taxIndex) in item.taxes" :key="taxIndex" class="flex items-center gap-2">
                  <select
                    v-model="tax.tax_rate_id"
                    class="text-xs border rounded px-2 py-1 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600"
                  >
                    <option :value="0">Select tax</option>
                    <option v-for="tr in taxRates" :key="tr.id" :value="tr.id">
                      {{ tr.tax_name }} ({{ tr.rate_percent }}%)
                    </option>
                  </select>
                  <button
                    @click="item.taxes.splice(taxIndex, 1)"
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

        <!-- Invoice-level Taxes -->
        <div v-if="form.items.length > 0" class="bg-white dark:bg-slate-800 rounded-xl shadow border p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Invoice-level Taxes</h2>
            <button
              v-if="currentInvoice?.can_be_edited || !isEditMode"
              @click="addInvoiceTax"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Tax
            </button>
          </div>

          <div v-if="form.invoice_taxes.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            No additional taxes
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(tax, index) in form.invoice_taxes"
              :key="index"
              class="flex items-center gap-3"
            >
              <select
                v-model="tax.tax_rate_id"
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
                  type="checkbox"
                  class="rounded border-gray-300"
                />
                Compound
              </label>
              <button
                v-if="currentInvoice?.can_be_edited || !isEditMode"
                @click="removeInvoiceTax(index)"
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
              <span class="text-gray-600 dark:text-gray-400">Tax (Invoice)</span>
              <span class="text-gray-900 dark:text-white">{{ formatCurrency(invoiceTaxTotal) }}</span>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
              <span class="text-gray-900 dark:text-white font-semibold">Total</span>
              <span class="text-gray-900 dark:text-white font-bold text-lg">{{ formatCurrency(totalAmount) }}</span>
            </div>
            <div v-if="currentInvoice?.amount_paid" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Paid</span>
              <span class="text-green-600 dark:text-green-400">{{ formatCurrency(currentInvoice.amount_paid) }}</span>
            </div>
            <div v-if="currentInvoice?.amount_due" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Amount Due</span>
              <span class="text-orange-600 dark:text-orange-400 font-medium">{{ formatCurrency(currentInvoice.amount_due) }}</span>
            </div>
          </div>

          <!-- Journal Entry Info -->
          <div v-if="currentInvoice?.journal_entry" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Journal Entry</h3>
            <div class="text-xs space-y-1 text-gray-600 dark:text-gray-400">
              <p>Entry #: {{ currentInvoice.journal_entry.entry_number }}</p>
              <p>Date: {{ currentInvoice.journal_entry.entry_date }}</p>
              <p>Status: {{ currentInvoice.journal_entry.posted ? 'Posted' : 'Draft' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 
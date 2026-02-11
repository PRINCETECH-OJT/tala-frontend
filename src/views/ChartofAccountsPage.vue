<script setup lang="ts">
import { onMounted, ref } from "vue"
import api from "@/services/api"

interface AccountType {
  id: number
  uuid: string
  type_name: string
  category: string
  normal_balance: string
}

interface Account {
  id: number
  uuid: string
  number: string
  name: string
  full_number?: string
  full_name?: string
  is_active: boolean
  account_type: {
    type_name: string
    category: string
    normal_balance: string
  }
}

/* -----------------------------
   TABLE STATE
------------------------------ */
const accounts = ref<Account[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const fetchAccounts = async () => {
  try {
    loading.value = true
    const response = await api.get("/api/accounts/")
    accounts.value = response.data.data ?? response.data
  } catch (err) {
    error.value = "Failed to load accounts"
  } finally {
    loading.value = false
  }
}

/* -----------------------------
   MODAL STATE
------------------------------ */
const showModal = ref(false)
const loadingTypes = ref(false)
const accountTypes = ref<AccountType[]>([])

const form = ref({
  number: "",
  name: "",
  account_type_id: "",
  description: "",
  is_active: true,
})

const openModal = async () => {
  showModal.value = true

  // Load only when modal is opened
  if (accountTypes.value.length === 0) {
    try {
      loadingTypes.value = true
      const res = await api.get("/api/account-types/")
      accountTypes.value = res.data.data ?? res.data
    } catch {
      alert("Failed to load account types")
    } finally {
      loadingTypes.value = false
    }
  }
}

const closeModal = () => {
  showModal.value = false
}

const createAccount = async () => {
  try {
    await api.post("/api/accounts/", form.value)

    closeModal()

    // reset form
    form.value = {
      number: "",
      name: "",
      account_type_id: "",
      description: "",
      is_active: true,
    }

    await fetchAccounts()
  } catch (err: any) {
    alert("Failed to create account")
  }
}

onMounted(fetchAccounts)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Chart of Accounts</h1>
        <p class="text-sm text-muted-foreground">
          Manage your company accounts
        </p>
      </div>

      <button
        @click="openModal"
        class="px-4 py-2 bg-primary text-white rounded-lg shadow hover:opacity-90 transition"
      >
        + Create Account
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow border overflow-hidden">
      <div v-if="loading" class="p-6 text-center text-sm">
        Loading accounts...
      </div>

      <table v-else class="min-w-full text-sm">
        <thead class="bg-slate-100 dark:bg-slate-700 text-left">
          <tr>
            <th class="px-4 py-3">Code</th>
            <th class="px-4 py-3">Name</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Category</th>
            <th class="px-4 py-3">Normal Balance</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="account in accounts"
            :key="account.uuid"
            class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <td class="px-4 py-3 font-medium">
              {{ account.full_number ?? account.number }}
            </td>
            <td class="px-4 py-3">
              {{ account.full_name ?? account.name }}
            </td>
            <td class="px-4 py-3">
              {{ account.account_type?.type_name }}
            </td>
            <td class="px-4 py-3 capitalize">
              {{ account.account_type?.category }}
            </td>
            <td class="px-4 py-3">
              <span
                :class="account.account_type?.normal_balance === 'DR'
                  ? 'text-blue-600'
                  : 'text-green-600'"
              >
                {{ account.account_type?.normal_balance }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                :class="account.is_active
                  ? 'text-green-600'
                  : 'text-red-500'"
              >
                {{ account.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- =========================
         MODAL
    ========================== -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h2 class="text-xl font-semibold">Create Account</h2>

        <!-- Number -->
        <div>
          <label class="text-sm font-medium">Account Code</label>
          <input
            v-model="form.number"
            type="text"
            class="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>

        <!-- Name -->
        <div>
          <label class="text-sm font-medium">Account Name</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>

        <!-- Account Type -->
        <div>
          <label class="text-sm font-medium">Account Type</label>

          <select
            v-model="form.account_type_id"
            class="w-full mt-1 border rounded-lg px-3 py-2"
          >
            <option value="">Select Type</option>

            <option
              v-for="type in accountTypes"
              :key="type.id"
              :value="type.id"
            >
              {{ type.type_name }} ({{ type.category }} - {{ type.normal_balance }})
            </option>
          </select>

          <div v-if="loadingTypes" class="text-xs mt-1 text-muted-foreground">
            Loading account types...
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="text-sm font-medium">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>

        <!-- Active -->
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            v-model="form.is_active"
          />
          <label class="text-sm">Active</label>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            @click="closeModal"
            class="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            @click="createAccount"
            class="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

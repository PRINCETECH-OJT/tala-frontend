<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCompanyStore } from "@/stores/company";
import api from "@/services/api";

const companyStore = useCompanyStore();
const router = useRouter();
const loading = ref(false);
const errors = ref<Record<string, string[]>>({});

const form = reactive({
  company_name: "",
  legal_name: "",
  tax_id: "",
  address: "",
  email: "",
  fiscal_year_start: "",
  base_currency: "PHP",
});

const submitCompany = async () => {
  loading.value = true;
  errors.value = {};

  try {
    const res = await api.post("/companies", form); 
    const newCompany = res.data.data; 

    companyStore.addCompany(newCompany);

    router.push(`/app/${newCompany.id}/dashboard`);
  } catch (error: any) {
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors;
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex justify-center items-center min-h-screen bg-gray-50">
    <Card class="w-full max-w-2xl shadow-xl">
      <CardContent class="p-8 space-y-6">
        <h2 class="text-2xl font-bold text-blue-900 text-center">
          Set Up Your Company
        </h2>

        <!-- Company Basic Info -->
        <div class="grid grid-cols-2 gap-6">
          <!-- Company Name -->
          <div class="space-y-1">
            <label for="company_name" class="text-sm font-medium text-gray-700">
              Company Name
            </label>
            <Input
              id="company_name"
              v-model="form.company_name"
            />
            <p v-if="errors.company_name" class="text-sm text-red-500">
              {{ errors.company_name[0] }}
            </p>
          </div>

          <!-- Legal Name -->
          <div class="space-y-1">
            <label for="legal_name" class="text-sm font-medium text-gray-700">
              Legal Name
            </label>
            <Input
              id="legal_name"
              v-model="form.legal_name"
            />
            <p v-if="errors.legal_name" class="text-sm text-red-500">
              {{ errors.legal_name[0] }}
            </p>
          </div>

          <!-- Tax ID -->
          <div class="space-y-1">
            <label for="tax_id" class="text-sm font-medium text-gray-700">
              Tax ID
            </label>
            <Input
              id="tax_id"
              v-model="form.tax_id"
            />
            <p v-if="errors.tax_id" class="text-sm text-red-500">
              {{ errors.tax_id[0] }}
            </p>
          </div>

          <!-- Company Email -->
          <div class="space-y-1">
            <label for="email" class="text-sm font-medium text-gray-700">
              Company Email
            </label>
            <Input
              id="email"
              type="email"
              v-model="form.email"
            />
            <p v-if="errors.email" class="text-sm text-red-500">
              {{ errors.email[0] }}
            </p>
          </div>
        </div>

        <!-- Address -->
        <div class="space-y-1">
          <label for="address" class="text-sm font-medium text-gray-700">
            Company Address
          </label>
          <Input
            id="address"
            v-model="form.address"
          />
          <p v-if="errors.address" class="text-sm text-red-500">
            {{ errors.address[0] }}
          </p>
        </div>

        <!-- Fiscal + Currency -->
        <div class="grid grid-cols-2 gap-6">
          <!-- Fiscal Year Start -->
          <div class="space-y-1">
            <label for="fiscal_year_start" class="text-sm font-medium text-gray-700">
              Fiscal Year Start
            </label>
            <Input
              id="fiscal_year_start"
              type="date"
              v-model="form.fiscal_year_start"
            />
            <p v-if="errors.fiscal_year_start" class="text-sm text-red-500">
              {{ errors.fiscal_year_start[0] }}
            </p>
          </div>

          <!-- Base Currency -->
          <div class="space-y-1">
            <label for="base_currency" class="text-sm font-medium text-gray-700">
              Base Currency
            </label>
            <Input
              id="base_currency"
              v-model="form.base_currency"
            />
            <p v-if="errors.base_currency" class="text-sm text-red-500">
              {{ errors.base_currency[0] }}
            </p>
          </div>
        </div>

        <!-- Submit -->
        <Button
          class="w-full bg-blue-900 text-white"
          @click="submitCompany"
          :disabled="loading"
        >
          {{ loading ? "Creating..." : "Create Company" }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template> 
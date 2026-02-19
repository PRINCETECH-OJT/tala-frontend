<script setup lang="ts">
import { reactive, ref } from "vue";
import { cn } from "@/lib/utils";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCompanyStore } from "@/stores/company";
import api from "@/services/api";
import {} from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import type { CompanyForm } from "@/types/company";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const companyStore = useCompanyStore();
const router = useRouter();
const loading = ref(false);
const errors = ref<Record<string, string[]>>({});

const form = reactive<CompanyForm>({
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
  <div :class="cn('flex flex-col w-full max-w-xl mx-auto', props.class)">
    <Card class="border-none shadow-2xl bg-white overflow-hidden p-0">
      <div
        class="flex flex-row text-left bg-[#072069] gap-4 items-center p-5 md:p-6 w-full"
      >
        <div
          class="flex justify-center items-center bg-[#253D90] rounded-lg p-3 shrink-0"
        >
          <img src="/Skyscrapers.png" alt="skyscraper image" class="w-8 h-8" />
        </div>

        <div class="flex flex-col">
          <h2 class="text-xl md:text-2xl font-bold text-white leading-tight">
            General Information
          </h2>
          <p class="text-xs md:text-sm text-[#DFD9D9]">
            Basic details about your legal entity
          </p>
        </div>
      </div>

      <CardContent class="flex flex-col gap-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-1.5">
            <label
              for="company_name"
              class="text-xs font-bold text-blue-900 uppercase tracking-tight"
            >
              Company Name
            </label>
            <Input
              id="company_name"
              v-model="form.company_name"
              class="h-10 bg-blue-50/30 border-blue-100"
            />
            <p
              v-if="errors.company_name"
              class="text-[10px] text-red-500 font-medium"
            >
              {{ errors.company_name[0] }}
            </p>
          </div>

          <div class="space-y-1.5">
            <label
              for="legal_name"
              class="text-xs font-bold text-blue-900 uppercase tracking-tight"
            >
              Legal Name
            </label>
            <Input
              id="legal_name"
              v-model="form.legal_name"
              class="h-10 bg-blue-50/30 border-blue-100"
            />
            <p
              v-if="errors.legal_name"
              class="text-[10px] text-red-500 font-medium"
            >
              {{ errors.legal_name[0] }}
            </p>
          </div>

          <div class="space-y-1.5">
            <label
              for="tax_id"
              class="text-xs font-bold text-blue-900 uppercase tracking-tight"
            >
              Tax ID / TIN
            </label>
            <Input
              id="tax_id"
              v-model="form.tax_id"
              class="h-10 bg-blue-50/30 border-blue-100"
            />
          </div>

          <div class="space-y-1.5">
            <label
              for="email"
              class="text-xs font-bold text-blue-900 uppercase tracking-tight"
            >
              Company Email
            </label>
            <Input
              id="email"
              type="email"
              v-model="form.email"
              class="h-10 bg-blue-50/30 border-blue-100"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label
            for="address"
            class="text-xs font-bold text-blue-900 uppercase tracking-tight"
          >
            Business Address
          </label>
          <Input
            id="address"
            v-model="form.address"
            class="h-10 bg-blue-50/30 border-blue-100"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-1.5">
            <label
              for="fiscal_year_start"
              class="text-xs font-bold text-blue-900 uppercase tracking-tight"
            >
              Fiscal Year Start
            </label>
            <Input
              id="fiscal_year_start"
              type="date"
              v-model="form.fiscal_year_start"
              class="h-10 bg-blue-50/30 border-blue-100"
            />
          </div>

          <div class="space-y-1.5">
            <label
              for="base_currency"
              class="text-xs font-bold text-blue-900 uppercase tracking-tight"
            >
              Base Currency
            </label>
            <Input
              id="base_currency"
              v-model="form.base_currency"
              class="h-10 bg-blue-50/30 border-blue-100"
            />
          </div>
        </div>

        <Button
          class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold h-11 text-base mt-4 mb-5 shadow-lg transition-all"
          @click="submitCompany"
          :disabled="loading"
        >
          {{ loading ? "Initialzing System..." : "Complete Setup" }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>

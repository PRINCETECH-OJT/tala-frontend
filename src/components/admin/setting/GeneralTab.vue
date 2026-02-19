<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { useCompanyStore } from "@/stores/company";
import api from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-vue-next";

const companyStore = useCompanyStore();
const logoPreview = ref<string | null>(null);
const logoFile = ref<File | null>(null);

const form = reactive({
  company_name: "",
  legal_name: "",
  tax_id: "" as string | number,
  email: "",
  address: "",
  base_currency: "PHP",
  logo_url: null as string | null,
});

onMounted(() => {
  const company = companyStore.currentCompany;
  if (company) {
    form.company_name = company.name;
    form.legal_name = company.legal_name;
    form.tax_id = company.tax_id;
    form.email = company.email;
    form.address = company.address;
    form.base_currency = company.currency;
    form.logo_url = company.logo_url;
    logoPreview.value = company.logo_url;
  }
});

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    logoFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const saveSettings = async () => {
  if (!companyStore.currentCompany?.id) return;
  const formData = new FormData();
  formData.append("_method", "PUT");
  formData.append("company_name", form.company_name);
  formData.append("legal_name", form.legal_name);
  formData.append("tax_id", form.tax_id.toString());
  formData.append("email", form.email);
  formData.append("address", form.address);
  formData.append("base_currency", form.base_currency);
  if (logoFile.value) {
    formData.append("logo", logoFile.value);
  }

  const res = await api.post(
    `/companies/${companyStore.currentCompany.id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  companyStore.setCurrentCompany(res.data.data);
  return res.data.data;
};

defineExpose({
  saveSettings,
});
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <div class="grid gap-6 md:grid-cols-2">
      <Card class="border-slate-200 shadow-sm md:col-span-2">
        <CardHeader>
          <CardTitle class="text-lg text-blue-900"
            >Organization Profile</CardTitle
          >
          <CardDescription
            >Legal information used for tax and reporting.</CardDescription
          >
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="company_name">Company Name (Display)</Label>
            <Input id="company_name" v-model="form.company_name" />
          </div>

          <div class="space-y-2">
            <Label for="legal_name">Legal Entity Name</Label>
            <Input id="legal_name" v-model="form.legal_name" />
          </div>

          <div class="space-y-2">
            <Label for="tax_id">Tax Identification No. (TIN)</Label>
            <Input
              id="tax_id"
              v-model="form.tax_id"
              placeholder="e.g. 000-123-456"
            />
          </div>

          <div class="space-y-2">
            <Label for="email">Official Business Email</Label>
            <Input id="email" v-model="form.email" type="email" />
          </div>

          <div class="space-y-2 md:col-span-2">
            <Label for="address">Business Address</Label>
            <Textarea id="address" v-model="form.address" rows="3" />
          </div>
        </CardContent>
      </Card>

      <Card class="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle class="text-lg text-blue-900">Branding</CardTitle>
          <CardDescription
            >Upload your logo for official documents.</CardDescription
          >
        </CardHeader>
        <CardContent class="flex items-center gap-6">
          <div
            class="relative w-24 h-24 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="logoPreview"
              :src="logoPreview"
              class="object-contain w-full h-full"
            />
            <Upload v-else class="w-8 h-8 text-slate-300" />
          </div>
          <div class="space-y-2">
            <Label
              for="logo-upload"
              class="cursor-pointer bg-white border px-3 py-1.5 rounded-md text-sm hover:bg-slate-50 transition-all inline-block border-slate-300"
            >
              Change Logo
            </Label>
            <input
              id="logo-upload"
              type="file"
              class="hidden"
              @change="handleFileUpload"
              accept="image/*"
            />
            <p
              class="text-[10px] text-muted-foreground uppercase tracking-wider"
            >
              PNG or JPG (Max 2MB)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card class="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle class="text-lg text-blue-900">Regional</CardTitle>
          <CardDescription
            >Set the functional currency for this entity.</CardDescription
          >
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <Label>Base Currency</Label>
            <Select v-model="form.base_currency">
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

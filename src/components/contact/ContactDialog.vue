<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useCompanyStore } from "@/stores/company";
import api from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus } from "lucide-vue-next";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits(["update:open", "saved"]);

const companyStore = useCompanyStore();
const loading = ref(false);
const errors = ref<Record<string, string[]>>({});

const form = reactive({
  name: "",
  email: "",
  phone: "",
  address: "",
  type: "customer",
  tax_id: "",
});

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      Object.assign(form, {
        name: "",
        email: "",
        phone: "",
        address: "",
        type: "customer",
        tax_id: "",
      });
      errors.value = {};
    }
  },
);

const handleSubmit = async () => {
  if (!companyStore.companyId) return;

  loading.value = true;
  errors.value = {};

  try {
    await api.post(`/companies/${companyStore.companyId}/contacts`, form);
    emit("saved");
    emit("update:open", false);
  } catch (error: any) {
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors;
    } else {
      console.error("Failed to save contact", error);
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="sm:max-w-[525px] p-0 overflow-hidden border-none shadow-2xl"
    >
      <DialogHeader class="bg-blue-900 p-6 text-white">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-800 rounded-lg">
            <UserPlus class="w-5 h-5" />
          </div>
          <div>
            <DialogTitle class="text-xl font-bold text-white"
              >New Contact</DialogTitle
            >
            <DialogDescription class="text-blue-100 text-xs">
              Add a new customer or vendor to your organization.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="p-6 grid gap-5">
        <div class="space-y-2">
          <Label class="text-xs font-bold text-blue-900 uppercase"
            >Contact Type</Label
          >
          <Select v-model="form.type">
            <SelectTrigger class="bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="name" class="text-xs font-bold text-blue-900 uppercase"
              >Full Name</Label
            >
            <Input
              id="name"
              v-model="form.name"
              class="bg-slate-50 border-slate-200"
              placeholder="John Doe"
            />
            <p v-if="errors.name" class="text-[10px] text-red-500 font-medium">
              {{ errors.name[0] }}
            </p>
          </div>
          <div class="space-y-2">
            <Label for="email" class="text-xs font-bold text-blue-900 uppercase"
              >Email Address</Label
            >
            <Input
              id="email"
              type="email"
              v-model="form.email"
              class="bg-slate-50 border-slate-200"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="phone" class="text-xs font-bold text-blue-900 uppercase"
              >Phone Number</Label
            >
            <Input
              id="phone"
              v-model="form.phone"
              class="bg-slate-50 border-slate-200"
              placeholder="+63..."
            />
          </div>
          <div class="space-y-2">
            <Label
              for="tax_id"
              class="text-xs font-bold text-blue-900 uppercase"
              >Tax ID / TIN</Label
            >
            <Input
              id="tax_id"
              v-model="form.tax_id"
              class="bg-slate-50 border-slate-200"
              placeholder="000-000-000"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="address" class="text-xs font-bold text-blue-900 uppercase"
            >Business Address</Label
          >
          <Textarea
            id="address"
            v-model="form.address"
            rows="2"
            class="bg-slate-50 border-slate-200 resize-none"
            placeholder="Street, City, Province"
          />
        </div>
      </div>

      <DialogFooter class="bg-slate-50 p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          @click="emit('update:open', false)"
          :disabled="loading"
          class="text-slate-600"
        >
          Cancel
        </Button>
        <Button
          @click="handleSubmit"
          :disabled="loading"
          class="bg-blue-900 hover:bg-blue-800 text-white px-8 shadow-lg transition-all"
        >
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ loading ? "Saving..." : "Create Contact" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

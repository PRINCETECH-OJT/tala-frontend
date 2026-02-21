<script setup lang="ts">
import { reactive, ref, watch, computed } from "vue";
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
import { Loader2, UserPlus } from "lucide-vue-next";
import type { ContactFormState, Contact } from "@/types";

const props = defineProps<{
  open: boolean;
  mode?: "create" | "edit" | "view";
  contact?: Contact | null;
}>();

const emit = defineEmits(["update:open", "saved"]);

const companyStore = useCompanyStore();
const loading = ref(false);
const errors = ref<Record<string, string[]>>({});

const isReadOnly = computed(() => props.mode === "view");

const defaultAddress = {
  type: "billing" as const,
  address: "",
  city: "",
  state: "",
  country: "Philippines",
  postal_code: "",
  is_primary: true,
};

const form = reactive<ContactFormState>({
  type: "customer",
  contact_name: "",
  person_name: "",
  person_number: "",
  email: "",
  phone: "",
  payment_terms: "Due on Receipt",
  is_active: true,
  addresses: [{ ...defaultAddress }],
});

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      if (props.contact && (props.mode === "edit" || props.mode === "view")) {
        Object.assign(form, {
          type: props.contact.type || "customer",
          contact_name: props.contact.contact_name || "",
          person_name: props.contact.person_name || "",
          person_number: props.contact.person_number || "",
          email: props.contact.email || "",
          phone: props.contact.phone || "",
          payment_terms: props.contact.payment_terms || "Due on Receipt",
          is_active: props.contact.is_active ?? true,
          addresses: props.contact.addresses?.length
            ? JSON.parse(JSON.stringify(props.contact.addresses))
            : [{ ...defaultAddress }],
        });
      } else {
        Object.assign(form, {
          type: "customer",
          contact_name: "",
          person_name: "",
          person_number: "",
          email: "",
          phone: "",
          payment_terms: "Due on Receipt",
          is_active: true,
          addresses: [{ ...defaultAddress }],
        });
      }
      errors.value = {};
    }
  },
);

const handleSubmit = async () => {
  if (!companyStore.companyId || isReadOnly.value) return;

  loading.value = true;
  errors.value = {};

  try {
    const payload = {
      ...form,
      company_id: companyStore.companyId,
    };

    if (payload.addresses && payload.addresses.length > 0) {
      if (!payload.addresses[0]?.address && !payload.addresses[0]?.city) {
        payload.addresses = [];
      }
    }
    if (props.mode === "edit" && props.contact) {
      await api.put(`/contacts/${props.contact.uuid}`, payload);
    } else {
      await api.post(`/companies/${companyStore.companyId}/contacts`, payload);
    }

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
      class="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl"
    >
      <DialogHeader class="bg-blue-900 p-6 text-white shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-800 rounded-lg">
            <UserPlus class="w-5 h-5" />
          </div>
          <div>
            <DialogTitle class="text-xl font-bold text-white">
              {{
                mode === "create"
                  ? "New Contact"
                  : mode === "edit"
                    ? "Edit Contact"
                    : "Contact Details"
              }}
            </DialogTitle>
            <DialogDescription class="text-blue-100 text-xs">
              {{
                mode === "view"
                  ? "Viewing contact information."
                  : "Add or update contact information."
              }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="p-6 grid gap-5 max-h-[65vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-xs font-bold text-blue-900 uppercase"
              >Contact Type</Label
            >
            <Select v-model="form.type" :disabled="isReadOnly">
              <SelectTrigger class="bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label class="text-xs font-bold text-blue-900 uppercase"
              >Payment Terms</Label
            >
            <Select v-model="form.payment_terms" :disabled="isReadOnly">
              <SelectTrigger class="bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                <SelectItem value="Net 7">Net 7</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="Net 90">Net 90</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label
            for="contact_name"
            class="text-xs font-bold text-blue-900 uppercase"
            >Contact / Company Name</Label
          >
          <Input
            id="contact_name"
            v-model="form.contact_name"
            :disabled="isReadOnly"
            class="bg-slate-50 border-slate-200"
            placeholder="Tech Solutions Inc."
          />
          <p
            v-if="errors.contact_name"
            class="text-[10px] text-red-500 font-medium"
          >
            {{ errors.contact_name[0] }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label
              for="person_name"
              class="text-xs font-bold text-blue-900 uppercase"
              >Contact Person</Label
            >
            <Input
              id="person_name"
              v-model="form.person_name"
              :disabled="isReadOnly"
              class="bg-slate-50 border-slate-200"
              placeholder="John Doe"
            />
            <p
              v-if="errors.person_name"
              class="text-[10px] text-red-500 font-medium"
            >
              {{ errors.person_name[0] }}
            </p>
          </div>
          <div class="space-y-2">
            <Label
              for="person_number"
              class="text-xs font-bold text-blue-900 uppercase"
              >Person's Mobile / Direct Line</Label
            >
            <Input
              id="person_number"
              v-model="form.person_number"
              :disabled="isReadOnly"
              class="bg-slate-50 border-slate-200"
              placeholder="+63 917 123 4567"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="email" class="text-xs font-bold text-blue-900 uppercase"
              >Email Address</Label
            >
            <Input
              id="email"
              type="email"
              v-model="form.email"
              :disabled="isReadOnly"
              class="bg-slate-50 border-slate-200"
              placeholder="john@example.com"
            />
            <p v-if="errors.email" class="text-[10px] text-red-500 font-medium">
              {{ errors.email[0] }}
            </p>
          </div>
          <div class="space-y-2">
            <Label for="phone" class="text-xs font-bold text-blue-900 uppercase"
              >Company Main Phone</Label
            >
            <Input
              id="phone"
              v-model="form.phone"
              :disabled="isReadOnly"
              class="bg-slate-50 border-slate-200"
              placeholder="(02) 888 1234"
            />
          </div>
        </div>

        <div
          v-if="form.addresses && form.addresses[0]"
          class="mt-2 pt-5 border-t border-slate-200 space-y-4"
        >
          <h3 class="text-sm font-bold text-blue-900">
            PRIMARY BILLING ADDRESS
          </h3>

          <div class="space-y-2">
            <Label class="text-xs font-bold text-blue-900 uppercase"
              >Street Address</Label
            >
            <Input
              v-model="form.addresses[0]!.address"
              :disabled="isReadOnly"
              class="bg-slate-50 border-slate-200"
              placeholder="123 Business Rd., Brgy. San Lorenzo"
            />
            <p
              v-if="errors['addresses.0.address']"
              class="text-[10px] text-red-500 font-medium"
            >
              {{ errors["addresses.0.address"][0] }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-bold text-blue-900 uppercase"
                >City</Label
              >
              <Input
                v-model="form.addresses[0]!.city"
                :disabled="isReadOnly"
                class="bg-slate-50 border-slate-200"
                placeholder="Makati City"
              />
              <p
                v-if="errors['addresses.0.city']"
                class="text-[10px] text-red-500 font-medium"
              >
                {{ errors["addresses.0.city"][0] }}
              </p>
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-bold text-blue-900 uppercase"
                >State / Province</Label
              >
              <Input
                v-model="form.addresses[0]!.state"
                :disabled="isReadOnly"
                class="bg-slate-50 border-slate-200"
                placeholder="Metro Manila"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-bold text-blue-900 uppercase"
                >Country</Label
              >
              <Input
                v-model="form.addresses[0]!.country"
                :disabled="isReadOnly"
                class="bg-slate-50 border-slate-200"
                placeholder="Philippines"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-bold text-blue-900 uppercase"
                >Postal Code</Label
              >
              <Input
                v-model="form.addresses[0]!.postal_code"
                :disabled="isReadOnly"
                class="bg-slate-50 border-slate-200"
                placeholder="1223"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2 pt-2 pb-2">
          <input
            type="checkbox"
            id="is_active"
            v-model="form.is_active"
            :disabled="isReadOnly"
            class="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Label
            for="is_active"
            class="text-sm font-medium text-slate-700 cursor-pointer"
          >
            Set as Active Contact
          </Label>
        </div>
      </div>

      <DialogFooter class="bg-slate-50 p-4 border-t border-slate-200 shrink-0">
        <Button
          variant="ghost"
          @click="emit('update:open', false)"
          :disabled="loading"
          class="text-slate-600"
        >
          {{ isReadOnly ? "Close" : "Cancel" }}
        </Button>
        <Button
          v-if="!isReadOnly"
          @click="handleSubmit"
          :disabled="loading"
          class="bg-blue-900 hover:bg-blue-800 text-white px-8 shadow-lg transition-all"
        >
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{
            loading
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Contact"
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

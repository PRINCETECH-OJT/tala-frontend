<script setup lang="ts">
import { reactive, ref, onMounted, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { User, UserCreateForm, Role } from "@/types";
import api from "@/services/api";

const props = defineProps<{ open: boolean; userToEdit: User | null }>();
const emit = defineEmits(["update:open", "success"]);

const errors = ref<Record<string, string[]>>({});
const loading = ref(false);
const availableRoles = ref<Role[]>([]);

const form = reactive<UserCreateForm>({
  name: "",
  email: "",
  phone: "",
  role: "",
  password: "",
});

watch(
  () => props.userToEdit,
  (newUser: User | null) => {
    if (newUser) {
      form.name = newUser.name;
      form.email = newUser.email;
      form.phone = newUser.phone || "";
      form.role = newUser.roles?.[0]?.name || "";
      form.password = "";
    } else {
      Object.assign(form, {
        name: "",
        email: "",
        phone: "",
        role: "",
        password: "",
      });
    }
  },
  { immediate: true },
);

const fetchRoles = async () => {
  try {
    const res = await api.get("/roles");
    availableRoles.value = res.data.data;
  } catch (err) {
    console.error("Failed to fetch roles", err);
  }
};

const handleSubmit = async () => {
  loading.value = true;
  errors.value = {};
  const isEdit = !!props.userToEdit;
  const { password, ...payload } = form;
  const finalPayload =
    password && password.trim() !== "" ? { ...payload, password } : payload;

  try {
    if (isEdit) {
      await api.put(`/users/${props.userToEdit!.uuid}`, finalPayload);
    } else {
      await api.post("/users", finalPayload);
    }

    emit("success");
    emit("update:open", false);
  } catch (error: any) {
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors;
    }
  } finally {
    loading.value = false;
  }
};

onMounted(fetchRoles);
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(val: boolean) => emit('update:open', val)"
  >
    <DialogContent class="sm:max-w-md font-sans">
      <DialogHeader>
        <DialogTitle class="text-blue-900 text-xl">
          {{ userToEdit ? "Update Member Details" : "Register New Member" }}
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-1">
          <Label class="text-xs font-bold uppercase text-gray-500"
            >Full Name</Label
          >
          <Input v-model="form.name" class="focus-visible:ring-blue-900" />
          <p v-if="errors.name" class="text-[10px] text-red-500">
            {{ errors.name[0] }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <Label class="text-xs font-bold uppercase text-gray-500"
              >Email</Label
            >
            <Input v-model="form.email" type="email" />
            <p v-if="errors.email" class="text-[10px] text-red-500">
              {{ errors.email[0] }}
            </p>
          </div>

          <div class="space-y-1">
            <Label class="text-xs font-bold uppercase text-gray-500"
              >Password</Label
            >
            <Input
              v-model="form.password"
              type="password"
              placeholder="••••••••"
            />
            <p v-if="errors.password" class="text-[10px] text-red-500">
              {{ errors.password[0] }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <Label class="text-xs font-bold uppercase text-gray-500"
              >Phone</Label
            >
            <Input v-model="form.phone" />
            <p v-if="errors.phone" class="text-[10px] text-red-500">
              {{ errors.phone[0] }}
            </p>
          </div>

          <div class="space-y-1">
            <Label class="text-xs font-bold uppercase text-gray-500"
              >System Role</Label
            >
            <Select v-model="form.role">
              <SelectTrigger>
                <SelectValue placeholder="Assign a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="role in availableRoles"
                  :key="role.id"
                  :value="role.name"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.role" class="text-[10px] text-red-500">
              {{ errors.role[0] }}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="emit('update:open', false)"
          >Cancel</Button
        >
        <Button
          class="bg-primary hover:bg-amber-400 text-black px-8"
          :disabled="loading"
          @click="handleSubmit"
        >
          {{
            loading
              ? "Processing..."
              : userToEdit
                ? "Save Changes"
                : "Create User"
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

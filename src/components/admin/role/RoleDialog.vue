<script setup lang="ts">
import { reactive, ref, onMounted, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { SystemRole, RoleFormState, GroupedPermissions } from "@/types";
import api from "@/services/api";

const props = defineProps<{ open: boolean; roleToEdit: SystemRole | null }>();
const emit = defineEmits(["update:open", "success"]);

const loading = ref(false);
const permissionsLoading = ref(true);
const groupedPermissions = ref<GroupedPermissions>({});
const errors = ref<Record<string, string[]>>({});

const form = reactive<RoleFormState>({
  name: "",
  permissions: [],
});

onMounted(async () => {
  try {
    const res = await api.get("/permissions");
    groupedPermissions.value = res.data.data;
  } catch (e) {
    console.error("Failed to load permissions", e);
  } finally {
    permissionsLoading.value = false;
  }
});

watch(
  () => props.roleToEdit,
  (newRole) => {
    if (newRole) {
      form.name = newRole.name;
      form.permissions = newRole.permissions.map((p: any) =>
        typeof p === "string" ? p : p.name,
      );
    } else {
      form.name = "";
      form.permissions = [];
    }
    errors.value = {};
  },
  { immediate: true },
);

const isSelected = (permName: string) => form.permissions.includes(permName);
const togglePermission = (permName: string) => {
  if (form.permissions.includes(permName)) {
    form.permissions = form.permissions.filter((p) => p !== permName);
  } else {
    form.permissions.push(permName);
  }
  console.log("Updated Permissions:", [...form.permissions]);
};

const toggleGroup = (groupName: string) => {
  const permsInGroup = (groupedPermissions.value[groupName] ?? []).map(
    (p) => p.name,
  );
  const allSelected = permsInGroup.every((p) => form.permissions.includes(p));

  if (allSelected) {
    form.permissions = form.permissions.filter(
      (p) => !permsInGroup.includes(p),
    );
  } else {
    permsInGroup.forEach((p) => {
      if (!form.permissions.includes(p)) form.permissions.push(p);
    });
  }
};

const handleSubmit = async () => {
  console.log("Submitting Payload:", JSON.parse(JSON.stringify(form)));
  loading.value = true;
  errors.value = {};

  try {
    if (props.roleToEdit) {
      await api.put(`/roles/${props.roleToEdit.id}`, form);
    } else {
      await api.post("/roles", form);
    }
    emit("success");
    emit("update:open", false);
  } catch (err: any) {
    if (err.response?.status === 422) {
      errors.value = err.response.data.errors;
    } else {
      alert(err.response?.data?.message || "Something went wrong");
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(val: boolean) => emit('update:open', val)"
  >
    <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto font-sans">
      <DialogHeader>
        <DialogTitle class="text-blue-900 text-xl">
          {{ roleToEdit ? "Edit Role & Permissions" : "Create New Role" }}
        </DialogTitle>
        <DialogDescription>
          Manage role details and assigned permissions.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <div class="space-y-2">
          <Label>Role Name</Label>
          <Input
            v-model="form.name"
            placeholder="e.g. Sales Manager"
            :disabled="roleToEdit?.is_system_role"
          />
          <p v-if="roleToEdit?.is_system_role" class="text-xs text-amber-600">
            * System roles cannot be renamed.
          </p>
          <p v-if="errors.name" class="text-xs text-red-500">
            {{ errors.name[0] }}
          </p>
        </div>

        <div class="border-t pt-4">
          <h3 class="font-bold text-gray-700 mb-4">Assign Permissions</h3>

          <div v-if="permissionsLoading" class="text-center py-8 text-gray-500">
            Loading permissions...
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="(perms, groupName) in groupedPermissions"
              :key="groupName"
              class="border rounded-lg p-4 bg-slate-50"
            >
              <div
                class="flex items-center justify-between mb-3 pb-2 border-b border-slate-200"
              >
                <h4 class="font-bold capitalize text-blue-900">
                  {{ groupName }}
                </h4>
                <div
                  class="flex items-center space-x-2 cursor-pointer"
                  @click="toggleGroup(String(groupName))"
                >
                  <label
                    :for="'group-' + groupName"
                    class="text-xs text-gray-500 cursor-pointer pointer-events-none"
                    >Select All</label
                  >
                </div>
              </div>

              <div class="space-y-2">
                <div
                  v-for="perm in perms"
                  :key="perm.id"
                  class="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 rounded p-1 -ml-1"
                  @click="togglePermission(perm.name)"
                >
                  <Checkbox
                    :id="perm.name"
                    :checked="isSelected(perm.name)"
                    :model-value="isSelected(perm.name)"
                    class="pointer-events-none"
                  />
                  <label
                    :for="perm.name"
                    class="text-sm font-medium leading-none cursor-pointer pointer-events-none"
                  >
                    {{ perm.name }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          class="cursor-pointer"
          @click="emit('update:open', false)"
          >Cancel</Button
        >
        <Button
          class="bg-primary cursor-pointer hover:bg-amber-400 text-black px-8"
          :disabled="loading"
          @click="handleSubmit"
        >
          {{ loading ? "Saving..." : "Save Role" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

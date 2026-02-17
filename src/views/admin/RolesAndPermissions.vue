<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { ShieldPlus } from "lucide-vue-next";
import RoleTable from "@/components/admin/role/RoleTable.vue";
import RoleDialog from "@/components/admin/role/RoleDialog.vue";
import api from "@/services/api";
import type { SystemRole } from "@/types";

const isDialogOpen = ref(false);
const tableRef = ref();
const selectedRole = ref<SystemRole | null>(null);

const handleAddNew = () => {
  selectedRole.value = null;
  isDialogOpen.value = true;
};

const handleEdit = (role: SystemRole) => {
  selectedRole.value = role;
  isDialogOpen.value = true;
};

const handleDelete = async (id: number) => {
  if (
    !confirm(
      "Are you sure you want to delete this role? This action cannot be undone.",
    )
  )
    return;

  try {
    await api.delete(`/roles/${id}`);
    refreshTable();
  } catch (err: any) {
    const msg = err.response?.data?.message || "Delete failed.";
    alert(msg);
  }
};

const refreshTable = () => {
  tableRef.value?.fetchRoles();
};
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-black">
          Roles & Permissions
        </h1>
        <p class="text-muted-foreground">
          Control system access by assigning permissions to roles.
        </p>
      </div>

      <Button
        @click="handleAddNew"
        class="bg-primary cursor-pointer hover:bg-amber-400 flex items-center gap-2 text-black shadow-sm"
      >
        <ShieldPlus class="w-4 h-4" />
        Create New Role
      </Button>
    </div>

    <RoleTable ref="tableRef" @edit="handleEdit" @delete="handleDelete" />

    <RoleDialog
      v-model:open="isDialogOpen"
      :role-to-edit="selectedRole"
      @success="refreshTable"
    />
  </div>
</template>

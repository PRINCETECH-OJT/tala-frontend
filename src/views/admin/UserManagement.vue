<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-vue-next";
import { UserTable, UserDialog } from "@/components/admin/user";
import { usePermission } from "@/composables/usePermission";
import type { User } from "@/types";
import api from "@/services/api";

const { can } = usePermission();
const isDialogOpen = ref(false);
const tableRef = ref();

const selectedUser = ref<User | null>(null);

const handleAddNew = () => {
  selectedUser.value = null;
  isDialogOpen.value = true;
};

const handleEdit = (user: User) => {
  selectedUser.value = user;
  isDialogOpen.value = true;
};

const handleDelete = async (uuid: string) => {
  if (!confirm("Are you sure?")) return;

  try {
    await api.delete(`/users/${uuid}`);
    refreshTable();
  } catch (err: any) {
    const msg =
      err.response?.data?.error || "Delete failed due to a server error.";
    alert(msg);
    console.error("Delete failed", err);
  }
};

const refreshTable = () => {
  tableRef.value?.fetchUsers();
};
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-black">
          User Management
        </h1>
        <p class="text-muted-foreground">
          Manage team members and their system permissions.
        </p>
      </div>

      <Button
        v-if="can('users.manage')"
        @click="handleAddNew"
        class="bg-primary cursor-pointer hover:bg-amber-400 flex items-center gap-2"
      >
        <UserPlus class="w-4 h-4" />
        Add New User
      </Button>
    </div>

    <UserTable ref="tableRef" @edit="handleEdit" @delete="handleDelete" />

    <UserDialog
      v-model:open="isDialogOpen"
      :user-to-edit="selectedUser"
      @success="refreshTable"
    />
  </div>
</template>

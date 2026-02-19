<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Shield, Lock } from "lucide-vue-next";
import type { SystemRole } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roles = ref<SystemRole[]>([]);
const isLoading = ref(true);

const emit = defineEmits<{
  (e: "edit", role: SystemRole): void;
  (e: "delete", id: number): void;
}>();

const fetchRoles = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/roles");
    roles.value = res.data.data || res.data;
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchRoles);
defineExpose({ fetchRoles });
</script>

<template>
  <div class="border rounded-xl bg-white shadow-sm overflow-hidden font-sans">
    <Table>
      <TableHeader class="bg-slate-50">
        <TableRow>
          <TableHead class="font-bold text-blue-900 w-[250px]"
            >Role Name</TableHead
          >
          <TableHead class="font-bold text-blue-900">Users</TableHead>
          <TableHead class="font-bold text-blue-900">Permissions</TableHead>
          <TableHead class="text-right font-bold text-blue-900"
            >Actions</TableHead
          >
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="role in roles" :key="role.id">
          <TableCell class="font-medium">
            <div class="flex items-center gap-2">
              <Shield
                v-if="role.is_system_role"
                class="w-4 h-4 text-amber-500"
              />
              <span :class="{ 'text-blue-900 font-bold': role.is_system_role }">
                {{ role.name }}
              </span>
            </div>
          </TableCell>

          <TableCell>
            <Badge variant="secondary" class="font-normal">
              {{ role.users_count || 0 }} Assigned
            </Badge>
          </TableCell>

          <TableCell class="max-w-md">
            <div class="flex flex-wrap gap-1">
              <span
                v-if="role.name === 'Admin' || role.name === 'Super Admin'"
                class="text-xs text-gray-500 italic flex items-center gap-1"
              >
                <Lock class="w-3 h-3" /> Full System Access
              </span>

              <template v-else>
                <span
                  v-for="perm in role.permissions.slice(0, 4)"
                  :key="perm"
                  class="text-[10px] bg-slate-100 px-2 py-1 rounded border text-slate-600"
                >
                  {{ perm }}
                </span>
                <span
                  v-if="role.permissions.length > 4"
                  class="text-[10px] text-gray-400 pl-1 self-center"
                >
                  +{{ role.permissions.length - 4 }} more
                </span>
                <span
                  v-if="role.permissions.length === 0"
                  class="text-xs text-gray-400 italic"
                >
                  No permissions
                </span>
              </template>
            </div>
          </TableCell>

          <TableCell class="text-right">
            <div class="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-slate-500 cursor-pointer hover:text-blue-600 hover:bg-blue-50"
                @click="emit('edit', role)"
              >
                <Edit2 class="h-4 w-4" />
              </Button>

              <Button
                v-if="!role.is_system_role"
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-slate-500 cursor-pointer hover:text-red-600 hover:bg-red-50"
                @click="emit('delete', role.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div v-if="isLoading" class="p-8 text-center text-muted-foreground italic">
      Loading roles...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-vue-next";
import type { User } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const users = ref<User[]>([]);
const isLoading = ref(true);

const emit = defineEmits<{
  (e: "edit", user: User): void;
  (e: "delete", uuid: string): void;
}>();

const fetchUsers = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/users");

    users.value = res.data.data || res.data;
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchUsers);
defineExpose({ fetchUsers });
</script>

<template>
  <div class="border rounded-xl bg-white shadow-sm overflow-hidden font-sans">
    <Table>
      <TableHeader class="bg-slate-50">
        <TableRow>
          <TableHead class="font-bold text-blue-900">Name</TableHead>
          <TableHead class="font-bold text-blue-900">Email</TableHead>
          <TableHead class="font-bold text-blue-900">Role</TableHead>
          <TableHead class="text-right font-bold text-blue-900"
            >Actions</TableHead
          >
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="user in users" :key="user.uuid">
          <TableCell class="font-medium text-slate-700">{{
            user.name
          }}</TableCell>
          <TableCell class="text-slate-600">{{ user.email }}</TableCell>
          <TableCell>
            <Badge
              v-if="user.roles && user.roles.length > 0"
              variant="outline"
              class="bg-blue-50 text-blue-700 border-blue-200 capitalize"
            >
              {{ user.roles?.[0]?.name }}
            </Badge>
            <span v-else class="text-xs text-gray-400 italic">No Role</span>
          </TableCell>

          <TableCell class="text-right">
            <div class="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-slate-500 cursor-pointer hover:text-blue-600 hover:bg-blue-50"
                @click="emit('edit', user)"
              >
                <Edit2 class="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-slate-500 cursor-pointer hover:text-red-600 hover:bg-red-50"
                @click="emit('delete', user.uuid)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div v-if="isLoading" class="p-8 text-center text-muted-foreground italic">
      Loading team members...
    </div>
  </div>
</template>

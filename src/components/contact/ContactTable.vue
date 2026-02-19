<script setup lang="ts">
import { Mail, Phone, MoreVertical, Edit, Trash2, Eye } from "lucide-vue-next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import type { Contact } from "@/types";

const props = defineProps<{
  contacts: Contact[];
  loading?: boolean;
}>();

const getInitial = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : "?";
};
</script>

<template>
  <div
    class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
  >
    <Table>
      <TableHeader class="bg-slate-50/50">
        <TableRow>
          <TableHead>Contact</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead class="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <TableRow v-if="loading">
          <TableCell colspan="4" class="text-center py-6 text-slate-500">
            Loading contacts...
          </TableCell>
        </TableRow>

        <TableRow v-else-if="!contacts || contacts.length === 0">
          <TableCell colspan="4" class="text-center py-6 text-slate-500">
            No contacts found.
          </TableCell>
        </TableRow>

        <TableRow
          v-for="contact in contacts"
          :key="contact.uuid || contact.id"
          class="hover:bg-slate-50/50 transition-colors"
        >
          <TableCell>
            <div class="flex items-center gap-3">
              <div
                class="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200"
              >
                {{ getInitial(contact.contact_name) }}
              </div>

              <div class="flex flex-col">
                <span class="font-semibold text-slate-900">{{
                  contact.contact_name
                }}</span>
                <span
                  class="text-xs text-slate-500"
                  v-if="contact.person_name"
                  >{{ contact.person_name }}</span
                >
              </div>
            </div>
          </TableCell>

          <TableCell>
            <Badge
              :variant="contact.type === 'vendor' ? 'outline' : 'secondary'"
              class="capitalize font-medium"
            >
              {{ contact.type }}
            </Badge>
          </TableCell>

          <TableCell class="text-sm text-slate-500">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-2" v-if="contact.email">
                <Mail class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ contact.email }}</span>
              </div>
              <div class="flex items-center gap-2" v-if="contact.phone">
                <Phone class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ contact.phone }}</span>
              </div>
            </div>
          </TableCell>

          <TableCell class="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-slate-500 hover:text-slate-900"
                >
                  <MoreVertical class="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-40">
                <DropdownMenuItem class="cursor-pointer">
                  <Eye class="w-4 h-4 mr-2 text-slate-500" /> View
                </DropdownMenuItem>
                <DropdownMenuItem class="cursor-pointer">
                  <Edit class="w-4 h-4 mr-2 text-slate-500" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  class="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 class="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

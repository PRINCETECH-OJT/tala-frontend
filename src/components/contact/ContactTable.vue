<script setup lang="ts">
import { computed } from "vue";
import { Mail, Phone, MoreVertical, Users } from "lucide-vue-next";
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
import type { Contact } from "@/types";

const props = defineProps(["contacts", "loading", "search", "filter"]);

const filteredData = computed(() => {
  return props.contacts.filter((c: Contact) => {
    const matchSearch = c.contact_name
      .toLowerCase()
      .includes(props.search.toLowerCase());
    const matchFilter = props.filter === "all" || c.type === props.filter;
    return matchSearch && matchFilter;
  });
});
</script>

<template>
  <div
    class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
  >
    <Table>
      <TableHeader class="bg-slate-50/50">
        <TableRow>
          <TableHead>Contact Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead class="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="contact in filteredData" :key="contact.id">
          <TableCell class="font-semibold">{{ contact.name }}</TableCell>
          <TableCell>
            <Badge
              :variant="contact.type === 'vendor' ? 'outline' : 'secondary'"
              >{{ contact.type }}</Badge
            >
          </TableCell>
          <TableCell class="text-sm text-slate-500">
            <div class="flex items-center gap-2">
              <Mail class="w-3 h-3" /> {{ contact.email }}
            </div>
          </TableCell>
          <TableCell class="text-right">
            <Button variant="ghost" size="icon"
              ><MoreVertical class="w-4 h-4"
            /></Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

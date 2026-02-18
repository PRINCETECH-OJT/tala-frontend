<script setup lang="ts">
import { Plus, Download } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

defineEmits(["add-contact"]);
</script>

<template>
  <div
    class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
  >
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Contacts</h1>
      <p class="text-sm text-slate-500">Manage your customers and vendors.</p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" class="gap-2 shadow-sm cursor-pointer"
        ><Download class="w-4 h-4" /> Export</Button
      >
      <Button
        @click="$emit('add-contact')"
        class="bg-[#FFC20E] cursor-pointer hover:bg-amber-400 gap-2 shadow-md"
      >
        <Plus class="w-4 h-4" /> Add Contact
      </Button>
    </div>
  </div>
</template>

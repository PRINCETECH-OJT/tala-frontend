<script setup lang="ts">
import { computed } from "vue"; // 1. Import computed
import { Search } from "lucide-vue-next";
import { Input } from "@/components/ui/input";

const props = defineProps(["search", "filter"]);
const emit = defineEmits(["update:search", "update:filter"]);

const filterTabs = ["all", "customer", "vendor", "archive", "groups"];

const searchValue = computed({
  get: () => props.search,
  set: (value) => emit("update:search", value),
});
</script>

<template>
  <div
    class="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
  >
    <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
      <button
        v-for="type in filterTabs"
        :key="type"
        @click="emit('update:filter', type)"
        :class="[
          'px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all',
          filter === type
            ? 'bg-white text-blue-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50',
        ]"
      >
        {{ type }}
      </button>
    </div>

    <div class="relative w-full md:w-80">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
      />
      <Input
        v-model="searchValue"
        placeholder="Search name or email..."
        class="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
      />
    </div>
  </div>
</template>

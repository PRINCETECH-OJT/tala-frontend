<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const selectedFilters = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const filterOptions = [
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "rejected" },
  { label: "Invoiced", value: "invoiced" },
];
</script>

<template>
  <div
    class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-center gap-4"
  >
    <span class="text-sm font-semibold text-gray-700">Filter by Status:</span>
    <div class="flex flex-wrap gap-6">
      <label
        v-for="option in filterOptions"
        :key="option.value"
        class="flex items-center gap-2 cursor-pointer select-none"
      >
        <input
          type="checkbox"
          :value="option.value"
          v-model="selectedFilters"
          class="w-4 h-4 rounded border-gray-300 text-[#253D90] focus:ring-[#253D90] cursor-pointer"
        />
        <span class="text-sm text-gray-700 font-medium">{{
          option.label
        }}</span>
      </label>
    </div>
  </div>
</template>

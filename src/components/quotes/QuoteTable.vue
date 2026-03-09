<script setup lang="ts">
import { computed } from "vue";
import type { Quote } from "@/types";

const props = withDefaults(
  defineProps<{
    quotes: Quote[];
    isLoading?: boolean;
    selectedItems: string[];
  }>(),
  {
    isLoading: false,
  },
);

const emit = defineEmits<{
  (e: "update:selectedItems", value: string[]): void;
}>();

const selected = computed({
  get: () => props.selectedItems,
  set: (val) => emit("update:selectedItems", val),
});

const selectAll = computed({
  get: () =>
    props.quotes.length > 0 && selected.value.length === props.quotes.length,
  set: (val) => {
    if (val) {
      selected.value = props.quotes.map((q) => q.uuid);
    } else {
      selected.value = [];
    }
  },
});
</script>

<template>
  <div
    class="bg-white shadow rounded-lg overflow-hidden border border-gray-200"
  >
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th scope="col" class="px-6 py-3 text-left w-12">
            <input
              type="checkbox"
              v-model="selectAll"
              class="w-4 h-4 rounded border-gray-300 text-[#253D90] focus:ring-[#253D90] cursor-pointer"
            />
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Quote #
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Customer
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Amount
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Status
          </th>
          <th
            class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="isLoading">
          <td colspan="6" class="px-6 py-10 text-center text-gray-500">
            Loading quotes...
          </td>
        </tr>
        <tr v-else-if="quotes.length === 0">
          <td colspan="6" class="px-6 py-10 text-center text-gray-500">
            No quotes found.
          </td>
        </tr>
        <tr
          v-else
          v-for="item in quotes"
          :key="item.uuid"
          class="hover:bg-gray-50 transition-colors"
          :class="{ 'bg-blue-50/50': selected.includes(item.uuid) }"
        >
          <td class="px-6 py-4 whitespace-nowrap w-12">
            <input
              type="checkbox"
              :value="item.uuid"
              v-model="selected"
              class="w-4 h-4 rounded border-gray-300 text-[#253D90] focus:ring-[#253D90] cursor-pointer"
            />
          </td>
          <td
            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
          >
            {{ item.quote_number }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ item.customer?.name || "Unknown Customer" }}
          </td>
          <td
            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium"
          >
            ${{ Number(item.total_amount).toFixed(2) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span
              class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800"
            >
              {{ item.status }}
            </span>
          </td>
          <td
            class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
          >
            <router-link
              :to="`/overview/quotes/${item.uuid}`"
              class="text-blue-600 hover:text-blue-900"
            >
              View
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

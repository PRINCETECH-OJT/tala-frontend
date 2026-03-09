<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import useQuotes from "@/composables/useQuotes";
import QuoteTable from "@/components/quotes/QuoteTable.vue";
import QuoteFilter from "@/components/quotes/QuoteFilter.vue";

const route = useRoute();
const companyUuid = route.params.companyId as string;

const { quotes, isLoading, errors, getQuotes } = useQuotes();

const selectedFilters = ref<string[]>([]);
const selectedQuotes = ref<string[]>([]);

watch(selectedFilters, (newFilters) => {
  getQuotes(companyUuid, 1, {
    statuses: newFilters.join(","),
  });
  selectedQuotes.value = [];
});

onMounted(() => {
  getQuotes(companyUuid);
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Quotes</h1>
        <p class="text-sm text-gray-500 mt-1">
          Manage and track your customer quotes.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          v-if="selectedQuotes.length > 0"
          class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Bulk Actions ({{ selectedQuotes.length }})
        </button>

        <router-link
          to="/overview/quotes/create"
          class="bg-[#253D90] hover:bg-[#1e327a] text-white px-4 py-2 rounded-md shadow transition-colors font-medium"
        >
          + Create Quote
        </router-link>
      </div>
    </div>

    <div
      v-if="errors"
      class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
    >
      <span class="block sm:inline">{{ errors }}</span>
    </div>

    <QuoteFilter v-model="selectedFilters" />

    <QuoteTable
      :quotes="quotes"
      :isLoading="isLoading"
      v-model:selectedItems="selectedQuotes"
    />
  </div>
</template>

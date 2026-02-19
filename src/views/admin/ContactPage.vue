<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useCompanyStore } from "@/stores/company";
import api from "@/services/api";
import type { Contact } from "@/types";
import {
  ContactToolbar,
  ContactHeader,
  ContactTable,
  ContactDialog,
} from "@/components/contact";

const companyStore = useCompanyStore();
const contacts = ref<Contact[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const filterType = ref("all");
const isModalOpen = ref(false);

const fetchContacts = async () => {
  if (!companyStore.companyId) return;
  loading.value = true;
  try {
    const res = await api.get(`/contacts`);
    contacts.value = res.data.data;
  } catch (error) {
    console.error("Fetch error:", error);
  } finally {
    loading.value = false;
  }
};

const filteredContacts = computed(() => {
  let result = contacts.value;
  if (filterType.value !== "all") {
    result = result.filter(
      (c) => c.type.toLowerCase() === filterType.value.toLowerCase(),
    );
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (c) =>
        c.contact_name?.toLowerCase().includes(query) ||
        c.person_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query),
    );
  }

  return result;
});
onMounted(fetchContacts);
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
    <ContactHeader @add-contact="isModalOpen = true" />

    <ContactToolbar v-model:search="searchQuery" v-model:filter="filterType" />

    <ContactTable
      :contacts="filteredContacts"
      :loading="loading"
      @refresh="fetchContacts"
    />

    <ContactDialog v-model:open="isModalOpen" @saved="fetchContacts" />
  </div>
</template>

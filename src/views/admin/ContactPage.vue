<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useCompanyStore } from "@/stores/company";
import api from "@/services/api";

import {
  ContactToolbar,
  ContactHeader,
  ContactTable,
  ContactDialog,
} from "@/components/contact";

const companyStore = useCompanyStore();
const contacts = ref([]);
const loading = ref(false);
const searchQuery = ref("");
const filterType = ref("all");
const isModalOpen = ref(false);

const fetchContacts = async () => {
  if (!companyStore.companyId) return;
  loading.value = true;
  try {
    const res = await api.get(`/companies/${companyStore.companyId}/contacts`);
    contacts.value = res.data.data;
  } catch (error) {
    console.error("Fetch error:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchContacts);
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
    <ContactHeader @add-contact="isModalOpen = true" />

    <ContactToolbar v-model:search="searchQuery" v-model:filter="filterType" />

    <ContactTable
      :contacts="contacts"
      :loading="loading"
      :search="searchQuery"
      :filter="filterType"
      @refresh="fetchContacts"
    />

    <ContactModal v-model:open="isModalOpen" @saved="fetchContacts" />
  </div>
</template>

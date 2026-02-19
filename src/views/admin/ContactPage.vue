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
const selectedContact = ref<Contact | null>(null);
const modalMode = ref<"create" | "edit" | "view">("create");

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

const handleView = (contact: Contact) => {
  selectedContact.value = contact;
  modalMode.value = "view";
  isModalOpen.value = true;
};

const handleEdit = (contact: Contact) => {
  selectedContact.value = contact;
  modalMode.value = "edit";
  isModalOpen.value = true;
};

const handleDelete = async (contact: Contact) => {
  if (!confirm(`Are you sure you want to delete ${contact.contact_name}?`))
    return;
  try {
    await api.delete(`/contacts/${contact.uuid}`);
    await fetchContacts();
  } catch (error) {
    console.error("Delete error:", error);
  }
};

const openCreateModal = () => {
  selectedContact.value = null;
  modalMode.value = "create";
  isModalOpen.value = true;
};

const handleToggleActive = async (contact: Contact) => {
  try {
    const newStatus = !contact.is_active;
    await api.put(`/contacts/${contact.uuid}`, {
      ...contact,
      is_active: newStatus,
    });
    await fetchContacts();
  } catch (error) {
    console.error("Failed to update status:", error);
  }
};

const filteredContacts = computed(() => {
  let result = contacts.value;
  if (filterType.value === "archive") {
    result = result.filter((c) => !c.is_active);
  } else {
    result = result.filter((c) => c.is_active);

    if (filterType.value !== "all" && filterType.value !== "groups") {
      result = result.filter(
        (c) => c.type.toLowerCase() === filterType.value.toLowerCase(),
      );
    }
  }

  // Search Logic
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
    <ContactHeader @add-contact="openCreateModal" />

    <ContactToolbar v-model:search="searchQuery" v-model:filter="filterType" />

    <ContactTable
      :contacts="filteredContacts"
      :loading="loading"
      @view="handleView"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <ContactDialog
      v-model:open="isModalOpen"
      :mode="modalMode"
      :contact="selectedContact"
      @saved="fetchContacts"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useCompanyStore } from "@/stores/company";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Landmark,
  FileText,
  ShieldCheck,
  Save,
  CheckCircle2,
} from "lucide-vue-next";

import GeneralTab from "../../../components/admin/setting/GeneralTab.vue";
import FinanceTab from "../../../components/admin/setting/FinanceTab.vue";

const loading = ref(false);
const successMessage = ref(false);
const activeTab = ref("general");

const generalTabRef = ref();
const financeTabRef = ref();

const handleSave = async () => {
  loading.value = true;
  successMessage.value = false;

  try {
    if (activeTab.value === "general" && generalTabRef.value) {
      await generalTabRef.value.saveSettings();
    } else if (activeTab.value === "finance" && financeTabRef.value) {
      console.log("Finance Save Triggered");
    }

    successMessage.value = true;
    setTimeout(() => (successMessage.value = false), 3000);
  } catch (error: any) {
    console.error("Global Save Error:", error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="p-6 space-y-6 font-sans max-w-6xl mx-auto">
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-black tracking-tight">
          System Settings
        </h1>
        <p class="text-muted-foreground text-sm">
          Manage organization profile and accounting preferences.
        </p>
      </div>

      <div class="flex items-center gap-4">
        <span
          v-if="successMessage"
          class="flex items-center gap-1.5 text-sm text-green-600 animate-in fade-in slide-in-from-right-2"
        >
          <CheckCircle2 class="w-4 h-4" /> Changes saved
        </span>

        <Button
          class="bg-primary cursor-pointer hover:bg-amber-400 text-black font-semibold gap-2 shadow-sm"
          :disabled="loading"
          @click="handleSave"
        >
          <Save class="w-4 h-4" />
          {{ loading ? "Saving..." : "Save Changes" }}
        </Button>
      </div>
    </div>

    <Tabs default-value="general" v-model="activeTab" class="w-full">
      <TabsList
        class="grid w-full md:w-[600px] grid-cols-4 bg-slate-100 p-1 mb-6 rounded-lg"
      >
        <TabsTrigger
          value="general"
          class="flex items-center gap-2 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-blue-900 transition-all"
        >
          <Building2 class="w-4 h-4" /> General
        </TabsTrigger>
        <TabsTrigger
          value="finance"
          class="flex items-center gap-2 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-blue-900 transition-all"
        >
          <Landmark class="w-4 h-4" /> Finance
        </TabsTrigger>
        <TabsTrigger
          value="sales"
          class="flex items-center gap-2 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-blue-900 transition-all"
        >
          <FileText class="w-4 h-4" /> Sales
        </TabsTrigger>
        <TabsTrigger
          value="system"
          class="flex items-center gap-2 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-blue-900 transition-all"
        >
          <ShieldCheck class="w-4 h-4" /> System
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="general"
        class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <GeneralTab ref="generalTabRef" />
      </TabsContent>

      <TabsContent
        value="finance"
        class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <FinanceTab ref="financeTabRef" />
      </TabsContent>

      <TabsContent value="sales">
        <div
          class="p-12 text-center text-gray-500 border-2 border-dashed rounded-xl"
        >
          Sales Settings Coming Soon...
        </div>
      </TabsContent>
      <TabsContent value="system">
        <div
          class="p-12 text-center text-gray-500 border-2 border-dashed rounded-xl"
        >
          System Settings Coming Soon...
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

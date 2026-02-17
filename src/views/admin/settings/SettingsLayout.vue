<script setup lang="ts">
import { ref } from "vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Landmark,
  FileText,
  ShieldCheck,
  Save,
} from "lucide-vue-next";

// Import the sub-components (We will create these next)
import GeneralTab from "./GeneralTab.vue";
import FinanceTab from "./FinanceTab.vue";

const loading = ref(false);
const activeTab = ref("general");

// Mock Save Function (We will connect this to API tomorrow)
const handleSave = () => {
  loading.value = true;
  console.log("Saving settings for tab:", activeTab.value);

  setTimeout(() => {
    loading.value = false;
    // You can add a toast notification here later
    alert("Settings Saved Successfully (Mock)");
  }, 1000);
};
</script>

<template>
  <div class="p-6 space-y-6 font-sans max-w-6xl mx-auto">
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-blue-900 tracking-tight">
          System Settings
        </h1>
        <p class="text-muted-foreground text-sm">
          Manage your organization profile and accounting preferences.
        </p>
      </div>

      <Button
        class="bg-primary hover:bg-amber-400 text-black font-semibold gap-2 shadow-sm"
        :disabled="loading"
        @click="handleSave"
      >
        <Save class="w-4 h-4" />
        {{ loading ? "Saving..." : "Save Changes" }}
      </Button>
    </div>

    <Tabs default-value="general" v-model="activeTab" class="w-full">
      <TabsList
        class="grid w-full md:w-[600px] grid-cols-4 bg-slate-100 p-1 mb-6 rounded-lg"
      >
        <TabsTrigger
          value="general"
          class="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm transition-all"
        >
          <Building2 class="w-4 h-4" /> General
        </TabsTrigger>
        <TabsTrigger
          value="finance"
          class="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm transition-all"
        >
          <Landmark class="w-4 h-4" /> Finance
        </TabsTrigger>
        <TabsTrigger
          value="sales"
          class="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm transition-all"
        >
          <FileText class="w-4 h-4" /> Sales
        </TabsTrigger>
        <TabsTrigger
          value="system"
          class="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm transition-all"
        >
          <ShieldCheck class="w-4 h-4" /> System
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="general"
        class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <GeneralTab />
      </TabsContent>

      <TabsContent
        value="finance"
        class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <FinanceTab />
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

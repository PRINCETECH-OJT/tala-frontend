<script setup lang="ts">
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar.vue";
</script>

<template>
  <SidebarProvider>
    <AppSidebar />

    <main class="w-full min-h-screen bg-slate-50 dark:bg-slate-900">
      <div class="flex items-center p-4 border-b bg-background shadow-sm">
        <SidebarTrigger />
        <span class="ml-4 font-semibold">Accounting System</span>
      </div>

      <div class="p-6">
        <router-view />
      </div>
    </main>
  </SidebarProvider>
</template>

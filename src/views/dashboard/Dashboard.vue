<script setup lang="ts">
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar.vue";
</script>

<template>
  <SidebarProvider>
    <AppSidebar />

    <main class="w-full">
      <SidebarTrigger />

      <div class="flex min-h-screen justify-center items-center">
        <h1>This is a dashboard</h1>
      </div>
    </main>
  </SidebarProvider>
</template>

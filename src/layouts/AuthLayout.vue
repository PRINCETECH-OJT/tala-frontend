<script setup lang="ts">
import AuthHeader from "@/components/auth/AuthHeader.vue";
import AuthFooter from "@/components/auth/AuthFooter.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col font-product bg-slate-900">
    <AuthHeader />

    <main class="flex-1 relative flex items-center justify-center py-10">
      <div class="absolute inset-0 bg-blue-900 z-0"></div>
      <img
        src="/login-bg.png"
        class="absolute inset-0 w-full h-full object-cover opacity-100 z-0 mix-blend-overlay"
      />

      <div class="relative z-10 w-full px-4 flex justify-center">
        <slot />
      </div>
    </main>

    <AuthFooter />
  </div>
</template>

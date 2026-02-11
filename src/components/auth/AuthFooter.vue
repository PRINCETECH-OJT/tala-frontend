<script setup lang="ts">
import { Globe } from "lucide-vue-next";
</script>

<template>
  <footer
    class="w-full bg-[#072069] text-white/60 py-3 px-4 sm:px-8 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 text-xs z-20 relative"
  >
    <div class="text-center sm:text-left">
      <span
        >&copy; 2026 T.A.L.A. Accounting System Inc. All rights reserved.</span
      >
    </div>

    <div
      class="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
    >
      <Globe class="h-4 w-4" />
      <span class="font-medium whitespace-nowrap">English (US)</span>
    </div>
  </footer>
</template>

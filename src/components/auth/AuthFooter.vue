<script setup lang="ts">
import { Globe } from "lucide-vue-next";
</script>

<template>
  <footer
    class="w-full bg-[#072069] text-white/60 py-4 px-8 md:px-16 flex flex-col md:flex-row items-center justify-between text-xs z-20 relative"
  >
    <div class="mb-2 md:mb-0 flex items-center gap-1">
      <span
        >&copy; 2026 T.A.L.A. Accounting System Inc. All rights reserved.</span
      >
    </div>

    <div
      class="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
    >
      <Globe class="h-4 w-4" />
      <span class="font-medium">English (US)</span>
    </div>
  </footer>
</template>

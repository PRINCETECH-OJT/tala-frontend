<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();

const isRegister = computed(() => route.name === "Register");
const isVerify = computed(() => route.name === "Verify");
</script>

<template>
  <nav class="flex items-center gap-12 text-sm font-medium">
    <div
      class="relative pb-1 transition-colors"
      :class="isRegister ? 'text-white' : 'text-white/50'"
    >
      <span>Registration</span>
      <div
        v-if="isRegister"
        class="absolute -bottom-2 left-0 w-full h-0.5 bg-yellow-400"
      ></div>
    </div>

    <div
      class="relative pb-1 transition-colors"
      :class="isVerify ? 'text-white' : 'text-white/50'"
    >
      <span>Confirmation</span>
      <div
        v-if="isVerify"
        class="absolute -bottom-2 left-0 w-full h-0.5 bg-yellow-400"
      ></div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import SignupForm from "@/components/new-york-v4/blocks/signup-04/components/SignupForm.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
</script>

<template>
  <AuthLayout>
    <template #navigation>
      <nav class="flex items-center gap-12 text-white/80 font-medium">
        <div class="relative pb-1">
          <span class="text-white">Registration</span>
          <div
            class="absolute -bottom-2 left-0 w-full h-0.5 bg-yellow-400"
          ></div>
        </div>
        <div
          class="hover:text-white transition-colors cursor-pointer opacity-50"
        >
          Confirmation
        </div>
      </nav>
    </template>

    <div class="w-full max-w-4xl">
      <SignupForm />
    </div>
  </AuthLayout>
</template>

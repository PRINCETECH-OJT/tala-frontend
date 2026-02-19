<script setup lang="ts">
import SignupForm from "@/components/new-york-v4/blocks/signup-04/components/SignupForm.vue";
import { AuthLayout } from "@/layouts";
import { AuthNav } from "@/components/auth";
</script>

<template>
  <AuthLayout>
    <template #navigation>
      <AuthNav />
    </template>

    <div class="w-full max-w-4xl">
      <SignupForm />
    </div>
  </AuthLayout>
</template>

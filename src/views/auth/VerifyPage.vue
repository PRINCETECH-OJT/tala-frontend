<script setup lang="ts">
import { AuthLayout } from "@/layouts";
import { AuthNav, VerifyContext } from "@/components/auth";
</script>

<template>
  <AuthLayout>
    <template #navigation>
      <AuthNav />
    </template>

    <div class="w-full max-w-4xl">
      <VerifyContext />
    </div>
  </AuthLayout>
</template>

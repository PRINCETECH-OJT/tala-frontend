<script setup lang="ts">
import { AuthLayout } from "@/layouts";
import { CompanyOnboardingForm } from "@/components/onboarding";
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-xl flex flex-col">
      <div class="flex flex-col gap-2 mb-4">
        <h1 class="text-white text-4xl font-bold">
          Set up your Company Profile
        </h1>
        <p class="text-sm text-[#DFD9D9]">
          This information will be used for invoicing, legal documents, and
          financial reports.
        </p>
      </div>
      <CompanyOnboardingForm />
    </div>
  </AuthLayout>
</template>

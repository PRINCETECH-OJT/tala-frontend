<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import authService from "@/services/authService";
import { useAuthStore } from "@/stores";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const loading = ref(false);
const message = ref("We've sent a verification link to your email.");

const resendEmail = async () => {
  loading.value = true;
  try {
    await authService.resendVerification();
    message.value = "Verification email sent again.";
  } catch (err) {
    message.value = "Failed to resend email.";
  } finally {
    loading.value = false;
  }
};

// If coming from email link
const verifyEmail = async () => {
  const { id, hash, expires, signature } = route.query;

  if (id && hash) {
    loading.value = true;
    try {
      await authService.verifyEmail(
        id as string,
        hash as string,
        expires as string,
        signature as string
      );
      await auth.fetchUser();
      router.push("/onboarding/company");
    } catch (err) {
      message.value = "Verification failed or expired.";
    } finally {
      loading.value = false;
    }
  }
};

verifyEmail();
</script>

<template>
  <div class="flex justify-center items-center min-h-screen bg-gray-50">
    <Card class="w-full max-w-md shadow-xl">
      <CardContent class="p-8 text-center space-y-4">
        <h2 class="text-2xl font-bold text-blue-900">
          Verify Your Email
        </h2>

        <p class="text-gray-600">
          {{ message }}
        </p>

        <Button
          class="w-full bg-blue-900 text-white"
          @click="resendEmail"
          :disabled="loading"
        >
          Resend Verification Email
        </Button>

        <Button
          variant="outline"
          class="w-full"
          @click="router.push('/auth/login')"
        >
          Back to Login
        </Button>
      </CardContent>
    </Card>
  </div>
</template>

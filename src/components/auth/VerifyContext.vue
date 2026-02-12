<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { HTMLAttributes } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authService } from "@/services";
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

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <h1 class="text-center text-white text-4xl font-bold mb-10">
    Hi, <span class="text-yellow-400">{{ auth.user?.name }}</span> Confirm your email and start
    <br />
    using <span class="text-yellow-400">T.A.L.A</span>
  </h1>
  <Card
    class="w-full max-w-lg mx-auto overflow-hidden border-none shadow-2xl bg-white rounded-3xl"
  >
    <CardContent class="flex flex-col items-center">
      <div class="flex flex-col items-center gap-6">
        <img src="/mail-verify.png" alt="mail-photo" class="h-16 w-16" />
        <div class="flex flex-col items-center gap-2">
          <h1 class="font-sans font-semibold text-gray-400 text-lg">
            We sent an email to
            <span class="text-[#253D90]">{{ auth.user?.email }}</span>
          </h1>
          <p class="text-xs text-gray-400">
            Please check your inbox (and spam folder) to proceed
          </p>
        </div>
        <div class="flex flex-col gap-5">
          <h1 class="font-sans text-gray-400 text-sm">NEXT STEPS:</h1>
          <div class="flex flex-row gap-4">
            <h1
              class="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-sm"
            >
              1
            </h1>
            <div class="flex flex-col items-start">
              <h1 class="text-[#253D90] text-xl">Verify your account.</h1>
              <p class="text-gray-400 text-sm">
                Click on the link in the email to verify your account.
              </p>
            </div>
          </div>
          <div class="flex flex-row gap-4">
            <h1
              class="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-sm"
            >
              2
            </h1>
            <div class="flex flex-col items-start">
              <h1 class="text-[#253D90] text-xl">Start using T.A.L.A</h1>
              <p class="text-gray-400 text-sm">
                Log in to T.A.L.A and start exploring features.
              </p>
            </div>
          </div>
        </div>
        <Button
          as-child
          class="bg-[#253D90] text-white text-md px-10 py-2 hover:bg-blue-800"
        >
          <RouterLink to="/auth/login">Log-in Now</RouterLink>
        </Button>

        <h3 class="text-gray-400">Didn't receive an email? 
          <span class="text-blue-800 cursor-pointer">
            <a 
              @click="resendEmail"
              :disabled="loading"
            >
            Resend verification email.
            </a>
          </span>
        </h3>
      </div>
    </CardContent>
  </Card>
</template>

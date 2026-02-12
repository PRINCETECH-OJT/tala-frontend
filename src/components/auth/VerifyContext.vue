<script setup lang="ts">
import { useRouter } from "vue-router";
import type { HTMLAttributes } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <h1 class="text-center text-white text-4xl font-bold mb-10">
    Hi, <span class="text-yellow-400">User!</span> Confirm your email and start
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
            <span class="text-[#253D90]">example@gmail.com</span>
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
      </div>
    </CardContent>
  </Card>
</template>

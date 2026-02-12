<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore, useCompanyStore } from "@/stores";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const auth = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  const companyStore = useCompanyStore();

  try { 
    await auth.login({
      email: email.value,
      password: password.value,
      remember: rememberMe.value,
    }); 
    await auth.fetchUser();
 
    await companyStore.fetchCompanies(); 
 
    if (companyStore.currentCompany) {
      const companyId = companyStore.currentCompany.id;
      router.replace(`/app/${companyId}/dashboard`);
    } else {
      router.replace("/onboarding/company");
    }
  } catch (error: any) {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 422)
    ) {
      errorMessage.value = "Invalid email or password.";
    } else if (error.type === "requires_onboarding") {
      router.push("/onboarding/company");
    } else if (error.type === "email_not_verified") {
      router.push("/auth/verify-email");
    } else {
      errorMessage.value = "Server error. Please try again later.";
    }
  } finally {
    isLoading.value = false;
  }
};

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div :class="cn('flex flex-col w-full max-w-xl mx-auto', props.class)">
    <Card class="overflow-hidden border-none shadow-xl bg-white">
      <CardContent class="p-8">
        <form class="flex flex-col gap-2" @submit.prevent="handleLogin">
          <div class="flex flex-col items-center gap-4 text-center">
            <h1 class="text-3xl font-sans font-bold text-blue-900">Login</h1>
            <p class="text-blue-900 text-xl font-sans">
              Login to your account.
            </p>
          </div>

          <div
            v-if="errorMessage"
            class="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-md border border-red-200"
          >
            {{ errorMessage }}
          </div>

          <FieldGroup class="flex min-w-sm gap-4 p-6">
            <Field>
              <FieldLabel
                for="email"
                class="text-blue-900 font-sans font-bold text-sm"
                >E-mail Address</FieldLabel
              >
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder=""
                class="border-gray-300 focus-visible:ring-blue-900"
                required
              />
            </Field>

            <Field>
              <FieldLabel for="password" class="text-blue-900 font-bold text-sm"
                >Password</FieldLabel
              >
              <Input
                id="password"
                v-model="password"
                type="password"
                class="border-gray-300 focus-visible:ring-blue-900"
                required
              />
            </Field>

            <div class="flex items-center justify-between mt-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="rememberMe"
                  class="w-4 h-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                />
                <span class="text-sm font-medium text-blue-900"
                  >Remember me</span
                >
              </label>

              <a
                href="#"
                class="text-sm font-bold text-blue-900 hover:underline"
              >
                Reset Password?
              </a>
            </div>

            <Button
              type="submit"
              class="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-950 text-lg h-11 mt-4 transition-colors hover:cursor-pointer"
              :disabled="isLoading"
            >
              {{ isLoading ? "Signing In..." : "Sign In" }}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

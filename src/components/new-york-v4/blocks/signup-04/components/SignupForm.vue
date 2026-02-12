<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { ref, reactive } from "vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services";
import type { RegisterForm } from "@/types";
import { useRouter } from "vue-router";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const router = useRouter();
const isLoading = ref(false);
const errors = ref<Record<string, string[]>>({});

const form = reactive({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
  termsAgreed: false,
});

const handleRegister = async (e: Event) => {
  e.preventDefault();

  if (!form.termsAgreed) {
    alert("Please agree to the Terms and Privacy Policy.");
    return;
  }

  isLoading.value = true;
  errors.value = {};

  const payload: RegisterForm = {
    name: `${form.first_name} ${form.last_name}`.trim(),
    email: form.email,
    phone: form.phone,
    password: form.password,
    password_confirmation: form.password_confirmation,
    terms: form.termsAgreed,
  };

  try {
    await authService.register(payload);
    router.push("/auth/verify-email");  
  } catch (error: any) {
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors;
    } else {
      console.error(error);
      alert("An error occurred during registration.");
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div :class="cn('flex flex-col w-full max-w-xl mx-auto', props.class)">
    <Card class="border-none shadow-2xl bg-white overflow-hidden">
      <CardContent class="p-6 md:p-8">
        <form @submit="handleRegister">
          <div class="space-y-3">
            <div class="flex flex-col items-center gap-2">
              <h1 class="text-2xl md:text-3xl font-bold text-[#253D90]">
                Welcome to
                <span class="font-ribeye tracking-normal">T.A.L.A.</span>
              </h1>
              <p class="text-muted-foreground text-sm">Register your account</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field class="gap-2">
                <FieldLabel class="font-semibold text-blue-900 text-sm"
                  >First Name</FieldLabel
                >
                <Input
                  v-model="form.first_name"
                  class="h-9 bg-blue-50/30 border-blue-100"
                  required
                />
              </Field>
              <Field class="gap-2">
                <FieldLabel class="font-semibold text-blue-900 text-sm"
                  >Last Name</FieldLabel
                >
                <Input
                  v-model="form.last_name"
                  class="h-9 bg-blue-50/30 border-blue-100"
                  required
                />
              </Field>
            </div>

            <Field class="gap-2">
              <FieldLabel class="font-semibold text-blue-900 text-sm"
                >E-mail Address</FieldLabel
              >
              <Input
                v-model="form.email"
                type="email"
                class="h-9 bg-blue-50/30 border-blue-100"
                required
              />
              <p v-if="errors.email" class="text-red-500 text-[10px]">
                {{ errors.email[0] }}
              </p>
            </Field>

            <Field class="gap-2">
              <FieldLabel class="font-semibold text-blue-900 text-sm"
                >Phone Number</FieldLabel
              >
              <Input
                v-model="form.phone"
                type="tel"
                placeholder="+63"
                class="h-9 bg-blue-50/30 border-blue-100"
                required
              />
            </Field>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field class="gap-2">
                <FieldLabel class="font-semibold text-blue-900 text-sm"
                  >Password</FieldLabel
                >
                <Input
                  v-model="form.password"
                  type="password"
                  class="h-9 bg-blue-50/30 border-blue-100"
                  required
                />
              </Field>
              <Field class="gap-2">
                <FieldLabel class="font-semibold text-blue-900 text-sm"
                  >Confirm Password</FieldLabel
                >
                <Input
                  v-model="form.password_confirmation"
                  type="password"
                  class="h-9 bg-blue-50/30 border-blue-100"
                  required
                />
              </Field>
            </div>

            <div class="flex flex-row items-center gap-3">
              <Checkbox
                id="terms"
                v-model="form.termsAgreed"
                class="mt-0.5 border-blue-900 h-4 w-4"
              />
              <label
                for="terms"
                class="text-[12px] font-medium leading-tight text-blue-900/80"
              >
                I’ve read and agreed to the
                <a href="#" class="text-blue-900 font-bold hover:underline"
                  >Terms</a
                >
                and
                <a href="#" class="text-blue-900 font-bold hover:underline"
                  >Privacy Policy</a
                >
              </label>
            </div>

            <Button
              type="submit"
              class="w-full bg-[#253D90] hover:bg-blue-800 text-white font-bold h-10 text-base shadow-md transition-all mt-2"
              :disabled="isLoading"
            >
              {{ isLoading ? "Creating Account..." : "Create Account" }}
            </Button>

            <p class="text-center text-sm text-blue-900/80 mt-2">
              Already have an account?
              <RouterLink
                to="/auth/login"
                class="text-blue-900 font-bold hover:underline"
                >Log In</RouterLink
              >
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { ref, reactive } from "vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import authService from "@/services/authService";
import type { RegisterForm } from "@/types";
import { useRouter } from "vue-router";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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

  // if (!form.termsAgreed) {
  //   alert("Please agree to the Terms and Privacy Policy.");
  //   return;
  // }

  isLoading.value = true;
  errors.value = {};

  const payload = {
    ...form,
    name: `${form.first_name} ${form.last_name}`.trim(),
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
    <Card class="overflow-hidden border-none shadow-xl bg-white">
      <CardContent class="p-10">
        <form @submit="handleRegister">
          <FieldGroup class="space-y-2 flex gap-2">
            <div class="flex flex-col gap-2 text-center mb-4">
              <h1 class="text-3xl md:text-4xl font-bold text-[#253D90]">
                Welcome to
                <span class="font-ribeye tracking-wider">T.A.L.A.</span>
              </h1>
              <p class="text-muted-foreground text-lg">Register your account</p>
            </div>

            <div class="flex gap-4">
              <Field>
                <FieldLabel
                  for="first_name"
                  class="font-semibold text-blue-900 text-sm"
                  >First Name</FieldLabel
                >
                <Input
                  id="first_name"
                  v-model="form.first_name"
                  placeholder=""
                  class="h-8 bg-blue-50/30 border-blue-100 focus-visible:ring-blue-900"
                  required
                />
                <p v-if="errors.first_name" class="text-red-500 text-xs mt-1">
                  {{ errors.first_name[0] }}
                </p>
              </Field>

              <Field>
                <FieldLabel
                  for="last_name"
                  class="font-semibold text-blue-900 text-sm"
                  >Last Name</FieldLabel
                >
                <Input
                  id="last_name"
                  v-model="form.last_name"
                  placeholder=""
                  class="h-8 bg-blue-50/30 border-blue-100 focus-visible:ring-blue-900"
                  required
                />
                <p v-if="errors.last_name" class="text-red-500 text-xs mt-1">
                  {{ errors.last_name[0] }}
                </p>
              </Field>
            </div>

            <Field>
              <FieldLabel
                for="email"
                class="font-semibold text-blue-900 text-sm"
                >E-mail Address</FieldLabel
              >
              <Input
                id="email"
                v-model="form.email"
                type="email"
                placeholder=""
                class="h-8 bg-blue-50/30 border-blue-100 focus-visible:ring-blue-900"
                required
              />
              <p v-if="errors.email" class="text-red-500 text-xs mt-1">
                {{ errors.email[0] }}
              </p>
            </Field>

            <Field>
              <FieldLabel
                for="phone"
                class="font-semibold text-blue-900 text-sm"
                >Phone Number</FieldLabel
              >
              <Input
                id="phone"
                v-model="form.phone"
                type="tel"
                class="h-8 bg-blue-50/30 border-blue-100 focus-visible:ring-blue-900"
                required
              />
              <p v-if="errors.phone" class="text-red-500 text-xs mt-1">
                {{ errors.phone[0] }}
              </p>
            </Field>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  for="password"
                  class="font-semibold text-blue-900 text-sm"
                  >Password</FieldLabel
                >
                <Input
                  id="password"
                  v-model="form.password"
                  type="password"
                  class="h-8 bg-blue-50/30 border-blue-100 focus-visible:ring-blue-900"
                  required
                />
              </Field>
              <Field>
                <FieldLabel
                  for="password_confirmation"
                  class="font-semibold text-blue-900 text-sm"
                  >Confirm Password</FieldLabel
                >
                <Input
                  id="password_confirmation"
                  v-model="form.password_confirmation"
                  type="password"
                  class="h-8 bg-blue-50/30 border-blue-100 focus-visible:ring-blue-900"
                  required
                />
              </Field>
              <p v-if="errors.password" class="text-red-500 text-xs col-span-2">
                {{ errors.password[0] }}
              </p>
            </div>

            <div class="flex items-center space-x-2 my-2">
              <Checkbox
                id="terms"
                v-model:checked="form.termsAgreed"
                class="data-[state=checked]:bg-blue-900 border-blue-900"
              />
              <label
                for="terms"
                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-900/80"
              >
                I’ve read and agreed to all the
                <a href="#" class="text-blue-900 font-bold hover:underline"
                  >Terms</a
                >,
                <a href="#" class="text-blue-900 font-bold hover:underline"
                  >Privacy Policy</a
                >
              </label>
            </div>

            <Button
              type="submit"
              class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold h-12 text-lg shadow-md transition-all"
              :disabled="isLoading"
            >
              {{ isLoading ? "Processing..." : "Create Account" }}
            </Button>

            <p class="text-center text-sm text-blue-900/80 mt-4 font-medium">
              Already have an account?
              <RouterLink
                to="/auth/login"
                class="text-blue-900 font-bold hover:underline"
                >Log In</RouterLink
              >
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

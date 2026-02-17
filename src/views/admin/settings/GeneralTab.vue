<script setup lang="ts">
import { reactive } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form State
const form = reactive({
  companyName: "Acme Corp Inc.",
  taxId: "123-456-789-000",
  email: "admin@acmecorp.com",
  phone: "+63 917 123 4567",
  address: "123 Business Park, Cagayan de Oro City",
  currency: "PHP",
});
</script>

<template>
  <div class="grid gap-6 md:grid-cols-2">
    <Card class="border-slate-200 shadow-sm md:col-span-2">
      <CardHeader>
        <CardTitle class="text-lg text-blue-900"
          >Organization Profile</CardTitle
        >
        <CardDescription
          >This information will appear on your invoices and
          reports.</CardDescription
        >
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label>Company Name</Label>
          <Input v-model="form.companyName" placeholder="Legal Company Name" />
        </div>

        <div class="space-y-2">
          <Label>Tax Identification No. (TIN)</Label>
          <Input v-model="form.taxId" placeholder="000-000-000-000" />
        </div>

        <div class="space-y-2">
          <Label>Official Email</Label>
          <Input v-model="form.email" type="email" />
        </div>

        <div class="space-y-2">
          <Label>Phone Number</Label>
          <Input v-model="form.phone" />
        </div>

        <div class="space-y-2 md:col-span-2">
          <Label>Business Address</Label>
          <Textarea
            v-model="form.address"
            rows="2"
            placeholder="Street, City, Province, Zip"
          />
        </div>
      </CardContent>
    </Card>

    <Card class="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg text-blue-900">Branding</CardTitle>
        <CardDescription>Upload your logo for documents.</CardDescription>
      </CardHeader>
      <CardContent class="flex items-center gap-6">
        <div
          class="w-24 h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400"
        >
          <span class="text-xs">No Logo</span>
        </div>
        <div class="space-y-2">
          <Label>Company Logo</Label>
          <Input type="file" class="text-sm" />
          <p class="text-[10px] text-muted-foreground">
            Recommended: 300x300px PNG or JPG.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card class="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg text-blue-900">Regional</CardTitle>
        <CardDescription>Set your default reporting currency.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <Label>Base Currency</Label>
          <Select v-model="form.currency">
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-[10px] text-amber-600 mt-1">
            * Changing base currency after recording transactions may affect
            reports.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

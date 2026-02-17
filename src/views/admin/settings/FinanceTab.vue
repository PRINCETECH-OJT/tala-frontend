<script setup lang="ts">
import { reactive } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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

const form = reactive({
  fiscalYearEndMonth: "12",
  taxBasis: "accrual",
  lockDate: "",
  showAccountNumbers: true,
  enableCostCenters: false,
});
</script>

<template>
  <div class="space-y-6">
    <Card class="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg text-blue-900">Accounting Period</CardTitle>
        <CardDescription
          >Define your financial year and tax reporting basis.</CardDescription
        >
      </CardHeader>
      <CardContent class="grid gap-6 md:grid-cols-2">
        <div class="space-y-2">
          <Label>Fiscal Year End</Label>
          <Select v-model="form.fiscalYearEndMonth">
            <SelectTrigger>
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">December 31</SelectItem>
              <SelectItem value="03">March 31</SelectItem>
              <SelectItem value="06">June 30</SelectItem>
              <SelectItem value="09">September 30</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-3">
          <Label>Tax Basis</Label>
          <RadioGroup v-model="form.taxBasis" class="flex gap-6">
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="accrual" value="accrual" />
              <Label for="accrual" class="font-normal cursor-pointer"
                >Accrual (Billed)</Label
              >
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="cash" value="cash" />
              <Label for="cash" class="font-normal cursor-pointer"
                >Cash (Collected)</Label
              >
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>

    <Card class="border-amber-100 bg-amber-50/30 shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg text-blue-900 flex items-center gap-2">
          Closing the Books
        </CardTitle>
        <CardDescription
          >Prevent changes to past data after tax filing.</CardDescription
        >
      </CardHeader>
      <CardContent>
        <div class="max-w-md space-y-2">
          <Label>Lock Date</Label>
          <div class="flex gap-2">
            <Input type="date" v-model="form.lockDate" class="bg-white" />
          </div>
          <p class="text-xs text-gray-500">
            Users cannot add or edit transactions on or before this date.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card class="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg text-blue-900">Preferences</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          class="flex items-center justify-between border p-3 rounded-lg bg-white"
        >
          <div class="space-y-0.5">
            <Label class="text-base">Show Account Numbers</Label>
            <p class="text-sm text-gray-500">
              Display GL codes (e.g. 1001-Cash) in reports and dropdowns.
            </p>
          </div>
          <Switch
            :checked="form.showAccountNumbers"
            @update:checked="(v: boolean) => (form.showAccountNumbers = v)"
          />
        </div>

        <div
          class="flex items-center justify-between border p-3 rounded-lg bg-white"
        >
          <div class="space-y-0.5">
            <Label class="text-base">Enable Cost Centers</Label>
            <p class="text-sm text-gray-500">
              Track expenses by department or project.
            </p>
          </div>
          <Switch
            :checked="form.enableCostCenters"
            @update:checked="(v: boolean) => (form.enableCostCenters = v)"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-vue-next";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["update:open"]);

const lineItems = reactive([
  {
    description: "",
    quantity: 1,
    price: 0,
    account: "400 - Advertising",
    total: 0,
  },
]);

const addLine = () =>
  lineItems.push({
    description: "",
    quantity: 1,
    price: 0,
    account: "",
    total: 0,
  });
const removeLine = (index: number) => lineItems.splice(index, 1);
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="max-w-5xl">
      <DialogHeader>
        <DialogTitle class="text-2xl font-bold text-slate-900"
          >New Bill</DialogTitle
        >
      </DialogHeader>

      <div class="grid grid-cols-4 gap-4 py-4 border-b">
        <div class="space-y-1">
          <Label class="text-xs uppercase font-bold text-slate-500">From</Label>
          <Input placeholder="Search contacts..." />
        </div>
        <div class="space-y-1">
          <Label class="text-xs uppercase font-bold text-slate-500">Date</Label>
          <Input type="date" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs uppercase font-bold text-slate-500"
            >Due Date</Label
          >
          <Input type="date" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs uppercase font-bold text-slate-500"
            >Reference</Label
          >
          <Input placeholder="Invoice number" />
        </div>
      </div>

      <div class="py-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b text-slate-500 font-medium">
              <th class="pb-2 w-1/3">Description</th>
              <th class="pb-2 px-2">Qty</th>
              <th class="pb-2 px-2">Unit Price</th>
              <th class="pb-2 px-2">Account</th>
              <th class="pb-2 px-2 text-right">Amount</th>
              <th class="pb-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in lineItems"
              :key="index"
              class="border-b"
            >
              <td class="py-2">
                <Input v-model="item.description" variant="ghost" />
              </td>
              <td class="py-2 px-2">
                <Input v-model="item.quantity" type="number" class="w-20" />
              </td>
              <td class="py-2 px-2">
                <Input v-model="item.price" type="number" class="w-32" />
              </td>
              <td class="py-2 px-2">
                <select class="w-full border rounded p-2 bg-transparent">
                  <option>400 - Advertising</option>
                  <option>420 - Rent</option>
                </select>
              </td>
              <td class="py-2 px-2 text-right font-medium">
                {{ (item.quantity * item.price).toFixed(2) }}
              </td>
              <td class="py-2 text-center">
                <button
                  @click="removeLine(index)"
                  class="text-slate-300 hover:text-red-500"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <Button variant="outline" size="sm" class="mt-4 gap-2" @click="addLine">
          <Plus class="w-4 h-4" /> Add a new line
        </Button>
      </div>

      <DialogFooter
        class="flex justify-between items-center bg-slate-50 p-4 -mx-6 -mb-6 rounded-b-lg"
      >
        <div class="text-right space-y-1 pr-10">
          <p class="text-slate-500">
            Subtotal: <span class="text-slate-900 font-medium">$575.50</span>
          </p>
          <p class="text-xl font-bold text-blue-900">Total: $575.50</p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="emit('update:open', false)"
            >Save as Draft</Button
          >
          <Button class="bg-[#13b5ea] hover:bg-[#11a0d0] text-white px-8"
            >Approve</Button
          >
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

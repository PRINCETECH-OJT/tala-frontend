<script setup lang="ts">
import { ref, computed } from "vue";
import { BillDialog, BillTable } from "@/components/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from "lucide-vue-next";
import type { Bill } from "@/types";

const isDialogOpen = ref(false);
const selectedBill = ref<Bill | null>(null);
const searchQuery = ref("");
const tableRef = ref();

const handleAddNew = () => {
  selectedBill.value = null;
  isDialogOpen.value = true;
};

const handleEdit = (bill: Bill) => {
  selectedBill.value = bill;
  isDialogOpen.value = true;
};

const refreshData = () => {
  tableRef.value?.fetchBills();
};
</script>

<template>
  <div class="p-6 space-y-6 bg-slate-50/50 min-h-screen font-sans">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Bills to Pay</h1>
        <p class="text-sm text-slate-500">
          Manage and track your supplier invoices and outgoings.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" class="gap-2 border-slate-200">
          <Download class="w-4 h-4" /> Export
        </Button>
        <Button
          @click="handleAddNew"
          class="bg-[#13b5ea] hover:bg-[#11a0d0] text-white gap-2 px-6"
        >
          <Plus class="w-4 h-4" /> New Bill
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card class="border-l-4 border-l-blue-500 shadow-sm">
        <CardContent class="pt-6">
          <p class="text-xs font-bold uppercase text-slate-500">
            Awaiting Payment
          </p>
          <p class="text-2xl font-bold text-slate-900">$12,450.00</p>
          <p class="text-[10px] text-slate-400 mt-1">
            8 Bills across 5 contacts
          </p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-red-500 shadow-sm">
        <CardContent class="pt-6">
          <p class="text-xs font-bold uppercase text-red-500">Overdue</p>
          <p class="text-2xl font-bold text-red-600">$3,200.50</p>
          <p class="text-[10px] text-slate-400 mt-1">
            2 Bills are past due date
          </p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-emerald-500 shadow-sm">
        <CardContent class="pt-6">
          <p class="text-xs font-bold uppercase text-emerald-600">
            Paid (This Month)
          </p>
          <p class="text-2xl font-bold text-slate-900">$8,900.00</p>
          <p class="text-[10px] text-slate-400 mt-1">
            Last payment made 2 days ago
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div
        class="p-4 border-b flex flex-col md:flex-row gap-4 justify-between bg-white"
      >
        <div class="relative w-full md:w-96">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            v-model="searchQuery"
            placeholder="Search contact or bill number..."
            class="pl-10"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" class="text-slate-600 gap-2">
            <Filter class="w-4 h-4" /> Filter
          </Button>
        </div>
      </div>

      <BillTable ref="tableRef" :search="searchQuery" @edit="handleEdit" />
    </div>

    <BillDialog
      v-model:open="isDialogOpen"
      :bill-to-edit="selectedBill"
      @success="refreshData"
    />
  </div>
</template>

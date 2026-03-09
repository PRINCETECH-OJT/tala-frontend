<script setup lang="ts">
import { ref } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, ArrowUpDown } from "lucide-vue-next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const bills = ref([
  {
    id: 1,
    contact_name: "Amazon Web Services",
    date: "2024-03-01",
    due_date: "2024-03-15",
    bill_number: "INV-9920",
    total_amount: 450.0,
    status: "Awaiting Payment",
  },
  {
    id: 2,
    contact_name: "Office Supplies Depot",
    date: "2024-02-28",
    due_date: "2024-03-10",
    bill_number: "PUR-102",
    total_amount: 125.5,
    status: "Overdue",
  },
]);

const getStatusColor = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Overdue":
      return "bg-red-50 text-red-700 border-red-200";
    case "Awaiting Payment":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};
</script>

<template>
  <div class="bg-white rounded-lg border shadow-sm">
    <Table>
      <TableHeader class="bg-slate-50">
        <TableRow>
          <TableHead class="w-12"
            ><input type="checkbox" class="rounded border-gray-300"
          /></TableHead>
          <TableHead class="font-semibold text-slate-900">Contact</TableHead>
          <TableHead class="font-semibold text-slate-900">Number</TableHead>
          <TableHead class="font-semibold text-slate-900">Date</TableHead>
          <TableHead class="font-semibold text-slate-900">Due Date</TableHead>
          <TableHead class="font-semibold text-slate-900 text-right"
            >Amount</TableHead
          >
          <TableHead class="font-semibold text-slate-900">Status</TableHead>
          <TableHead class="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="bill in bills"
          :key="bill.id"
          class="hover:bg-slate-50/50 cursor-pointer"
        >
          <TableCell
            ><input type="checkbox" class="rounded border-gray-300"
          /></TableCell>
          <TableCell class="font-medium text-blue-700">{{
            bill.contact_name
          }}</TableCell>
          <TableCell class="text-slate-600">{{ bill.bill_number }}</TableCell>
          <TableCell class="text-slate-600">{{ bill.date }}</TableCell>
          <TableCell
            :class="
              bill.status === 'Overdue'
                ? 'text-red-600 font-medium'
                : 'text-slate-600'
            "
          >
            {{ bill.due_date }}
          </TableCell>
          <TableCell class="text-right font-semibold">
            {{
              bill.total_amount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })
            }}
          </TableCell>
          <TableCell>
            <Badge variant="outline" :class="getStatusColor(bill.status)">
              {{ bill.status }}
            </Badge>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" class="h-8 w-8 text-slate-400">
              <MoreHorizontal class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

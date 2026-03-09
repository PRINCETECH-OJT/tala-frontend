<script setup lang="ts">
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Users,
  Plus,
} from "lucide-vue-next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const metrics = [
  {
    title: "Total Revenue",
    value: "₱124,500.00",
    change: "+12.5%",
    trending: "up",
  },
  {
    title: "Outstanding AR",
    value: "₱45,200.00",
    change: "+2.1%",
    trending: "up",
  },
  {
    title: "Net Profit",
    value: "₱82,300.00",
    change: "-3.4%",
    trending: "down",
  },
];
</script>

<template>
  <div class="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700">
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">
          Financial Overview
        </h1>
        <p class="text-slate-500">Real-time performance for ABC Corporation.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" class="hidden md:flex"
          >Download Report</Button
        >
        <Button class="bg-blue-900 hover:bg-blue-800 text-gray-200 shadow-md gap-2">
          New <Plus class="w-4 h-4" /> 
        </Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card
        v-for="item in metrics"
        :key="item.title"
        class="border-slate-200 shadow-sm hover:shadow-md transition-shadow"
      >
        <CardHeader
          class="flex flex-row items-center justify-between pb-2 space-y-0"
        >
          <CardTitle class="text-sm font-medium text-slate-500">{{
            item.title
          }}</CardTitle>
          <TrendingUp
            v-if="item.trending === 'up'"
            class="w-4 h-4 text-green-500"
          />
          <TrendingUp v-else class="w-4 h-4 text-red-500 rotate-180" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-slate-900">{{ item.value }}</div>
          <p
            class="text-xs mt-1"
            :class="item.trending === 'up' ? 'text-green-600' : 'text-red-600'"
          >
            {{ item.change }}
            <span class="text-slate-400 font-normal">from last month</span>
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 md:grid-cols-7">
      <Card class="md:col-span-4 border-slate-200">
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription
            >Income vs Expenses for the current fiscal period.</CardDescription
          >
        </CardHeader>
        <CardContent
          class="h-[300px] flex items-center justify-center bg-slate-50 rounded-b-xl border-t border-dashed"
        >
          <div class="text-center text-slate-400 italic">
            [ Chart.js / Recharts Component Implementation Here ]
          </div>
        </CardContent>
      </Card>

      <Card class="md:col-span-3 border-slate-200">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <div v-for="i in 3" :key="i" class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700"
            >
              <Receipt class="w-5 h-5" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-900">
                Invoice #INV-00{{ i }}
              </p>
              <p class="text-xs text-slate-500">Paid by Tech Solutions Inc.</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-slate-900">₱12,400</p>
              <Badge variant="secondary" class="text-[10px] uppercase"
                >Paid</Badge
              >
            </div>
          </div>
          <Button
            variant="ghost"
            class="w-full text-blue-900 font-bold hover:bg-blue-50"
          >
            View All Transactions
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Dashboard Overview</h1>

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
        <CardContent class="text-2xl font-bold">$12,000</CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">User Management</h1>
      <Button>+ Add New User</Button>
    </div>

    <div class="p-4 border rounded-lg bg-card text-card-foreground">
      <p>The user table will go here.</p>
    </div>
  </div>
</template>

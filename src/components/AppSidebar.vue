<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCompanyStore } from "@/stores/company";
import type { SidebarProps } from "@/components/ui/sidebar";
import type { NavMainItem, Company } from "@/types";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  LayoutDashboard,
  Landmark,
  Briefcase,
  ShieldCheck,
  PieChart,
  BookOpen,
  Receipt,
  CreditCard,
  FileText,
  Users,
  Settings,
  ChevronRight,
  ReceiptCent,
  LogOut,
} from "lucide-vue-next";

const props = defineProps<SidebarProps>();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const companyStore = useCompanyStore();

const userName = computed(() => authStore.user?.name || "Guest User");

const userRole = computed(() => {
  const roles = authStore.user?.roles;
  if (!roles?.length) return "User";
  // Logic to capitalize the first role found
  const role = roles[0];
  return typeof role === "string"
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "User";
});

const userInitials = computed(() => {
  const name = authStore.user?.name || "GU";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

const handleLogout = async () => {
  await authStore.logout();
  router.push("/auth/login");
};

const changeCompany = (company: any) => {
  if (company) {
    companyStore.setCurrentCompany(company);
    router.push(`/app/${company.id}/dashboard`);
  }
};

const data: { navMain: NavMainItem[] } = {
  navMain: [
    {
      title: "Overview",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        { title: "Dashboard", url: "/dashboard", icon: PieChart },
        { title: "Reports", url: "/reports", icon: FileText },
      ],
    },
    {
      title: "Financials",
      icon: Landmark,
      items: [
        { title: "General Ledger", url: "/ledger", icon: BookOpen },
        { title: "Banking", url: "/banking", icon: CreditCard },
        { title: "Accounts", url: "/acco unts", icon: CreditCard },
        { title: "Tax Rates", url: "/taxes", icon: ReceiptCent },
      ],
    },
    {
      title: "Operations",
      icon: Briefcase,
      items: [
        { title: "Contacts", url: "/contacts", icon: Landmark },
        { title: "Sales (AR)", url: "/sales", icon: CreditCard },
        { title: "Purchases (AP)", url: "/purchases", icon: Receipt },
        { title: "Invoices", url: "/invoices", icon: FileText },
        { title: "Bills", url: "/bills", icon: ReceiptCent },
      ],
    },
    {
      title: "Administration",
      icon: ShieldCheck,
      items: [
        { title: "User Management", url: "/users", icon: Users },
        { title: "Roles & Permissions", url: "/roles", icon: ShieldCheck },
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    },
  ],
};
</script>

<template>
  <Sidebar v-bind="props" collapsible="icon">
    <SidebarHeader
      class="flex flex-col items-center justify-center py-6 transition-all group-data-[collapsible=icon]:py-2"
    >
      <div
        class="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground shadow-sm group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:border-2"
      >
        <span
          v-if="!authStore.user?.avatar"
          class="text-xl font-bold group-data-[collapsible=icon]:text-xs"
        >
          {{ userInitials }}
        </span>
        <img
          v-else
          :src="authStore.user?.avatar"
          alt="Profile"
          class="aspect-square h-full w-full object-cover"
        />
      </div>

      <div
        class="mt-3 flex flex-col items-center gap-1 group-data-[collapsible=icon]:hidden"
      >
        <span class="text-sm font-semibold text-sidebar-foreground">
          {{ userName }}
        </span>
        <span
          class="text-xs font-semibold uppercase tracking-widest text-secondary"
        >
          {{ userRole }}
        </span>
      </div>
      <div
        v-if="companyStore.currentCompany"
        class="mt-4 w-full px-2 group-data-[collapsible=icon]:hidden"
      >
        <label
          class="text-xs font-semibold uppercase tracking-widest text-secondary mb-2 block"
        >
          Company
        </label>
        <div
          class="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2 hover:bg-sidebar-accent transition-colors"
        >
          <img
            v-if="companyStore.currentCompany?.logo_url"
            :src="companyStore.currentCompany.logo_url"
            :alt="companyStore.currentCompany.name"
            class="h-6 w-6 rounded object-cover"
          />
          <select
            class="flex-1 bg-transparent text-sm font-medium outline-none cursor-pointer"
            :value="companyStore.companyId"
            @change="
              (e) =>
                changeCompany(
                  companyStore.companies.find(
                    (c) => c.id === (e.target as HTMLSelectElement).value,
                  ),
                )
            "
          >
            <option
              v-for="company in companyStore.companies"
              :key="company.id"
              :value="company.id"
            >
              {{ company.name }}
            </option>
          </select>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarMenu>
        <Collapsible
          v-for="item in data.navMain"
          :key="item.title"
          as-child
          :default-open="item.isActive"
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton
                :tooltip="item.title"
                class="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <component :is="item.icon" class="h-5 w-5" />
                <span class="font-medium group-data-[collapsible=icon]:hidden">
                  {{ item.title }}
                </span>
                <ChevronRight
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem
                  v-for="childItem in item.items"
                  :key="childItem.title"
                >
                  <SidebarMenuSubButton as-child>
                    <RouterLink
                      :to="`/app/${companyStore.companyId}${childItem.url}`"
                      active-class="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <span>{{ childItem.title }}</span>
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarContent>

    <SidebarFooter class="p-2 border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            class="group-data-[collapsible=icon]:!p-0 justify-center hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 cursor-pointer transition-colors"
            tooltip="Logout"
          >
            <button
              @click="handleLogout"
              class="flex w-full items-center justify-center gap-2 group-data-[collapsible=icon]:gap-0"
            >
              <LogOut class="h-4 w-4" />
              <span class="font-medium group-data-[collapsible=icon]:hidden">
                Logout
              </span>
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>

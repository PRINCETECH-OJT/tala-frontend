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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  Calendar,
  Building,
} from "lucide-vue-next";

const props = defineProps<SidebarProps>();
const router = useRouter();
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
        { title: "Accounts", url: "/accounts", icon: CreditCard },
        { title: "Tax Rates", url: "/taxes", icon: ReceiptCent },
        { title: "Products/Services", url: "/items", icon: Briefcase },
      ],
    },
    {
      title: "Operations",
      icon: Briefcase,
      items: [
        { title: "Periods", url: "/fiscal-periods", icon: Calendar },
        { title: "Contacts", url: "/contacts", icon: Landmark },
        { title: "Invoices", url: "/invoices", icon: FileText },
        { title: "Quotes", url: "/quotes", icon: FileText },
        { title: "Bills", url: "/bills", icon: ReceiptCent },
      ],
    },
    {
      title: "Administration",
      icon: ShieldCheck,
      items: [
        { title: "User Management", url: "/users", icon: Users },
        { title: "Roles & Permissions", url: "/roles", icon: ShieldCheck },
      ],
    },
  ],
};
</script>

<template>
  <Sidebar
    v-bind="props"
    collapsible="icon"
    class="bg-[#0b1741] text-white border-r-0"
  >
    <SidebarHeader
      class="py-6 px-6 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
    >
      <div
        class="flex items-center gap-4 group-data-[collapsible=icon]:justify-center"
      >
        <div
          class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 overflow-hidden group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
        >
          <div
            class="absolute -top-1 -left-1 h-7 w-7 bg-[#0b1741] rounded-full group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5"
          ></div>
          <div
            class="h-5 w-5 rounded-full bg-[#0b1741] group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4"
          ></div>
        </div>
        <span
          class="text-2xl font-bold tracking-wide text-white group-data-[collapsible=icon]:hidden"
        >
          T.A.L.A
        </span>
      </div>
    </SidebarHeader>

    <SidebarContent
      class="px-4 gap-2 overflow-y-auto custom-scrollbar group-data-[collapsible=icon]:px-2"
    >
      <SidebarMenu>
        <Collapsible
          v-for="item in data.navMain"
          :key="item.title"
          as-child
          :default-open="item.isActive"
          class="group/collapsible"
        >
          <SidebarMenuItem class="my-1">
            <CollapsibleTrigger as-child>
              <SidebarMenuButton
                :tooltip="item.title"
                class="flex items-center gap-4 py-6 px-3 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3 group-data-[collapsible=icon]:h-auto transition-colors rounded-lg text-white"
              >
                <component :is="item.icon" class="h-5 w-5 shrink-0" />
                <span
                  class="text-[15px] font-medium group-data-[collapsible=icon]:hidden"
                >
                  {{ item.title }}
                </span>
                <ChevronRight
                  class="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub
                class="border-l border-white/20 ml-5 pl-2 mt-1 mb-2 flex flex-col gap-1 group-data-[collapsible=icon]:hidden"
              >
                <SidebarMenuSubItem
                  v-for="childItem in item.items"
                  :key="childItem.title"
                >
                  <SidebarMenuSubButton
                    as-child
                    class="h-auto w-full p-0 hover:bg-transparent"
                  >
                    <RouterLink
                      :to="`/app/${companyStore.companyId}${childItem.url}`"
                      class="block w-full px-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors rounded-lg"
                      active-class="bg-[#1043b3] !text-white font-semibold"
                    >
                      {{ childItem.title }}
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarContent>

    <SidebarFooter class="p-4 gap-4 pb-8 group-data-[collapsible=icon]:px-2">
      <SidebarMenu class="group-data-[collapsible=icon]:hidden">
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            class="hover:bg-white/10 py-6 px-4 rounded-lg transition-colors hover:text-white text-slate-300"
          >
            <RouterLink
              :to="`/app/${companyStore.companyId}/settings`"
              class="flex items-center gap-4"
            >
              <Settings class="h-5 w-5 shrink-0" />
              <span class="text-[15px] font-medium">Settings</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <div
            class="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/10 rounded-xl transition-colors mt-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          >
            <div
              class="h-10 w-10 rounded-full border-2 border-amber-500 overflow-hidden shrink-0 shadow-lg group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9"
            >
              <img
                v-if="authStore.user?.avatar"
                :src="authStore.user?.avatar"
                alt="Profile"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="h-full w-full bg-amber-500 flex items-center justify-center text-sm font-bold text-white"
              >
                {{ userInitials }}
              </div>
            </div>
            <div
              class="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden"
            >
              <span class="text-[15px] font-semibold text-white truncate">
                {{ userName }}
              </span>
              <span class="text-xs text-slate-300 truncate">
                {{ authStore.user?.email || "user@example.com" }}
              </span>
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          class="w-56 bg-white border-slate-200 shadow-xl ml-2"
        >
          <DropdownMenuLabel
            class="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Company Select
          </DropdownMenuLabel>
          <div class="px-2 py-2">
            <div class="flex items-center gap-2 rounded-md bg-slate-100 p-2">
              <Building class="h-4 w-4 text-slate-500" />
              <select
                class="flex-1 bg-transparent text-sm font-medium outline-none cursor-pointer text-slate-800"
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

          <DropdownMenuSeparator />

          <DropdownMenuItem
            @click="handleLogout"
            class="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 py-2.5"
          >
            <LogOut class="mr-2 h-4 w-4" />
            <span class="font-medium">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>

<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
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
} from "lucide-vue-next";

interface NavItem {
  title: string;
  url: string;
  icon?: any;
  isActive?: boolean;
}

interface NavMainItem {
  title: string;
  url?: string;
  icon: any;
  isActive?: boolean;
  items: NavItem[];
}

const props = defineProps<SidebarProps>();

const data: {
  versions: string[];
  navMain: NavMainItem[];
} = {
  versions: ["1.0.0", "1.1.0-beta"],
  navMain: [
    {
      title: "Overview",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: PieChart,
          isActive: true,
        },
        { title: "Reports & Analytics", url: "/reports", icon: FileText },
      ],
    },
    {
      title: "Financials",
      icon: Landmark,
      items: [
        { title: "General Ledger", url: "/ledger", icon: BookOpen },
        { title: "Banking & Cash", url: "/banking", icon: CreditCard },
      ],
    },
    {
      title: "Operations",
      icon: Briefcase,
      items: [
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
        { title: "System Settings", url: "/settings", icon: Settings },
      ],
    },
  ],
};
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader class="flex flex-col items-center justify-center py-10">
      <div
        class="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-sidebar-primary"
      >
        <img
          src="https://github.com/shadcn.png"
          alt="Admin Profile"
          class="aspect-square h-full w-full object-cover"
        />
      </div>

      <div class="mt-4 flex flex-col items-center gap-1">
        <span
          class="text-sm font-bold uppercase tracking-[0.2em] text-sidebar-foreground"
        >
          Admin
        </span>
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
              <SidebarMenuButton :tooltip="item.title">
                <component :is="item.icon" />
                <span class="font-semibold">{{ item.title }}</span>

                <ChevronRight
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem
                  v-for="childItem in item.items"
                  :key="childItem.title"
                >
                  <SidebarMenuSubButton
                    as-child
                    :is-active="childItem.isActive ?? false"
                    class="text-white hover:text-black data-[active=true]:text-black transition-colors"
                  >
                    <a
                      :href="childItem.url"
                      class="group flex items-center gap-2"
                    >
                      <span class="ml-2">{{ childItem.title }}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>

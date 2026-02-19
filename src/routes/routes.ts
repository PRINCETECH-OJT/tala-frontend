import { type RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/auth/login",
  },
  {
    path: "/auth/login",
    name: "Login",
    component: () => import("@/views/auth/LoginPage.vue"),
    meta: { guest: true },
  },
  {
    path: "/auth/register",
    name: "Register",
    component: () => import("@/views/auth/RegisterPage.vue"),
    meta: { guest: true },
  },
  {
    path: "/auth/verify-email",
    name: "Verify",
    component: () => import("@/views/auth/VerifyPage.vue"),
  },
  {
    path: "/onboarding/company",
    component: () => import("@/views/onboarding/CompanyOnboardingPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/app/:companyId",
    component: () => import("@/layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "DashboardOverview",
        component: () => import("@/views/overview/Dashboard.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "users",
        name: "UserManagement",
        component: () => import("@/views/admin/UserManagement.vue"),
        meta: { requiresAuth: true, permission: "users.manage" },
      },
      {
        path: "roles",
        name: "RolesAndPermissions",
        component: () => import("@/views/admin/RolesAndPermissions.vue"),
        meta: { permission: "users.manage" },
      },
      {
        path: "accounts",
        name: "ChartofAccounts",
        component: () => import("@/views/ChartofAccountsPage.vue"), 
        meta: { requiresAuth: true },
      },
      {
        path: "items",
        name: "Items",
        component: () => import("@/views/ItemsPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "taxes",
        name: "TaxManagement",
        component: () => import("@/views/TaxRatesPage.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "contacts",
        name: "Contacts",
        component: () => import("@/views/admin/ContactPage.vue"),
      },
      {
        path: "settings",
        name: "Settings",
        meta: { permission: "system.settings" },
        component: () => import("@/views/admin/settings/SettingsPage.vue"),
      },
    ],
  },
];

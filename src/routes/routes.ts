import { type RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/dashboard",
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
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "DashboardOverview",
        component: () => import("@/views/overview/Dashboard.vue"),
      },
      {
        path: "users",
        name: "UserManagement",
        component: () => import("@/views/admin/UserManagement.vue"),
        meta: { permission: "users.manage" },
      },
      {
        path: "accounts",
        name: "ChartofAccounts",
        component: () => import("@/views/ChartofAccountsPage.vue"),
      },
    ],
  },
];

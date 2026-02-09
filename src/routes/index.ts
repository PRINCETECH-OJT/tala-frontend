import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
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
    path: "/dashboard",

    component: () => import("@/layouts/DashboardLayout.vue"),
    meta: { requiresAuth: true },

    children: [
      {
        path: "",
        name: "DashboardOverview",
        component: () => import("../views/overview/Dashboard.vue"),
      },
      // Add your other pages here as you create them:
      /*
      {
        path: "reports",
        name: "Reports",
        component: () => import("@/views/overview/ReportsView.vue"),
      },
      {
        path: "users",
        name: "UserManagement",
        component: () => import("@/views/admin/UserManagement.vue"),
        meta: { permission: 'manage_users' } // Example of RBAC
      },
      */
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  if (!auth.user) {
    await auth.fetchUser();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: "Login" });
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return next({ name: "DashboardOverview" });
  }
  if (to.meta.permission && !auth.can(to.meta.permission as string)) {
    alert("You do not have permission to view this page.");
    return next({ name: "DashboardOverview" });
  }

  next();
});

export default router;

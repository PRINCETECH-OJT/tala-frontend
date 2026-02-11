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
        component: () => import("../views/overview/Dashboard.vue"),
      }, 
      {
        path: "users",
        name: "UserManagement",
        component: () => import("@/views/admin/UserManagement.vue"),
        meta: { permission: "users.manage" },
      },
      {
        path: "/accounts",
        name: "ChartofAccounts",  
        component: () => import("@/views/ChartofAccountsPage.vue"), 
      },
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
    console.log("Required:", to.meta.permission);
    console.log("User Permissions:", auth.user?.permissions);
    alert("You do not have permission to view this page.");
    return next({ name: "DashboardOverview" });
  }

  next();
});

export default router;

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import LoginPage from "@/views/auth/LoginPage.vue";
import RegisterPage from "@/views/auth/RegisterPage.vue";
import Dashboard from "@/views/dashboard/Dashboard.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: LoginPage,
    // meta: { guest: true },
  },
  {
    path: "/register",
    name: "Register",
    component: RegisterPage,
    meta: { guest: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
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
    return next({ name: "Dashboard" });
  }

  if (to.meta.permission && !auth.can(to.meta.permission as string)) {
    alert("You do not have permission to view this page.");
    return next({ name: "Dashboard" });
  }

  next();
});

export default router;

import { createRouter, createWebHistory } from "vue-router"; 
import { useAuthStore, useCompanyStore } from "@/stores";
import { routes } from "./routes";

const routes = [
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
    component: () => import("@/views/auth/EmailVerification.vue"),
  }, 
  {
    path: "/auth/email-verified",
    component: () => import("@/views/auth/EmailVerified.vue"),
  },
  {
    path: "/onboarding/company",
    component: () => import("@/views/onboarding/CompanyOnboarding.vue"),
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
        component: () => import("../views/overview/Dashboard.vue"),
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

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  const companyStore = useCompanyStore();

  if (!auth.user) {
    await auth.fetchUser();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: "Login" });
  }
  
  if (to.meta.guest && auth.isAuthenticated) {
    await companyStore.fetchCompanies()
    if (companyStore.currentCompany) {
      return next(`/app/${companyStore.currentCompany.id}/dashboard`)
    } else {
      return next("/onboarding/company")
    }
  }
  
  if (to.meta.permission && !auth.can(to.meta.permission as string)) {
    console.log("Required:", to.meta.permission);
    console.log("User Permissions:", auth.user?.permissions);
    alert("You do not have permission to view this page.");
    return next({ name: "DashboardOverview" });
  }
 
  if (to.params.companyId) {
    if (!companyStore.companies.length) {
      await companyStore.fetchCompanies();
    }

    const found = companyStore.companies.find(
      (c) => c.id == to.params.companyId
    );

    if (!found) {
      return next("/onboarding/company");
    }

    companyStore.setCurrentCompany(found);
  }

  next();
});

export default router;

import { createRouter, createWebHistory } from "vue-router"; 
import { useAuthStore, useCompanyStore } from "@/stores";
import { routes } from "./routes"; 

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  const companyStore = useCompanyStore(); 

  if (to.meta.requiresAuth && (!auth.isAuthenticated || !auth.user)) {
    return next({ name: "Login" });
  }

  if (to.meta.guest && auth.isAuthenticated) {
    if (!companyStore.companies.length) {
      await companyStore.fetchCompanies();
    }
    if (companyStore.currentCompany) {
      return next(`/app/${companyStore.currentCompany.id}/dashboard`);
    } else {
      return next("/onboarding/company");
    }
  }

  if (to.meta.permission && !auth.can(to.meta.permission as string)) {
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

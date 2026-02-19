import { createApp } from "vue";
import { createPinia } from "pinia";
import { useAuthStore, useCompanyStore } from './stores';
import "./style.css";
import App from "./App.vue";
import router from "./routes";

const app = createApp(App)
const pinia = createPinia() 
app.use(router)
app.use(pinia) 

const initApp = async () => {
  const auth = useAuthStore();
  const companyStore = useCompanyStore();

  try {
    await auth.fetchUser();

    if (auth.isAuthenticated) {
      await companyStore.fetchCompanies();

      if (companyStore.currentCompany && router.currentRoute.value.path === "/") {
        router.replace(`/app/${companyStore.currentCompany.id}/dashboard`);
      }
    }
  } catch (error) {
    console.error("Error initializing app:", error);
  } finally {
    app.mount("#app");
  }
}

initApp()

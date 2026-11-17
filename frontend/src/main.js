import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import { useCartStore } from "./stores/cart";
// Tat ca CSS cua Module 1-7 da duoc gop vao mot file duy nhat.
import "./style.css";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
const auth = useAuthStore(pinia),
  cart = useCartStore(pinia);
window.addEventListener("coffeShop:session-expired", () => {
  auth.logout();
  cart.reset();
  if (router.currentRoute.value.meta.requiresAuth) {
    router.replace({
      name: "login",
      query: { redirect: router.currentRoute.value.fullPath },
    });
  }
});
app.mount("#app");

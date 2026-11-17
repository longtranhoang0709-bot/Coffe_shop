<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useCartStore } from "./stores/cart";
import { useAuthStore } from "./stores/auth";
import SiteHeader from "./components/SiteHeader.vue";
import SiteFooter from "./components/SiteFooter.vue";
const route = useRoute();
const isAdminArea = computed(() => Boolean(route.meta.adminArea));
const auth = useAuthStore(),
  cart = useCartStore();
onMounted(async () => {
  try {
    await auth.bootstrap();
    await cart.refresh();
  } catch {
    /* Trang van hien thi neu API tam thoi ngat */
  }
});
</script>
<template>
  <div class="app-shell" :class="{ 'admin-app-shell': isAdminArea }">
    <SiteHeader v-if="!isAdminArea" />
    <main
      id="main-content"
      class="main-content"
      :class="{ 'admin-main-content': isAdminArea }"
    >
      <RouterView />
    </main>
    <SiteFooter v-if="!isAdminArea" />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useCartStore } from "../../stores/cart";
import {
  LayoutDashboard,
  Coffee,
  Tags,
  Boxes,
  TicketPercent,
  MapPinned,
  Users,
  ClipboardList,
  ChartNoAxesCombined,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-vue-next";
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const opened = ref(false);
const isAdmin = computed(() => auth.role === "ADMIN");
const links = computed(() =>
  isAdmin.value
    ? [
        { path: "/admin", label: "Tổng quan", icon: LayoutDashboard },
        { path: "/admin/products", label: "Sản phẩm", icon: Coffee },
        { path: "/admin/categories", label: "Danh mục", icon: Tags },
        { path: "/admin/inventory", label: "Tồn kho", icon: Boxes },
        {
          path: "/admin/promotions",
          label: "Mã giảm giá",
          icon: TicketPercent,
        },
        { path: "/admin/shipping", label: "Khu vực giao", icon: MapPinned },
        { path: "/admin/customers", label: "Người dùng", icon: Users },
        { path: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
        { path: "/admin/revenue", label: "Báo cáo", icon: ChartNoAxesCombined },
      ]
    : [
        {
          path: "/staff/orders",
          label: "Đơn hàng cần xử lý",
          icon: ClipboardList,
        },
      ],
);
function isActive(path) {
  return path === "/admin"
    ? route.path === "/admin"
    : route.path.startsWith(path);
}
function logout() {
  auth.logout();
  cart.reset();
  router.replace("/login");
}
</script>
<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" :class="{ 'is-open': opened }">
      <div class="admin-sidebar-top">
        <RouterLink
          :to="isAdmin ? '/admin' : '/staff/orders'"
          class="admin-brand"
          @click="opened = false"
          >coffe<span>Shop</span><small>CONTROL PANEL</small></RouterLink
        >
        <button
          class="admin-icon-btn admin-close"
          type="button"
          aria-label="Đóng menu"
          @click="opened = false"
        >
          <X :size="20" />
        </button>
      </div>
      <div class="admin-sidebar-label">
        {{ isAdmin ? "QUẢN TRỊ CỬA HÀNG" : "KHÔNG GIAN NHÂN VIÊN" }}
      </div>
      <nav class="admin-nav" aria-label="Quản trị">
        <RouterLink
          v-for="link in links"
          :key="link.path"
          :to="link.path"
          :class="{ active: isActive(link.path) }"
          @click="opened = false"
          ><component :is="link.icon" :size="18" /><span>{{
            link.label
          }}</span></RouterLink
        >
      </nav>
      <div class="admin-sidebar-bottom">
        <RouterLink to="/" @click="opened = false"
          ><ArrowLeft :size="17" />Về cửa hàng</RouterLink
        >
        <button type="button" @click="logout">
          <LogOut :size="17" />Đăng xuất
        </button>
      </div>
    </aside>
    <div v-if="opened" class="admin-overlay" @click="opened = false" />
    <div class="admin-content">
      <header class="admin-topbar">
        <button
          class="admin-icon-btn admin-menu-toggle"
          type="button"
          aria-label="Mở menu"
          @click="opened = true"
        >
          <Menu :size="23" />
        </button>
        <div class="admin-top-title">
          <span>COFFESHOP / QUẢN LÝ</span
          ><strong>{{ route.meta.title || "Tổng quan" }}</strong>
        </div>
        <div class="admin-top-user">
          <span class="admin-avatar">{{
            auth.user?.ho_ten?.charAt(0)?.toUpperCase() || "U"
          }}</span>
          <div>
            <strong>{{ auth.user?.ho_ten || "Nhân viên" }}</strong
            ><small>{{ auth.role }}</small>
          </div>
        </div>
      </header>
      <div class="admin-page-content"><RouterView /></div>
    </div>
  </div>
</template>

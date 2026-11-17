<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  ArrowUpRight,
  LogOut,
  Shield,
} from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";

const showMobile = ref(false);
const searchOpen = ref(false);
const searchText = ref("");
const auth = useAuthStore();
const cart = useCartStore();
const { user } = storeToRefs(auth);
const router = useRouter();
const isAdmin = computed(() => user.value?.vai_tro === "ADMIN");
const isStaff = computed(() => user.value?.vai_tro === "STAFF");

function submitSearch() {
  router.push({
    name: "menu",
    query: { search: searchText.value.trim() || undefined },
  });
  searchOpen.value = false;
  showMobile.value = false;
}
function logout() {
  auth.logout();
  cart.reset();
  showMobile.value = false;
  router.push("/");
}
</script>

<template>
  <div class="announcement">
    <span>ROASTED WITH CARE</span><span class="announcement-dot">✦</span
    ><span>GIAO CÀ PHÊ TẬN NƠI</span><span class="announcement-dot">✦</span
    ><span>MADE FOR EVERY MOMENT</span>
  </div>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink
        to="/"
        class="wordmark"
        @click="showMobile = false"
        aria-label="coffeShop - Trang chủ"
        >coffe<span>Shop</span><i class="brand-dot"></i
      ></RouterLink>
      <nav class="desktop-nav" aria-label="Điều hướng chính">
        <RouterLink to="/">Trang chủ</RouterLink>
        <RouterLink to="/menu">Thực đơn</RouterLink>
        <RouterLink :to="{ name: 'menu', query: { type: 'DO_UONG' } }"
          >Cà phê pha chế</RouterLink
        >
        <RouterLink :to="{ name: 'menu', query: { type: 'DONG_GOI' } }"
          >Hạt & bột</RouterLink
        >
        <RouterLink v-if="user" to="/my-orders">Đơn hàng</RouterLink>
        <RouterLink v-else to="/guest-order">Tra cứu đơn</RouterLink>
      </nav>
      <div class="header-actions">
        <button
          class="icon-btn"
          type="button"
          aria-label="Tìm kiếm"
          @click="searchOpen = !searchOpen"
        >
          <Search :size="19" :stroke-width="1.7" />
        </button>
        <RouterLink class="icon-btn cart-icon" to="/cart" aria-label="Giỏ hàng"
          ><ShoppingBag :size="19" :stroke-width="1.7" /><span
            v-if="cart.count"
            class="cart-count"
            >{{ cart.count }}</span
          ></RouterLink
        >
        <RouterLink
          v-if="!user"
          to="/login"
          class="icon-btn account-action"
          aria-label="Đăng nhập"
          ><UserRound :size="19" :stroke-width="1.7"
        /></RouterLink>
        <RouterLink v-else to="/account" class="account-name"
          ><UserRound :size="17" />
          <span>{{ user.ho_ten?.split(" ").slice(-1)[0] }}</span></RouterLink
        >
        <RouterLink
          v-if="isAdmin"
          to="/admin"
          class="icon-btn account-action"
          title="Quản trị"
          ><Shield :size="19"
        /></RouterLink>
        <RouterLink
          v-if="isStaff"
          to="/staff/orders"
          class="icon-btn account-action"
          title="Xử lý đơn"
          ><Shield :size="19"
        /></RouterLink>
        <button
          class="icon-btn mobile-toggle"
          aria-label="Menu"
          type="button"
          @click="showMobile = !showMobile"
        >
          <X v-if="showMobile" :size="21" /><Menu v-else :size="21" />
        </button>
      </div>
    </div>
    <form v-if="searchOpen" class="search-panel" @submit.prevent="submitSearch">
      <input
        v-model="searchText"
        autofocus
        placeholder="Bạn đang tìm loại cà phê nào?"
        aria-label="Từ khóa tìm kiếm"
      />
      <button class="btn btn-dark" type="submit">
        Tìm kiếm <ArrowUpRight :size="16" />
      </button>
    </form>
    <nav
      v-if="showMobile"
      class="mobile-nav"
      aria-label="Điều hướng trên điện thoại"
    >
      <RouterLink to="/" @click="showMobile = false">Trang chủ</RouterLink>
      <RouterLink to="/menu" @click="showMobile = false">Thực đơn</RouterLink>
      <RouterLink
        :to="{ name: 'menu', query: { type: 'DO_UONG' } }"
        @click="showMobile = false"
        >Đồ uống pha chế</RouterLink
      >
      <RouterLink
        :to="{ name: 'menu', query: { type: 'DONG_GOI' } }"
        @click="showMobile = false"
        >Cà phê hạt & bột</RouterLink
      >
      <RouterLink to="/cart" @click="showMobile = false">Giỏ hàng</RouterLink>
      <RouterLink v-if="user" to="/my-orders" @click="showMobile = false"
        >Đơn hàng của tôi</RouterLink
      >
      <RouterLink v-else to="/guest-order" @click="showMobile = false"
        >Tra cứu đơn khách</RouterLink
      >
      <RouterLink v-if="user" to="/account" @click="showMobile = false"
        >Tài khoản</RouterLink
      >
      <RouterLink v-if="isAdmin" to="/admin" @click="showMobile = false"
        >Quản trị</RouterLink
      >
      <RouterLink v-if="isStaff" to="/staff/orders" @click="showMobile = false"
        >Đơn cần xử lý</RouterLink
      >
      <button v-if="user" type="button" class="mobile-logout" @click="logout">
        <LogOut :size="15" /> Đăng xuất
      </button>
      <RouterLink v-else to="/login" @click="showMobile = false"
        >Đăng nhập / Đăng ký</RouterLink
      >
    </nav>
  </header>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, Clock3, Package, Search } from "lucide-vue-next";
import { listMyOrders } from "../api/order";
import { errorText } from "../api/axios";
import { formatVND } from "../format";

const records = ref([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const error = ref("");
const selected = ref("TAT_CA");
const limit = 10;
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / limit)));
const states = [
  ["TAT_CA", "Tất cả"],
  ["CHO_XAC_NHAN", "Chờ xác nhận"],
  ["DANG_CHUAN_BI", "Đang chuẩn bị"],
  ["DANG_GIAO", "Đang giao"],
  ["HOAN_THANH", "Hoàn thành"],
  ["DA_HUY", "Đã hủy"],
];
const filtered = computed(() =>
  selected.value === "TAT_CA"
    ? records.value
    : records.value.filter((v) => v.trang_thai_don === selected.value),
);
const orderNames = {
  CHO_XAC_NHAN: "Chờ xác nhận",
  DA_XAC_NHAN: "Đã xác nhận",
  DANG_CHUAN_BI: "Đang chuẩn bị",
  CHO_NHAN: "Chờ nhận",
  DANG_GIAO: "Đang giao",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};
function localDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await listMyOrders(page.value, limit);
    records.value = Array.isArray(data.items) ? data.items : [];
    total.value = Number(data.tong || 0);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
function changePage(next) {
  if (next >= 1 && next <= maxPage.value) {
    page.value = next;
    load();
  }
}
onMounted(load);
</script>
<template>
  <div class="container cs34-page">
    <div class="cs34-page-head">
      <div>
        <span class="eyebrow">MY PURCHASES</span>
        <h1 class="display">Đơn hàng của tôi.</h1>
        <p class="cs34-muted">Theo dõi những tách cà phê đang đến tay bạn.</p>
      </div>
      <RouterLink class="btn btn-light" to="/guest-order"
        >TRA CỨU ĐƠN KHÁCH <Search :size="16"
      /></RouterLink>
    </div>
    <div class="cs34-tabs" role="group" aria-label="Lọc đơn theo trạng thái">
      <button
        v-for="s in states"
        :key="s[0]"
        type="button"
        :class="{ active: selected === s[0] }"
        @click="selected = s[0]"
      >
        {{ s[1] }}
      </button>
    </div>
    <p v-if="selected !== 'TAT_CA'" class="cs34-muted">
      Bộ lọc áp dụng cho các đơn đang hiển thị trên trang {{ page }}.
    </p>
    <div v-if="error" class="notice notice-error" role="alert">
      {{ error }} <button class="cs34-inline-btn" @click="load">Thử lại</button>
    </div>
    <div v-else-if="loading" class="busy">Đang tải đơn hàng...</div>
    <div v-else-if="!filtered.length" class="empty-state">
      <Package :size="40" />
      <h3>Chưa có đơn trong mục này</h3>
      <p v-if="selected !== 'TAT_CA'">
        Bộ lọc chỉ áp dụng cho trang danh sách hiện tại.
      </p>
      <RouterLink to="/menu" class="btn btn-dark"
        >XEM THỰC ĐƠN <ArrowRight :size="16"
      /></RouterLink>
    </div>
    <div v-else class="cs34-orders-list">
      <article
        v-for="order in filtered"
        :key="order.ma_don_hang"
        class="cs34-order-card"
      >
        <div class="cs34-order-card-left">
          <span class="eyebrow">ĐƠN HÀNG {{ order.ma_don }}</span>
          <h3>{{ formatVND(order.tong_tien) }}</h3>
          <p><Clock3 :size="14" /> {{ localDate(order.ngay_dat) }}</p>
          <small
            >{{
              order.hinh_thuc_nhan === "GIAO_TAN_NOI"
                ? "Giao tận nơi"
                : order.hinh_thuc_nhan === "MANG_DI"
                  ? "Mang đi"
                  : "Tại quán"
            }}
            · {{ order.phuong_thuc }}</small
          >
        </div>
        <div class="cs34-card-right">
          <span
            class="cs34-tag"
            :class="{ 'cs34-tag-good': order.trang_thai_don === 'HOAN_THANH' }"
            >{{
              orderNames[order.trang_thai_don] || order.trang_thai_don
            }}</span
          ><RouterLink
            class="btn btn-light"
            :to="{ name: 'order-detail', params: { id: order.ma_don_hang } }"
            >XEM CHI TIẾT <ArrowRight :size="15"
          /></RouterLink>
        </div>
      </article>
    </div>
    <div v-if="!loading && total > limit" class="cs34-pager">
      <button
        class="btn btn-light"
        :disabled="page === 1"
        @click="changePage(page - 1)"
      >
        TRƯỚC</button
      ><span>Trang {{ page }} / {{ maxPage }} · {{ total }} đơn</span
      ><button
        class="btn btn-light"
        :disabled="page === maxPage"
        @click="changePage(page + 1)"
      >
        SAU
      </button>
    </div>
  </div>
</template>

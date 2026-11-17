<script setup>
import { computed, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { RouterLink } from "vue-router";
import { Check, ArrowRight, ClipboardCopy, Coffee } from "lucide-vue-next";
import { formatVND } from "../format";

const data = computed(() => {
  try {
    return JSON.parse(sessionStorage.getItem("coffeShopLastOrder") || "null");
  } catch {
    return null;
  }
});
const copied = ref(false);
const auth = useAuthStore();
async function copyCode() {
  if (!data.value?.ma_don) return;
  try {
    await navigator.clipboard.writeText(String(data.value.ma_don));
    copied.value = true;
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <main class="container order-success-page">
    <div v-if="data" class="order-success-card">
      <div class="order-success-icon">
        <Check :size="34" :stroke-width="1.5" />
      </div>
      <span class="eyebrow">THANK YOU FOR YOUR ORDER</span>
      <h1 class="display">Cảm ơn bạn đã<br /><em>chọn coffeShop.</em></h1>
      <p class="order-success-lead">
        Đơn hàng đã được ghi nhận. Quán sẽ tiếp nhận và chuẩn bị theo hình thức
        nhận bạn đã chọn.
      </p>
      <div class="order-success-details">
        <div class="price-line">
          <span>Mã đơn hàng</span
          ><strong class="order-code"
            >{{ data.ma_don }}
            <button
              type="button"
              class="icon-btn"
              aria-label="Sao chép mã đơn"
              @click="copyCode"
            >
              <ClipboardCopy :size="16" /></button
          ></strong>
        </div>
        <p v-if="copied" class="order-copied">Đã sao chép mã đơn hàng.</p>
        <div class="price-line">
          <span>Tổng tiền</span><strong>{{ formatVND(data.tong_tien) }}</strong>
        </div>
        <div class="price-line">
          <span>Thanh toán</span
          ><strong>{{
            data.phuong_thuc === "COD" ? "Khi nhận hàng" : "Tại quầy"
          }}</strong>
        </div>
        <div class="price-line">
          <span>Trạng thái đơn</span><strong>Chờ xác nhận</strong>
        </div>
      </div>
      <p class="order-success-tip">
        Hãy giữ mã đơn và số điện thoại nhận hàng để tra cứu. Bạn có thể xem
        tiến độ đơn ngay từ trang tài khoản hoặc tra cứu đơn khách.
      </p>
      <div class="cs34-payment-actions">
        <RouterLink
          v-if="auth.loggedIn"
          :to="{ name: 'order-detail', params: { id: data.ma_don_hang } }"
          class="btn btn-dark"
          >XEM ĐƠN HÀNG <ArrowRight :size="17"
        /></RouterLink>
        <RouterLink v-else to="/guest-order" class="btn btn-dark"
          >TRA CỨU ĐƠN KHÁCH <ArrowRight :size="17"
        /></RouterLink>
        <RouterLink to="/menu" class="btn btn-light"
          >TIẾP TỤC KHÁM PHÁ</RouterLink
        >
      </div>
    </div>
    <div v-else class="empty-state order-success-empty">
      <Coffee :size="38" class="order-success-bean" />
      <h3>Không có thông tin đơn gần nhất</h3>
      <p>Bạn có thể chọn cà phê và tạo đơn mới từ thực đơn.</p>
      <RouterLink to="/menu" class="btn btn-dark">XEM THỰC ĐƠN</RouterLink>
    </div>
  </main>
</template>

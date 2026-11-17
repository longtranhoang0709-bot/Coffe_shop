<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, Search, RefreshCw } from "lucide-vue-next";
import { cancelGuestOrder, lookupGuestOrder } from "../api/order";
import {
  startVnpayPayment,
  setPaymentContext,
  toSafeSandboxUrl,
} from "../api/payment";
import { errorText } from "../api/axios";
import OrderDetailsPanel from "../components/OrderDetailsPanel.vue";

const code = ref("");
const phone = ref("");
const order = ref(null);
const error = ref("");
const notice = ref("");
const busy = ref(false);
const payload = () => ({
  ma_don: code.value.trim(),
  sdt_nguoi_nhan: phone.value.trim(),
});
async function lookup() {
  error.value = "";
  notice.value = "";
  order.value = null;
  if (!code.value.trim() || !/^\+?[0-9 .()-]{9,20}$/.test(phone.value.trim())) {
    error.value = "Vui lòng nhập mã đơn và số điện thoại hợp lệ.";
    return;
  }
  busy.value = true;
  try {
    order.value = await lookupGuestOrder(payload());
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function cancel() {
  if (
    !order.value ||
    !window.confirm(`Bạn muốn hủy đơn ${order.value.ma_don}?`)
  )
    return;
  busy.value = true;
  error.value = "";
  try {
    await cancelGuestOrder(payload());
    notice.value = "Đơn hàng đã được hủy.";
    order.value = await lookupGuestOrder(payload());
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function pay() {
  if (!order.value) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await startVnpayPayment(payload());
    setPaymentContext(
      order.value,
      phone.value.trim(),
      result.ma_tham_chieu,
      true,
    );
    window.location.assign(toSafeSandboxUrl(result.paymentUrl));
  } catch (e) {
    error.value = errorText(e, e.message);
    busy.value = false;
  }
}
</script>
<template>
  <div class="container cs34-page">
    <div class="cs34-page-head">
      <div>
        <span class="eyebrow">GUEST ORDER LOOKUP</span>
        <h1 class="display">Tra cứu đơn hàng.</h1>
        <p class="cs34-muted">
          Không cần tài khoản. Sử dụng mã đơn và số điện thoại khi đặt hàng.
        </p>
      </div>
      <RouterLink class="btn btn-light" to="/menu"
        >XEM THỰC ĐƠN <ArrowRight :size="15"
      /></RouterLink>
    </div>
    <form class="cs34-search-panel" @submit.prevent="lookup">
      <div class="field">
        <label for="cs34-code">Mã đơn hàng</label
        ><input
          id="cs34-code"
          v-model="code"
          class="input"
          maxlength="50"
          autocomplete="off"
          placeholder="Ví dụ: CS..."
          required
        />
      </div>
      <div class="field">
        <label for="cs34-phone">Số điện thoại nhận hàng</label
        ><input
          id="cs34-phone"
          v-model="phone"
          class="input"
          maxlength="20"
          autocomplete="tel"
          placeholder="09xxxxxxxx"
          required
        />
      </div>
      <button class="btn btn-dark" type="submit" :disabled="busy">
        <Search :size="16" /> {{ busy ? "ĐANG TRA CỨU..." : "TRA CỨU" }}
      </button>
    </form>
    <div v-if="error" role="alert" class="notice notice-error cs34-response">
      {{ error }}
    </div>
    <div
      v-if="notice"
      role="status"
      class="notice notice-success cs34-response"
    >
      {{ notice }}
    </div>
    <div v-if="order" class="cs34-guest-result">
      <div class="cs34-section-heading">
        <div>
          <span class="eyebrow">ORDER FOUND</span>
          <h2>Đơn {{ order.ma_don }}</h2>
        </div>
        <button
          class="btn btn-light"
          type="button"
          :disabled="busy"
          @click="lookup"
        >
          <RefreshCw :size="15" /> LÀM MỚI
        </button>
      </div>
      <OrderDetailsPanel
        :order="order"
        :busy="busy"
        @cancel="cancel"
        @pay="pay"
      />
    </div>
  </div>
</template>

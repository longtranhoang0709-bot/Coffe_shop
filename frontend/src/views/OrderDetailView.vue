<script setup>
import { onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ArrowLeft, RefreshCw } from "lucide-vue-next";
import { getMyOrder, cancelMyOrder } from "../api/order";
import {
  startVnpayPayment,
  paymentIdentity,
  setPaymentContext,
  toSafeSandboxUrl,
} from "../api/payment";
import { useAuthStore } from "../stores/auth";
import { errorText } from "../api/axios";
import OrderDetailsPanel from "../components/OrderDetailsPanel.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const order = ref(null);
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const notice = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    order.value = await getMyOrder(route.params.id);
  } catch (e) {
    error.value = errorText(e);
    order.value = null;
  } finally {
    loading.value = false;
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
    await cancelMyOrder(order.value.ma_don_hang);
    await load();
    notice.value = "Đơn hàng đã được hủy.";
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function pay() {
  if (!order.value || !auth.loggedIn) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await startVnpayPayment(paymentIdentity(order.value, true));
    setPaymentContext(
      order.value,
      order.value.sdt_nguoi_nhan,
      result.ma_tham_chieu,
    );
    window.location.assign(toSafeSandboxUrl(result.paymentUrl));
  } catch (e) {
    error.value = errorText(e, e.message);
    busy.value = false;
  }
}
onMounted(load);
watch(() => route.params.id, load);
</script>
<template>
  <div class="container cs34-page">
    <div class="cs34-page-head">
      <div>
        <span class="eyebrow">ORDER DETAILS</span>
        <h1 class="display">Chi tiết đơn hàng.</h1>
        <p class="cs34-muted" v-if="order">Mã đơn: {{ order.ma_don }}</p>
      </div>
      <RouterLink class="btn btn-light" to="/my-orders"
        ><ArrowLeft :size="16" /> DANH SÁCH ĐƠN</RouterLink
      >
    </div>
    <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>
    <div v-if="notice" class="notice notice-success" role="status">
      {{ notice }}
    </div>
    <div v-if="loading" class="busy">Đang lấy thông tin đơn...</div>
    <div v-else-if="order">
      <div class="cs34-actions">
        <button class="btn btn-light" :disabled="busy" @click="load">
          <RefreshCw :size="15" /> LÀM MỚI TRẠNG THÁI
        </button>
      </div>
      <OrderDetailsPanel
        :order="order"
        :busy="busy"
        @cancel="cancel"
        @pay="pay"
      />
    </div>
    <div v-else-if="!error" class="empty-state">Không tìm thấy đơn hàng.</div>
  </div>
</template>

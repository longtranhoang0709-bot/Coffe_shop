<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  AlertTriangle,
  Check,
  Clock3,
  CreditCard,
  RefreshCw,
  ArrowRight,
} from "lucide-vue-next";
import {
  getMyPaymentStatus,
  verifyVnpayReturn,
  getPaymentContext,
  startVnpayPayment,
  paymentIdentity,
  setPaymentContext,
  toSafeSandboxUrl,
} from "../api/payment";
import { lookupGuestOrder } from "../api/order";
import { useAuthStore } from "../stores/auth";
import { errorText } from "../api/axios";
import { formatVND } from "../format";

const auth = useAuthStore();
const pending = ref(getPaymentContext());
const verifying = ref(false);
const checking = ref(false);
const starting = ref(false);
const verification = ref(null);
const status = ref(null);
const startError = ref(
  sessionStorage.getItem("coffeShopPaymentStartError") || "",
);
const error = ref("");
sessionStorage.removeItem("coffeShopPaymentStartError");
const returnQuery = window.location.search;
const fromVnpay = computed(() => returnQuery.includes("vnp_SecureHash="));
const stateText = computed(() => {
  if (fromVnpay.value && error.value && !verification.value)
    return "Không thể xác minh phản hồi VNPay.";
  if (status.value?.trang_thai_thanh_toan === "THANH_CONG")
    return "Thanh toán đã được xác nhận.";
  if (status.value?.trang_thai_thanh_toan === "THAT_BAI")
    return "Thanh toán không thành công.";
  return "Đang chờ xác nhận từ VNPay.";
});
const isSuccess = computed(
  () => status.value?.trang_thai_thanh_toan === "THANH_CONG",
);
const isFailed = computed(
  () => status.value?.trang_thai_thanh_toan === "THAT_BAI",
);

async function refreshStatus() {
  error.value = "";
  checking.value = true;
  try {
    await auth.bootstrap();
    const data = pending.value;
    if (!data?.ma_don_hang)
      throw new Error(
        "Chưa có thông tin đơn cần tra cứu. Hãy mở Đơn hàng của tôi hoặc Tra cứu đơn khách.",
      );
    if (auth.loggedIn && !data.isGuest) {
      status.value = await getMyPaymentStatus(data.ma_don_hang);
    } else if (data.ma_don && data.sdt_nguoi_nhan) {
      status.value = await lookupGuestOrder({
        ma_don: data.ma_don,
        sdt_nguoi_nhan: data.sdt_nguoi_nhan,
      });
    } else {
      throw new Error(
        "Vui lòng đăng nhập để xem trạng thái giao dịch, hoặc tra cứu bằng mã đơn và số điện thoại.",
      );
    }
  } catch (e) {
    error.value = e.response ? errorText(e) : e.message;
  } finally {
    checking.value = false;
  }
}
async function verifyReturn() {
  if (!fromVnpay.value) return;
  verifying.value = true;
  error.value = "";
  try {
    // Ky so duoc xac thuc tai Backend, khong dua vao query cua trinh duyet.
    const result = await verifyVnpayReturn(returnQuery);
    if (!result.hop_le) throw new Error("Chữ ký VNPay không hợp lệ.");
    if (
      pending.value?.ma_tham_chieu &&
      pending.value.ma_tham_chieu !== result.ma_tham_chieu
    ) {
      throw new Error(
        "Mã giao dịch trả về không trùng giao dịch bạn vừa tạo. Không thể xác nhận kết quả.",
      );
    }
    verification.value = result;
  } catch (e) {
    error.value = e.response ? errorText(e) : e.message;
  } finally {
    verifying.value = false;
  }
}
async function retryPayment() {
  if (!pending.value) return;
  starting.value = true;
  error.value = "";
  startError.value = "";
  try {
    await auth.bootstrap();
    const order = pending.value;
    const identity = paymentIdentity(
      order,
      auth.loggedIn && !order.isGuest,
      order.sdt_nguoi_nhan,
    );
    const result = await startVnpayPayment(identity);
    setPaymentContext(
      order,
      order.sdt_nguoi_nhan,
      result.ma_tham_chieu,
      Boolean(order.isGuest),
    );
    window.location.assign(toSafeSandboxUrl(result.paymentUrl));
  } catch (e) {
    error.value = e.response ? errorText(e) : e.message;
    starting.value = false;
  }
}
onMounted(async () => {
  await verifyReturn();
  // Khong cap nhat trang thai khi chi co Return - chi doc CSDL da cap nhat tu IPN.
  if (!fromVnpay.value || verification.value) await refreshStatus();
});
</script>
<template>
  <div class="container cs34-page cs34-payment-layout">
    <div class="cs34-payment-card">
      <div
        class="cs34-payment-icon"
        :class="{ 'is-success': isSuccess, 'is-failed': isFailed }"
      >
        <Check v-if="isSuccess" :size="32" /><AlertTriangle
          v-else-if="isFailed"
          :size="32"
        /><Clock3 v-else :size="32" />
      </div>
      <span class="eyebrow">VNPAY / PAYMENT STATUS</span>
      <h1 class="display">{{ stateText }}</h1>
      <p v-if="isSuccess" class="cs34-muted">
        Hệ thống đã ghi nhận giao dịch thành công trong cơ sở dữ liệu.
      </p>
      <p v-else-if="isFailed" class="cs34-muted">
        Giao dịch không hoàn tất. Nếu có phát sinh trừ tiền, hãy liên hệ ngân
        hàng hoặc quán để đối soát.
      </p>
      <p v-else class="cs34-muted">
        Trang quay lại từ VNPay không tự xác nhận thành công. Quán chỉ cập nhật
        khi nhận được IPN có chữ ký hợp lệ.
      </p>
      <div
        v-if="startError"
        class="notice notice-error cs34-response"
        role="alert"
      >
        Không mở được cổng thanh toán: {{ startError }}. Đơn đã được tạo; không
        đặt lại đơn mới.
      </div>
      <div v-if="error" class="notice notice-error cs34-response" role="alert">
        {{ error }}
      </div>
      <div v-if="verifying || checking" class="cs34-muted">
        {{
          verifying
            ? "Đang kiểm tra chữ ký trả về..."
            : "Đang lấy trạng thái mới nhất từ MySQL..."
        }}
      </div>
      <div class="cs34-payment-details">
        <div class="cs34-price-line">
          <span>Mã đơn</span
          ><strong>{{
            status?.ma_don || pending?.ma_don || "Chưa xác định"
          }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Mã giao dịch</span
          ><strong class="cs34-word-wrap">{{
            verification?.ma_tham_chieu || pending?.ma_tham_chieu || "—"
          }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Số tiền</span
          ><strong>{{
            status ? formatVND(status.so_tien ?? status.tong_tien) : "—"
          }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Trạng thái trong CSDL</span
          ><strong>{{
            status?.trang_thai_thanh_toan || "Chưa lấy được"
          }}</strong>
        </div>
      </div>
      <div class="cs34-payment-actions">
        <button
          class="btn btn-dark"
          :disabled="checking || verifying"
          @click="refreshStatus"
        >
          <RefreshCw :size="16" /> KIỂM TRA LẠI
        </button>
        <button
          v-if="!isSuccess && !isFailed && pending && !verification"
          class="btn btn-light"
          :disabled="starting"
          @click="retryPayment"
        >
          <CreditCard :size="16" /> MỞ LẠI LINK THANH TOÁN
        </button>
        <RouterLink
          v-if="auth.loggedIn && !pending?.isGuest"
          :to="
            pending?.ma_don_hang
              ? `/my-orders/${pending.ma_don_hang}`
              : '/my-orders'
          "
          class="btn btn-light"
          >XEM ĐƠN HÀNG <ArrowRight :size="16"
        /></RouterLink>
        <RouterLink v-else to="/guest-order" class="btn btn-light"
          >TRA CỨU ĐƠN <ArrowRight :size="16"
        /></RouterLink>
      </div>
      <p class="cs34-footnote">
        Sandbox: để VNPay gọi IPN vào Backend khi đang phát triển trên máy cá
        nhân, bạn cần cấu hình một endpoint HTTPS công khai theo hướng dẫn chính
        thức của VNPay.
      </p>
    </div>
  </div>
</template>

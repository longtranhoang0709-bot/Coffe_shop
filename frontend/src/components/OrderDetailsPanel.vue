<script setup>
import { computed } from "vue";
import { ArrowRight, Ban, CreditCard, PackageCheck } from "lucide-vue-next";
import OrderStatusTimeline from "./OrderStatusTimeline.vue";
import { formatVND } from "../format";

const props = defineProps({
  order: { type: Object, required: true },
  busy: Boolean,
});
const emit = defineEmits(["cancel", "pay"]);
const payment = computed(
  () => props.order?.trang_thai_thanh_toan || "CHUA_THANH_TOAN",
);
const cancelable = computed(
  () =>
    props.order?.trang_thai_don === "CHO_XAC_NHAN" &&
    payment.value !== "THANH_CONG" &&
    !(props.order?.phuong_thuc === "VNPAY" && props.order?.ma_giao_dich_vnpay),
);
const payable = computed(
  () =>
    props.order?.phuong_thuc === "VNPAY" &&
    props.order?.trang_thai_don === "CHO_XAC_NHAN" &&
    payment.value === "CHUA_THANH_TOAN",
);
const orderNames = {
  GIAO_TAN_NOI: "Giao tận nơi",
  MANG_DI: "Mang đi",
  TAI_QUAN: "Tại quán",
};
const payNames = {
  COD: "Thanh toán khi nhận hàng",
  TIEN_MAT: "Tiền mặt tại quán",
  VNPAY: "VNPay",
};
const paymentNames = {
  CHUA_THANH_TOAN: "Chưa thanh toán",
  THANH_CONG: "Đã thanh toán",
  THAT_BAI: "Thất bại",
  DA_HOAN_TIEN: "Đã hoàn tiền",
};
const optionsLabel = (raw) => {
  if (!raw) return "";
  try {
    const opts = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(opts))
      return opts
        .map((v) =>
          typeof v === "object" ? v.ten_tuy_chon || v.ten || "" : "",
        )
        .filter(Boolean)
        .join(", ");
  } catch {
    /* JSON cu */
  }
  return "";
};
const dateLabel = (s) => {
  if (!s) return "—";
  const d = new Date(String(s).replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? String(s)
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
};
</script>
<template>
  <div class="cs34-order-body">
    <div class="cs34-panel">
      <div class="cs34-section-heading">
        <div>
          <span class="eyebrow">ORDER TRACKING</span>
          <h2>Tiến độ đơn hàng</h2>
        </div>
        <span
          class="cs34-tag"
          :class="{ 'cs34-tag-good': order.trang_thai_don === 'HOAN_THANH' }"
          >{{ order.trang_thai_don }}</span
        >
      </div>
      <OrderStatusTimeline
        :status="order.trang_thai_don"
        :method="order.hinh_thuc_nhan"
      />
      <p class="cs34-muted">Đặt lúc {{ dateLabel(order.ngay_dat) }}</p>
    </div>
    <div class="cs34-order-columns">
      <div class="cs34-panel">
        <div class="cs34-section-heading">
          <div>
            <span class="eyebrow">YOUR ITEMS</span>
            <h2>Các món đã đặt</h2>
          </div>
          <PackageCheck :size="22" />
        </div>
        <div
          v-for="item in order.items || []"
          :key="item.ma_chi_tiet_don"
          class="cs34-item-row"
        >
          <div>
            <strong>{{ item.ten_san_pham_luu }}</strong>
            <p>{{ item.ten_bien_the_luu }} · SL {{ item.so_luong }}</p>
            <small v-if="optionsLabel(item.tuy_chon_da_chon)">{{
              optionsLabel(item.tuy_chon_da_chon)
            }}</small>
          </div>
          <strong>{{ formatVND(item.thanh_tien) }}</strong>
        </div>
        <div v-if="!(order.items || []).length" class="cs34-muted">
          Chưa có chi tiết món.
        </div>
      </div>
      <div class="cs34-panel">
        <div class="cs34-section-heading">
          <div>
            <span class="eyebrow">PAYMENT & DELIVERY</span>
            <h2>Thông tin đơn</h2>
          </div>
          <CreditCard :size="21" />
        </div>
        <div class="cs34-price-line">
          <span>Hình thức nhận</span
          ><strong>{{
            orderNames[order.hinh_thuc_nhan] || order.hinh_thuc_nhan
          }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Thanh toán</span
          ><strong>{{
            payNames[order.phuong_thuc] || order.phuong_thuc
          }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Trạng thái thanh toán</span
          ><strong>{{ paymentNames[payment] || payment }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Người nhận</span><strong>{{ order.ten_nguoi_nhan }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Liên hệ</span><strong>{{ order.sdt_nguoi_nhan }}</strong>
        </div>
        <p v-if="order.hinh_thuc_nhan === 'GIAO_TAN_NOI'" class="cs34-address">
          {{
            [order.dia_chi_giao_hang, order.phuong_xa, order.tinh_thanh]
              .filter(Boolean)
              .join(", ")
          }}
        </p>
        <p v-if="order.ma_van_don" class="cs34-muted">
          Mã vận đơn: <b>{{ order.ma_van_don }}</b>
        </p>
        <p v-if="order.ghi_chu" class="cs34-muted">
          Ghi chú: {{ order.ghi_chu }}
        </p>
        <hr class="line-divider" />
        <div class="cs34-price-line">
          <span>Tạm tính</span><strong>{{ formatVND(order.tam_tinh) }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Giảm giá</span
          ><strong>− {{ formatVND(order.tien_giam) }}</strong>
        </div>
        <div class="cs34-price-line">
          <span>Phí giao</span><strong>{{ formatVND(order.phi_giao) }}</strong>
        </div>
        <div class="cs34-price-line cs34-price-total">
          <span>Thành tiền</span
          ><strong>{{ formatVND(order.tong_tien) }}</strong>
        </div>
      </div>
    </div>
    <div class="cs34-actions">
      <button
        v-if="payable"
        type="button"
        class="btn btn-dark"
        :disabled="busy"
        @click="emit('pay')"
      >
        THANH TOÁN VNPAY <ArrowRight :size="16" />
      </button>
      <button
        v-if="cancelable"
        type="button"
        class="btn btn-light"
        :disabled="busy"
        @click="emit('cancel')"
      >
        <Ban :size="16" /> HỦY ĐƠN
      </button>
      <p
        v-if="order.phuong_thuc === 'VNPAY' && payment === 'THAT_BAI'"
        class="cs34-muted"
      >
        Giao dịch VNPay không thành công. Theo thiết kế hiện tại, mỗi đơn chỉ có
        một lần thanh toán; hãy liên hệ quán để xử lý.
      </p>
    </div>
  </div>
</template>

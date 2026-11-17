<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Store,
  PackageCheck,
  TicketPercent,
  CreditCard,
  CheckCircle2,
} from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { useCartStore } from "../stores/cart";
import { listAddresses } from "../api/user";
import { listDeliveryZones } from "../api/shipping";
import { previewOrder, createOrder } from "../api/order";
import {
  startVnpayPayment,
  paymentIdentity,
  setPaymentContext,
  toSafeSandboxUrl,
} from "../api/payment";
import { errorText } from "../api/axios";
import { formatVND } from "../format";

const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const initializing = ref(true);
const error = ref("");
const zonesError = ref("");
const busy = ref(false);
const quoting = ref(false);
const zones = ref([]);
const addresses = ref([]);
const quote = ref(null);
const method = ref("GIAO_TAN_NOI");
const paymentMethod = ref("COD");
const addressMode = ref("manual");
const selectedAddressId = ref("");
const selectedZoneId = ref("");
const couponCode = ref("");
const receiverName = ref("");
const receiverPhone = ref("");
const addressDetail = ref("");
const notes = ref("");
const accepted = ref(false);

const isLoggedIn = computed(() => auth.loggedIn);
const containsDrink = computed(() =>
  cart.items.some((item) => item.loai_san_pham === "DO_UONG"),
);
const containsPacked = computed(() =>
  cart.items.some((item) => item.loai_san_pham === "DONG_GOI"),
);
const isDelivery = computed(() => method.value === "GIAO_TAN_NOI");
const selectedAddress = computed(
  () =>
    addresses.value.find(
      (a) => String(a.ma_dia_chi) === selectedAddressId.value,
    ) || null,
);
const compatibleZones = computed(() =>
  zones.value.filter((zone) => {
    if (containsDrink.value && !Boolean(zone.cho_giao_do_uong)) return false;
    if (containsPacked.value && !Boolean(zone.cho_giao_dong_goi)) return false;
    if (addressMode.value === "saved" && selectedAddress.value) {
      return (
        normalize(zone.tinh_thanh) ===
          normalize(selectedAddress.value.tinh_thanh) &&
        normalize(zone.phuong_xa) === normalize(selectedAddress.value.phuong_xa)
      );
    }
    return true;
  }),
);
const selectedZone = computed(
  () =>
    compatibleZones.value.find(
      (zone) => String(zone.ma_khu_vuc) === selectedZoneId.value,
    ) || null,
);
const selectedContact = computed(() =>
  isDelivery.value && addressMode.value === "saved"
    ? selectedAddress.value
    : null,
);
const displayedName = computed(
  () => selectedContact.value?.ten_nguoi_nhan || receiverName.value,
);
const displayedPhone = computed(
  () => selectedContact.value?.sdt_nguoi_nhan || receiverPhone.value,
);
const quoteItems = computed(() =>
  Array.isArray(quote.value?.items) ? quote.value.items : [],
);

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}
function initialContact() {
  if (!receiverName.value && auth.user?.ho_ten)
    receiverName.value = auth.user.ho_ten;
  if (
    !receiverPhone.value &&
    (auth.user?.so_dien_thoai || auth.user?.so_dien_tho)
  ) {
    receiverPhone.value = auth.user.so_dien_thoai || auth.user.so_dien_tho;
  }
}
function draft() {
  const data = { hinh_thuc_nhan: method.value };
  const trimmedCoupon = couponCode.value.trim().toUpperCase();
  if (trimmedCoupon) data.ma_code = trimmedCoupon;
  const trimmedNotes = notes.value.trim();
  if (trimmedNotes) data.ghi_chu = trimmedNotes;
  if (isDelivery.value) {
    data.ma_khu_vuc = Number(selectedZoneId.value);
    if (addressMode.value === "saved" && selectedAddress.value) {
      data.ma_dia_chi = Number(selectedAddressId.value);
    } else {
      data.tinh_thanh = selectedZone.value?.tinh_thanh || "";
      data.phuong_xa = selectedZone.value?.phuong_xa || "";
      data.dia_chi_giao_hang = addressDetail.value.trim();
      data.ten_nguoi_nhan = receiverName.value.trim();
      data.sdt_nguoi_nhan = receiverPhone.value.trim();
    }
  } else {
    data.ten_nguoi_nhan = receiverName.value.trim();
    data.sdt_nguoi_nhan = receiverPhone.value.trim();
  }
  return data;
}
const quoteSignature = computed(() => JSON.stringify(draft()));
watch(quoteSignature, () => {
  quote.value = null;
  error.value = "";
});
watch(method, (value) => {
  paymentMethod.value = value === "GIAO_TAN_NOI" ? "COD" : "TIEN_MAT";
  selectedZoneId.value = "";
});
watch([addressMode, selectedAddressId, compatibleZones], () => {
  if (
    !compatibleZones.value.some(
      (z) => String(z.ma_khu_vuc) === selectedZoneId.value,
    )
  )
    selectedZoneId.value = "";
});

function validate(forCreate = false) {
  if (!cart.items.length) return "Giỏ hàng trống. Hãy chọn sản phẩm trước.";
  if (!cart.cart.co_the_dat_hang)
    return "Giỏ hàng có sản phẩm không hợp lệ hoặc vượt tồn kho.";
  if (isDelivery.value) {
    if (!selectedZone.value)
      return "Vui lòng chọn khu vực giao hàng phù hợp với sản phẩm.";
    if (addressMode.value === "saved") {
      if (!selectedAddress.value) return "Vui lòng chọn địa chỉ đã lưu.";
    } else if (addressDetail.value.trim().length < 5) {
      return "Vui lòng nhập số nhà và tên đường (ít nhất 5 ký tự).";
    }
  }
  if (forCreate) {
    if (displayedName.value.trim().length < 2)
      return "Vui lòng nhập tên người nhận.";
    if (!/^\+?[0-9 .()-]{9,20}$/.test(displayedPhone.value.trim()))
      return "Số điện thoại người nhận không hợp lệ.";
    if (!accepted.value)
      return "Vui lòng xác nhận đã kiểm tra thông tin đơn hàng.";
  }
  return "";
}

async function load() {
  initializing.value = true;
  try {
    await auth.bootstrap();
    initialContact();
    const result = await Promise.allSettled([
      cart.refresh(),
      listDeliveryZones(),
      auth.loggedIn ? listAddresses() : Promise.resolve([]),
    ]);
    if (result[0].status === "rejected")
      error.value = errorText(result[0].reason);
    if (result[1].status === "fulfilled") {
      zones.value = Array.isArray(result[1].value) ? result[1].value : [];
    } else {
      zonesError.value = errorText(result[1].reason);
    }
    if (result[2].status === "fulfilled") {
      addresses.value = Array.isArray(result[2].value) ? result[2].value : [];
      const current =
        addresses.value.find((a) => a.la_mac_dinh) || addresses.value[0];
      if (current) {
        selectedAddressId.value = String(current.ma_dia_chi);
        addressMode.value = "saved";
      }
    }
  } finally {
    initializing.value = false;
  }
}
onMounted(load);

async function getQuote() {
  const issue = validate(false);
  if (issue) {
    error.value = issue;
    return;
  }
  quoting.value = true;
  error.value = "";
  try {
    quote.value = await previewOrder(draft());
  } catch (e) {
    quote.value = null;
    error.value = errorText(e);
  } finally {
    quoting.value = false;
  }
}
async function submit() {
  const issue = validate(true);
  if (issue) {
    error.value = issue;
    return;
  }
  if (!quote.value) {
    error.value = "Vui lòng bấm “Kiểm tra tổng tiền” trước khi đặt hàng.";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    // Backend tu tinh lai gia, phi giao va ton kho trong transaction.
    const order = await createOrder({
      ...draft(),
      phuong_thuc: paymentMethod.value,
    });
    sessionStorage.setItem(
      "coffeShopLastOrder",
      JSON.stringify({
        ma_don_hang: order.ma_don_hang,
        ma_don: order.ma_don,
        tong_tien: order.tong_tien,
        trang_thai_don: order.trang_thai_don,
        phuong_thuc: order.phuong_thuc,
        trang_thai_thanh_toan: order.trang_thai_thanh_toan,
        sdt_nguoi_nhan: displayedPhone.value.trim(),
      }),
    );
    cart.reset();
    if (paymentMethod.value === "VNPAY") {
      // Da tao don -> KHONG tao lai don neu VNPay tam thoi loi.
      setPaymentContext(
        order,
        displayedPhone.value.trim(),
        null,
        !auth.loggedIn,
      );
      try {
        const payment = await startVnpayPayment(
          paymentIdentity(order, auth.loggedIn, displayedPhone.value.trim()),
        );
        setPaymentContext(
          order,
          displayedPhone.value.trim(),
          payment.ma_tham_chieu,
          !auth.loggedIn,
        );
        window.location.assign(toSafeSandboxUrl(payment.paymentUrl));
      } catch (payError) {
        // Chuyen toi trang cho thanh toan de nguoi dung thu mo lai link cho CUNG don.
        sessionStorage.setItem(
          "coffeShopPaymentStartError",
          payError.response ? errorText(payError) : payError.message,
        );
        await router.replace({ name: "payment-result" });
      }
    } else {
      router.replace({ name: "order-success" });
    }
  } catch (e) {
    quote.value = null;
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container checkout-page">
    <div class="page-top checkout-page-top">
      <span class="eyebrow">YOUR ORDER, YOUR WAY</span>
      <h1 class="display">Hoàn tất đặt hàng.</h1>
      <p>
        Thêm thông tin nhận hàng, kiểm tra tổng tiền và gửi yêu cầu đến quán.
      </p>
    </div>

    <div v-if="initializing" class="busy">
      Đang tải giỏ hàng và khu vực phục vụ...
    </div>
    <div v-else-if="!cart.items.length" class="empty-state checkout-empty">
      <h3>Chưa có sản phẩm để đặt</h3>
      <p>Hãy thêm cà phê vào giỏ để tiếp tục.</p>
      <RouterLink to="/menu" class="btn btn-dark">XEM THỰC ĐƠN</RouterLink>
    </div>
    <div v-else class="checkout-layout">
      <main class="checkout-main">
        <div
          v-if="error"
          class="notice notice-error checkout-alert"
          role="alert"
        >
          {{ error }}
        </div>
        <div
          v-if="zonesError"
          class="notice notice-error checkout-alert"
          role="alert"
        >
          Không tải được vùng giao hàng: {{ zonesError }}. Đơn tại quán hoặc
          mang đi vẫn có thể đặt.
        </div>
        <section class="checkout-panel">
          <div class="checkout-section-heading">
            <span class="checkout-step">01</span>
            <div>
              <span class="eyebrow">DELIVERY METHOD</span>
              <h2>Nhận cà phê theo cách bạn muốn.</h2>
            </div>
          </div>
          <div class="checkout-delivery-modes">
            <button
              class="checkout-mode"
              :class="{ active: method === 'GIAO_TAN_NOI' }"
              @click="method = 'GIAO_TAN_NOI'"
            >
              <Truck :size="23" /><strong>Giao tận nơi</strong
              ><small>Trong vùng phục vụ</small>
            </button>
            <button
              class="checkout-mode"
              :class="{ active: method === 'MANG_DI' }"
              @click="method = 'MANG_DI'"
            >
              <PackageCheck :size="23" /><strong>Mang đi</strong
              ><small>Nhận tại quầy</small>
            </button>
            <button
              class="checkout-mode"
              :class="{ active: method === 'TAI_QUAN' }"
              @click="method = 'TAI_QUAN'"
            >
              <Store :size="23" /><strong>Tại quán</strong
              ><small>Thưởng thức tại quán</small>
            </button>
          </div>
          <p
            v-if="isDelivery && containsDrink && containsPacked"
            class="checkout-help"
          >
            Giỏ hàng có cả đồ uống và cà phê đóng gói. Chỉ những khu vực cho
            phép giao cả hai loại mới được chọn. Nếu không có khu vực phù hợp,
            vui lòng tách đơn.
          </p>
          <p v-else-if="isDelivery && containsDrink" class="checkout-help">
            Đồ uống pha chế chỉ giao trong những khu vực nội thành quán hỗ trợ.
          </p>
          <p v-else-if="isDelivery" class="checkout-help">
            Cà phê hạt/bột được giao đến các tỉnh thành có trong danh sách phục
            vụ.
          </p>
        </section>

        <section class="checkout-panel">
          <div class="checkout-section-heading">
            <span class="checkout-step">02</span>
            <div>
              <span class="eyebrow">RECEIVER DETAILS</span>
              <h2>
                {{
                  isDelivery ? "Thông tin giao hàng." : "Thông tin người nhận."
                }}
              </h2>
            </div>
          </div>
          <template v-if="isDelivery">
            <div
              v-if="isLoggedIn && addresses.length"
              class="checkout-address-switch"
            >
              <label
                ><input v-model="addressMode" type="radio" value="saved" /> Địa
                chỉ đã lưu</label
              >
              <label
                ><input v-model="addressMode" type="radio" value="manual" />
                Nhập địa chỉ khác</label
              >
            </div>
            <div
              v-if="addressMode === 'saved' && isLoggedIn && addresses.length"
              class="field"
            >
              <label for="saved-address">Chọn địa chỉ giao hàng</label>
              <select
                id="saved-address"
                v-model="selectedAddressId"
                class="select"
              >
                <option
                  v-for="a in addresses"
                  :key="a.ma_dia_chi"
                  :value="String(a.ma_dia_chi)"
                >
                  {{ a.ten_nguoi_nhan }} · {{ a.dia_chi_chi_tiet }},
                  {{ a.phuong_xa }}, {{ a.tinh_thanh
                  }}{{ a.la_mac_dinh ? " · Mặc định" : "" }}
                </option>
              </select>
              <p v-if="selectedAddress" class="checkout-help">
                Số nhận hàng: {{ selectedAddress.sdt_nguoi_nhan }}.
                <RouterLink class="inline-link" to="/account"
                  >Quản lý địa chỉ</RouterLink
                >
              </p>
            </div>
            <div class="field checkout-zone-field">
              <label for="delivery-zone"
                >Khu vực giao hàng <span class="required">*</span></label
              >
              <select
                id="delivery-zone"
                v-model="selectedZoneId"
                class="select"
                :disabled="!compatibleZones.length"
              >
                <option value="">
                  {{
                    compatibleZones.length
                      ? "Chọn khu vực phục vụ"
                      : "Không có khu vực phù hợp"
                  }}
                </option>
                <option
                  v-for="z in compatibleZones"
                  :key="z.ma_khu_vuc"
                  :value="String(z.ma_khu_vuc)"
                >
                  {{ z.ten_khu_vuc }} · {{ z.phuong_xa }}, {{ z.tinh_thanh }} ·
                  {{ formatVND(z.phi_giao_hang) }}
                </option>
              </select>
              <p
                v-if="!compatibleZones.length"
                class="checkout-help checkout-warn"
              >
                Vui lòng kiểm tra địa chỉ hoặc tách giỏ hàng nếu có đồ uống cần
                giao ngoài vùng hỗ trợ.
              </p>
            </div>
            <div
              v-if="addressMode === 'manual'"
              class="form-grid checkout-form-grid"
            >
              <div class="field">
                <label for="delivery-province">Tỉnh / thành phố</label
                ><input
                  id="delivery-province"
                  class="input"
                  :value="selectedZone?.tinh_thanh || ''"
                  readonly
                  placeholder="Chọn khu vực phía trên"
                />
              </div>
              <div class="field">
                <label for="delivery-ward">Phường / xã</label
                ><input
                  id="delivery-ward"
                  class="input"
                  :value="selectedZone?.phuong_xa || ''"
                  readonly
                  placeholder="Chọn khu vực phía trên"
                />
              </div>
              <div class="field checkout-full">
                <label for="delivery-street"
                  >Số nhà, tên đường <span class="required">*</span></label
                ><input
                  id="delivery-street"
                  v-model="addressDetail"
                  class="input"
                  maxlength="255"
                  placeholder="Ví dụ: 25 đường Nguyễn Huệ"
                  autocomplete="street-address"
                />
              </div>
            </div>
          </template>
          <div
            v-if="!isDelivery || addressMode === 'manual'"
            class="form-grid checkout-form-grid"
            style="margin-top: 18px"
          >
            <div class="field">
              <label for="receiver-name"
                >Họ tên người nhận <span class="required">*</span></label
              ><input
                id="receiver-name"
                v-model="receiverName"
                class="input"
                maxlength="150"
                autocomplete="name"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div class="field">
              <label for="receiver-phone"
                >Số điện thoại <span class="required">*</span></label
              ><input
                id="receiver-phone"
                v-model="receiverPhone"
                class="input"
                maxlength="20"
                autocomplete="tel"
                placeholder="09xxxxxxxx"
              />
            </div>
          </div>
          <div class="field" style="margin-top: 20px">
            <label for="order-note">Ghi chú đơn hàng (không bắt buộc)</label
            ><textarea
              id="order-note"
              v-model="notes"
              class="textarea"
              maxlength="1000"
              placeholder="Ví dụ: gọi điện khi đến, vui lòng giao nhẹ tay..."
            />
          </div>
        </section>

        <section class="checkout-panel">
          <div class="checkout-section-heading">
            <span class="checkout-step">03</span>
            <div>
              <span class="eyebrow">PAYMENT</span>
              <h2>Phương thức thanh toán.</h2>
            </div>
          </div>
          <div class="checkout-payment-list">
            <label
              v-if="isDelivery"
              class="checkout-payment-option"
              :class="{ active: paymentMethod === 'COD' }"
              ><input v-model="paymentMethod" type="radio" value="COD" />
              <div>
                <strong>Thanh toán khi nhận hàng (COD)</strong
                ><small>Thanh toán cho người giao hàng sau khi nhận đơn</small>
              </div>
              <CheckCircle2 v-if="paymentMethod === 'COD'" :size="20"
            /></label>
            <label
              v-else
              class="checkout-payment-option"
              :class="{ active: paymentMethod === 'TIEN_MAT' }"
              ><input v-model="paymentMethod" type="radio" value="TIEN_MAT" />
              <div>
                <strong>Thanh toán tại quầy</strong
                ><small>Trả tiền mặt khi nhận đồ uống tại quán</small>
              </div>
              <CheckCircle2 v-if="paymentMethod === 'TIEN_MAT'" :size="20"
            /></label>
            <label
              class="checkout-payment-option"
              :class="{ active: paymentMethod === 'VNPAY' }"
              ><input
                v-model="paymentMethod"
                type="radio"
                value="VNPAY"
              /><CreditCard :size="19" />
              <div>
                <strong>VNPay Sandbox</strong
                ><small
                  >Chuyển đến cổng VNPay để thanh toán sau khi tạo đơn</small
                >
              </div>
              <span class="cs34-vnpay-label">TRỰC TUYẾN</span></label
            >
          </div>
        </section>
      </main>

      <aside class="checkout-summary">
        <span class="eyebrow">ORDER REVIEW</span>
        <h2>Đơn hàng của bạn.</h2>
        <div
          v-for="item in cart.items"
          :key="item.ma_chi_tiet_gio"
          class="checkout-summary-item"
        >
          <div>
            <strong>{{ item.ten_san_pham }}</strong
            ><small>{{ item.ten_bien_the }} · SL {{ item.so_luong }}</small
            ><small v-if="item.tuy_chon_da_chon?.length">{{
              item.tuy_chon_da_chon.map((o) => o.ten_tuy_chon).join(", ")
            }}</small>
          </div>
          <strong>{{ formatVND(item.thanh_tien) }}</strong>
        </div>
        <div class="field checkout-coupon">
          <label for="coupon">Mã ưu đãi</label>
          <div class="checkout-coupon-input">
            <TicketPercent :size="18" /><input
              id="coupon"
              v-model="couponCode"
              maxlength="50"
              placeholder="Nhập mã giảm giá"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="price-line">
          <span>Tạm tính</span
          ><strong>{{ formatVND(quote?.tam_tinh ?? cart.subtotal) }}</strong>
        </div>
        <div class="price-line">
          <span>Giảm giá</span
          ><span>{{
            quote ? `− ${formatVND(quote.tien_giam)}` : "Chưa áp dụng"
          }}</span>
        </div>
        <div class="price-line">
          <span>Phí giao hàng</span
          ><span>{{ quote ? formatVND(quote.phi_giao) : "Chưa tính" }}</span>
        </div>
        <hr class="line-divider" />
        <div class="price-line checkout-grand-total">
          <strong>Tổng thanh toán</strong
          ><strong>{{ quote ? formatVND(quote.tong_tien) : "—" }}</strong>
        </div>
        <p v-if="quote" class="notice notice-success checkout-quote-success">
          <ShieldCheck :size="17" /> Tổng tiền đã được Backend kiểm tra. Giá sẽ
          được kiểm tra lại lúc đặt.
        </p>
        <button
          class="btn btn-light btn-block"
          :disabled="quoting || busy || cart.loading"
          @click="getQuote"
        >
          {{ quoting ? "ĐANG KIỂM TRA..." : "KIỂM TRA TỔNG TIỀN" }}
        </button>
        <label class="checkout-consent"
          ><input v-model="accepted" type="checkbox" /> Tôi đã kiểm tra sản
          phẩm, địa chỉ và phương thức thanh toán.</label
        >
        <button
          class="btn btn-dark btn-block"
          :disabled="busy || quoting || !quote"
          @click="submit"
        >
          {{
            busy
              ? "ĐANG TẠO ĐƠN..."
              : paymentMethod === "VNPAY"
                ? "ĐẶT ĐƠN & THANH TOÁN VNPAY"
                : "XÁC NHẬN ĐẶT HÀNG"
          }}
          <ArrowRight :size="16" />
        </button>
        <RouterLink to="/cart" class="checkout-back-link"
          ><ArrowLeft :size="15" /> Quay lại giỏ hàng</RouterLink
        >
        <p class="checkout-footnote">
          Backend kiểm tra lại giá và tồn kho khi tạo đơn. VNPay chỉ được xác
          nhận thành công sau khi Backend nhận IPN hợp lệ.
        </p>
      </aside>
    </div>
  </div>
</template>

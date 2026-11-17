import api from "./axios";

// Module 6: Backend tra link thanh toan VNPay Sandbox.
export const startVnpayPayment = (payload) =>
  api.post("/payments/vnpay/create", payload).then((r) => r.data);
export const getMyPaymentStatus = (orderId) =>
  api
    .get(`/payments/vnpay/orders/${encodeURIComponent(orderId)}`)
    .then((r) => r.data);

// Chi goi endpoint verify chu ky tu Backend. KHONG cap nhat CSDL tu frontend/Return.
export const verifyVnpayReturn = (rawQuery) => {
  if (!rawQuery || rawQuery.length > 4096)
    throw new Error("Dữ liệu phản hồi VNPay không hợp lệ.");
  return api
    .get(
      `/payments/vnpay/return${rawQuery.startsWith("?") ? rawQuery : `?${rawQuery}`}`,
    )
    .then((r) => r.data);
};

export function toSafeSandboxUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "sandbox.vnpayment.vn" ||
    u.pathname !== "/paymentv2/vpcpay.html"
  ) {
    throw new Error("Địa chỉ cổng thanh toán không hợp lệ.");
  }
  return u.toString();
}

// Chua dang nhap: Backend yeu cau ma_don va sdt_nguoi_nhan.
export function paymentIdentity(order, isLoggedIn, phone) {
  if (isLoggedIn) return { ma_don_hang: Number(order.ma_don_hang) };
  return { ma_don: order.ma_don, sdt_nguoi_nhan: phone };
}

export const PENDING_KEY = "coffeShopVnpayPending";
export const setPaymentContext = (
  order,
  phone,
  ref = null,
  isGuest = false,
) => {
  sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({
      ma_don_hang: order.ma_don_hang,
      ma_don: order.ma_don,
      sdt_nguoi_nhan: phone || "",
      ma_tham_chieu: ref,
      isGuest,
    }),
  );
};
export const getPaymentContext = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
};

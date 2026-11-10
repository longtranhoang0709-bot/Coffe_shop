"use strict";
// VNPAY PAY API 2.1.0 - tao va xac minh chu ky HMAC-SHA512.
// Khong bao gio dua HASH_SECRET vao frontend.
const crypto = require("node:crypto");
const VERSION = "2.1.0";
const ZONE = "Asia/Ho_Chi_Minh";
const LIFE_MS = 15 * 60 * 1000;

function invalid(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}
function config() {
  const tmnCode = (process.env.VNPAY_TMN_CODE || "").trim();
  const secret = (process.env.VNPAY_HASH_SECRET || "").trim();
  const url = (
    process.env.VNPAY_URL ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
  ).trim();
  const returnUrl = (process.env.VNPAY_RETURN_URL || "").trim();
  if (!tmnCode || !secret || !returnUrl)
    throw invalid(
      "Chua cau hinh VNPAY_TMN_CODE, VNPAY_HASH_SECRET hoac VNPAY_RETURN_URL.",
      503,
    );
  if (secret.length < 8) throw invalid("VNPAY_HASH_SECRET khong hop le.", 503);
  let gateway;
  let redirect;
  try {
    gateway = new URL(url);
    redirect = new URL(returnUrl);
  } catch {
    throw invalid("VNPAY_URL hoac VNPAY_RETURN_URL khong hop le.", 503);
  }
  if (
    gateway.protocol !== "https:" ||
    gateway.hostname !== "sandbox.vnpayment.vn"
  ) {
    throw invalid(
      "Module 6 chi cho phep cong VNPAY Sandbox https://sandbox.vnpayment.vn.",
      503,
    );
  }
  if (
    !(
      redirect.protocol === "https:" ||
      (redirect.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(redirect.hostname))
    )
  ) {
    throw invalid(
      "VNPAY_RETURN_URL can HTTPS hoac HTTP localhost de thu nghiem.",
      503,
    );
  }
  return {
    tmnCode,
    secret,
    gateway: gateway.toString(),
    returnUrl: redirect.toString(),
  };
}
function encode(v) {
  return encodeURIComponent(String(v))
    .replace(
      /[!'()*]/g,
      (x) => "%" + x.charCodeAt(0).toString(16).toUpperCase(),
    )
    .replace(/%20/g, "+");
}
function sortedQuery(params) {
  return Object.keys(params)
    .sort()
    .filter(
      (k) =>
        params[k] !== undefined &&
        params[k] !== null &&
        String(params[k]) !== "",
    )
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join("&");
}
function hmac(params, secret) {
  return crypto
    .createHmac("sha512", secret)
    .update(sortedQuery(params), "utf8")
    .digest("hex");
}
function dateStamp(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return obj.year + obj.month + obj.day + obj.hour + obj.minute + obj.second;
}
function stampToMs(stamp) {
  if (!/^\d{14}$/.test(stamp))
    throw invalid("Dinh dang ngay tao thanh toan khong hop le.");
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(8, 10)}:${stamp.slice(10, 12)}:${stamp.slice(12, 14)}+07:00`;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || dateStamp(new Date(ms)) !== stamp)
    throw invalid("Ngay tao thanh toan khong hop le.");
  return ms;
}
function makeTxnRef(orderId) {
  return `CS${orderId}T${dateStamp()}R${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}
function readTxnRef(ref) {
  const match = /^CS([1-9]\d*)T(\d{14})R([A-F0-9]{10})$/.exec(ref || "");
  if (!match) throw invalid("Ma tham chieu VNPay khong hop le.");
  const ms = stampToMs(match[2]);
  return {
    orderId: Number(match[1]),
    createDate: match[2],
    createdMs: ms,
    expiresMs: ms + LIFE_MS,
  };
}
function amountToVnp(value) {
  const s = String(value);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!match || !/^0*$/.test(match[2] || "") || BigInt(match[1]) < 1n) {
    throw invalid("Don VNPay can tong tien la so nguyen VND lon hon 0.", 409);
  }
  const amount = BigInt(match[1]) * 100n;
  if (amount.toString().length > 12)
    throw invalid("So tien vuot gioi han VNPay.", 409);
  return amount.toString();
}
function clientIp(req) {
  // Khong tu tin header X-Forwarded-For khi reverse proxy chua cau hinh tin cay.
  const raw = String(req.ip || req.socket?.remoteAddress || "127.0.0.1");
  if (raw === "::1") return "127.0.0.1";
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}
function createPaymentUrl({ orderCode, amount, txnRef, ip }) {
  const cfg = config();
  const ref = readTxnRef(txnRef);
  if (Date.now() > ref.expiresMs)
    throw invalid(
      "Link thanh toan da het han; can kiem tra giao dich voi Admin.",
      409,
    );
  const params = {
    vnp_Version: VERSION,
    vnp_Command: "pay",
    vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: amountToVnp(amount),
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${orderCode}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: cfg.returnUrl,
    vnp_IpAddr: ip || "127.0.0.1",
    vnp_CreateDate: ref.createDate,
    vnp_ExpireDate: dateStamp(new Date(ref.expiresMs)),
  };
  const query = sortedQuery(params);
  const signature = hmac(params, cfg.secret);
  const join = cfg.gateway.includes("?") ? "&" : "?";
  return {
    paymentUrl: `${cfg.gateway}${join}${query}&vnp_SecureHash=${signature}`,
    expireAt: new Date(ref.expiresMs).toISOString(),
    txnRef,
  };
}
function parseSignedQuery(originalUrl) {
  const cfg = config();
  const url = new URL(originalUrl, "http://localhost");
  const params = {};
  let count = 0;
  for (const [key, value] of url.searchParams) {
    if (
      ++count > 35 ||
      !/^vnp_[A-Za-z0-9]+$/.test(key) ||
      Object.prototype.hasOwnProperty.call(params, key)
    ) {
      return { ok: false, reason: "Tham so phan hoi khong hop le." };
    }
    params[key] = value;
  }
  const sent = params.vnp_SecureHash;
  if (!sent || !/^[a-f0-9]{128}$/i.test(sent))
    return { ok: false, reason: "Thieu hoac sai chu ky." };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const expected = hmac(params, cfg.secret);
  if (
    !crypto.timingSafeEqual(
      Buffer.from(sent.toLowerCase(), "hex"),
      Buffer.from(expected, "hex"),
    )
  ) {
    return { ok: false, reason: "Chu ky khong hop le." };
  }
  for (const field of [
    "vnp_TmnCode",
    "vnp_TxnRef",
    "vnp_Amount",
    "vnp_ResponseCode",
    "vnp_TransactionStatus",
  ]) {
    if (!params[field]) return { ok: false, reason: `Thieu ${field}.` };
  }
  if (params.vnp_TmnCode !== cfg.tmnCode)
    return { ok: false, reason: "Sai ma website VNPay." };
  if (!/^\d{1,12}$/.test(params.vnp_Amount))
    return { ok: false, reason: "So tien phan hoi khong hop le." };
  if (params.vnp_CurrCode && params.vnp_CurrCode !== "VND")
    return { ok: false, reason: "Loai tien khong hop le." };
  return { ok: true, params };
}
module.exports = {
  invalid,
  config,
  makeTxnRef,
  readTxnRef,
  amountToVnp,
  clientIp,
  createPaymentUrl,
  parseSignedQuery,
};

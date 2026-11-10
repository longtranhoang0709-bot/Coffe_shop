"use strict";

const reports = require("../models/reportModel");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function vnToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function parseDay(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw bad(`${name} phai co dinh dang YYYY-MM-DD.`);
  }
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString().slice(0, 10) !== value
  ) {
    throw bad(`${name} khong phai ngay hop le.`);
  }
  return ms;
}
function bad(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
function positiveLimit(value, fallback = 10) {
  if (value == null) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value))
    throw bad("limit phai la so nguyen duong.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > 50) throw bad("limit toi da 50.");
  return n;
}
function parseRange(query) {
  const today = vnToday();
  const to = query.to || today;
  const endMs = parseDay(to, "to");
  const from =
    query.from || new Date(endMs - 29 * MS_PER_DAY).toISOString().slice(0, 10);
  const startMs = parseDay(from, "from");
  const dayCount = (endMs - startMs) / MS_PER_DAY + 1;
  if (dayCount < 1) throw bad("from khong duoc lon hon to.");
  if (dayCount > 3660) throw bad("Khoang thoi gian toi da 3660 ngay.");
  return {
    from: `${from} 00:00:00`,
    toExclusive: `${new Date(endMs + MS_PER_DAY).toISOString().slice(0, 10)} 00:00:00`,
    hien_thi: { tu_ngay: from, den_ngay: to },
    dayCount,
  };
}
function groupByValue(raw, days) {
  const g = raw || "day";
  if (!["day", "month", "year"].includes(g))
    throw bad("groupBy chi nhan day, month hoac year.");
  if (g === "day" && days > 366)
    throw bad(
      "Bao cao theo ngay chi ho tro toi da 366 ngay. Hay dung groupBy=month hoac year.",
    );
  return g;
}
function fillRevenue(rows, range, groupBy) {
  // Bo sung cac ky chua phat sinh doanh thu (gia tri 0) de ve bieu do lien tuc.
  const existing = new Map(rows.map((row) => [row.ky_bao_cao, row]));
  const start = new Date(`${range.hien_thi.tu_ngay}T00:00:00.000Z`);
  const last = new Date(`${range.hien_thi.den_ngay}T00:00:00.000Z`);
  if (groupBy === "month") start.setUTCDate(1);
  if (groupBy === "year") {
    start.setUTCMonth(0, 1);
  }
  const data = [];
  for (let d = start; d <= last; ) {
    const yyyy = String(d.getUTCFullYear());
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const key =
      groupBy === "year"
        ? yyyy
        : groupBy === "month"
          ? `${yyyy}-${mm}`
          : `${yyyy}-${mm}-${dd}`;
    data.push(
      existing.get(key) || {
        ky_bao_cao: key,
        so_don: 0,
        tong_tien_thu: "0.00",
        doanh_thu_hang_hoa: "0.00",
      },
    );
    const next = new Date(d.getTime());
    if (groupBy === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
    else if (groupBy === "month") next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + 1);
    d = next;
  }
  return data;
}
function sortValue(raw) {
  const s = raw || "revenue";
  if (!["revenue", "quantity"].includes(s))
    throw bad("sort chi nhan revenue hoac quantity.");
  return s;
}
function inventoryParams(query) {
  const onlyLow = query.onlyLow === undefined || query.onlyLow === "true";
  if (query.onlyLow != null && !["true", "false"].includes(query.onlyLow)) {
    throw bad("onlyLow chi nhan true hoac false.");
  }
  return { onlyLow, limit: positiveLimit(query.limit, 20) };
}
function safely(work) {
  return async (req, res, next) => {
    try {
      res.set("Cache-Control", "private, no-store");
      res.set("Vary", "Authorization");
      const data = await work(req);
      return res.json(data);
    } catch (error) {
      if (error.statusCode)
        return res.status(error.statusCode).json({ message: error.message });
      return next(error);
    }
  };
}
const withRange = (fn) =>
  safely(async (req) => {
    const r = parseRange(req.query);
    return { khoang_thoi_gian: r.hien_thi, ...(await fn(req, r)) };
  });

const overview = withRange(async (_, r) => ({
  ket_qua: await reports.overview(r),
}));
const revenue = withRange(async (req, r) => {
  const groupBy = groupByValue(req.query.groupBy, r.dayCount);
  return {
    groupBy,
    danh_sach: fillRevenue(
      await reports.revenue({ ...r, groupBy }),
      r,
      groupBy,
    ),
  };
});
const topProducts = withRange(async (req, r) => {
  const limit = positiveLimit(req.query.limit);
  const sort = sortValue(req.query.sort);
  return { sort, danh_sach: await reports.topProducts({ ...r, limit, sort }) };
});
const categories = withRange(async (_, r) => ({
  danh_sach: await reports.categories(r),
}));
const paymentMethods = withRange(async (_, r) => ({
  danh_sach: await reports.paymentMethods(r),
}));
const orderStatuses = withRange(async (_, r) => ({
  danh_sach: await reports.orderStatuses(r),
}));
const inventory = safely(async (req) =>
  reports.inventory(inventoryParams(req.query)),
);
const recentOrders = withRange(async (req, r) => ({
  danh_sach: await reports.recentOrders({
    ...r,
    limit: positiveLimit(req.query.limit),
  }),
}));
const dashboard = withRange(async (req, r) => {
  const groupBy = groupByValue(req.query.groupBy, r.dayCount);
  const sort = sortValue(req.query.sort);
  const limit = positiveLimit(req.query.limit);
  const [
    tong_quan,
    bieu_do,
    san_pham_ban_chay,
    danh_muc,
    phuong_thuc_thanh_toan,
    trang_thai_don_hang,
    ton_kho,
    don_gan_day,
  ] = await Promise.all([
    reports.overview(r),
    reports.revenue({ ...r, groupBy }),
    reports.topProducts({ ...r, limit, sort }),
    reports.categories(r),
    reports.paymentMethods(r),
    reports.orderStatuses(r),
    reports.inventory({ onlyLow: true, limit }),
    reports.recentOrders({ ...r, limit }),
  ]);
  return {
    groupBy,
    sort,
    tong_quan,
    bieu_do: fillRevenue(bieu_do, r, groupBy),
    san_pham_ban_chay,
    danh_muc,
    phuong_thuc_thanh_toan,
    trang_thai_don_hang,
    ton_kho,
    don_gan_day,
    ghi_chu:
      "Doanh thu tinh theo ngay hoan thanh va da thanh toan; thong ke trang thai/don gan day theo ngay dat. Doanh so san pham chua tru giam gia, chua cong phi giao.",
  };
});

module.exports = {
  dashboard,
  overview,
  revenue,
  topProducts,
  categories,
  paymentMethods,
  orderStatuses,
  inventory,
  recentOrders,
};

"use strict";

// Module 7 - Bao cao va thong ke. KHONG ghi hay sua du lieu MySQL.
// Chi tinh doanh thu voi DON_HANG=HOAN_THANH va THANH_TOAN=THANH_CONG.
const pool = require("../config/db");

const PAID = `d.trang_thai_don = 'HOAN_THANH'
  AND t.trang_thai_thanh_toan = 'THANH_CONG'
  AND d.ngay_hoan_thanh >= ? AND d.ngay_hoan_thanh < ?`;

const PERIOD_FORMAT = Object.freeze({
  day: "%Y-%m-%d",
  month: "%Y-%m",
  year: "%Y",
});

async function overview({ from, toExclusive }) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS don_hoan_thanh,
       COALESCE(SUM(d.tong_tien), 0) AS tong_tien_thu,
       COALESCE(SUM(d.tam_tinh - d.tien_giam), 0) AS doanh_thu_hang_hoa,
       COALESCE(SUM(d.phi_giao), 0) AS phi_giao_da_thu,
       COALESCE(SUM(d.tien_giam), 0) AS tong_giam_gia,
       COALESCE(AVG(d.tong_tien), 0) AS trung_binh_moi_don
     FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang = d.ma_don_hang
     WHERE ${PAID}`,
    [from, toExclusive],
  );
  // mysql2 tra DECIMAL dang string, de giu do chinh xac so tien.
  return rows[0];
}

async function revenue({ from, toExclusive, groupBy }) {
  // groupBy duoc validate o controller, format chi lay tu danh sach co dinh.
  const format = PERIOD_FORMAT[groupBy];
  if (!format) throw new Error("groupBy khong duoc ho tro.");
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(d.ngay_hoan_thanh, '${format}') AS ky_bao_cao,
       COUNT(*) AS so_don,
       COALESCE(SUM(d.tong_tien), 0) AS tong_tien_thu,
       COALESCE(SUM(d.tam_tinh - d.tien_giam), 0) AS doanh_thu_hang_hoa
     FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang = d.ma_don_hang
     WHERE ${PAID}
     GROUP BY ky_bao_cao ORDER BY ky_bao_cao ASC`,
    [from, toExclusive],
  );
  return rows;
}

async function topProducts({ from, toExclusive, limit, sort }) {
  const orderBy = sort === "quantity" ? "so_luong_ban" : "doanh_so_truoc_giam";
  const [rows] = await pool.execute(
    `SELECT p.ma_san_pham, p.ten_san_pham, p.loai_san_pham,
        SUM(ct.so_luong) AS so_luong_ban,
        COUNT(DISTINCT d.ma_don_hang) AS so_don,
        COALESCE(SUM(ct.thanh_tien), 0) AS doanh_so_truoc_giam
     FROM CHI_TIET_DON_HANG ct
     JOIN DON_HANG d ON d.ma_don_hang = ct.ma_don_hang
     JOIN THANH_TOAN t ON t.ma_don_hang = d.ma_don_hang
     JOIN BIEN_THE_SAN_PHAM b ON b.ma_bien_the = ct.ma_bien_the
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     WHERE ${PAID}
     GROUP BY p.ma_san_pham, p.ten_san_pham, p.loai_san_pham
     ORDER BY ${orderBy} DESC, p.ma_san_pham ASC
     LIMIT ?`,
    [from, toExclusive, limit],
  );
  return rows;
}

async function categories({ from, toExclusive }) {
  const [rows] = await pool.execute(
    `SELECT dm.ma_danh_muc, dm.ten_danh_muc,
        COUNT(DISTINCT d.ma_don_hang) AS so_don,
        COALESCE(SUM(ct.so_luong), 0) AS so_luong_ban,
        COALESCE(SUM(ct.thanh_tien), 0) AS doanh_so_truoc_giam
     FROM CHI_TIET_DON_HANG ct
     JOIN DON_HANG d ON d.ma_don_hang = ct.ma_don_hang
     JOIN THANH_TOAN t ON t.ma_don_hang = d.ma_don_hang
     JOIN BIEN_THE_SAN_PHAM b ON b.ma_bien_the = ct.ma_bien_the
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     JOIN DANH_MUC dm ON dm.ma_danh_muc = p.ma_danh_muc
     WHERE ${PAID}
     GROUP BY dm.ma_danh_muc, dm.ten_danh_muc
     ORDER BY doanh_so_truoc_giam DESC, dm.ma_danh_muc ASC`,
    [from, toExclusive],
  );
  return rows;
}

async function paymentMethods({ from, toExclusive }) {
  const [rows] = await pool.execute(
    `SELECT t.phuong_thuc, COUNT(*) AS so_don,
        COALESCE(SUM(d.tong_tien), 0) AS tong_tien_thu
     FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang = d.ma_don_hang
     WHERE ${PAID}
     GROUP BY t.phuong_thuc ORDER BY tong_tien_thu DESC`,
    [from, toExclusive],
  );
  return rows;
}

async function orderStatuses({ from, toExclusive }) {
  // Thong ke trang thai dua tren NGAY DAT, khac voi ngay hoan thanh cua doanh thu.
  const [rows] = await pool.execute(
    `SELECT d.trang_thai_don, COUNT(*) AS so_don,
        COALESCE(SUM(d.tong_tien), 0) AS gia_tri_don_khong_phai_doanh_thu
     FROM DON_HANG d
     WHERE d.ngay_dat >= ? AND d.ngay_dat < ?
     GROUP BY d.trang_thai_don ORDER BY so_don DESC, d.trang_thai_don ASC`,
    [from, toExclusive],
  );
  return rows;
}

async function inventory({ onlyLow, limit }) {
  const lowCondition = onlyLow
    ? "AND (k.ma_bien_the IS NULL OR k.so_luong_ton <= k.muc_ton_toi_thieu)"
    : "";
  const [items] = await pool.execute(
    `SELECT b.ma_bien_the, b.ma_sku, b.ten_bien_the,
        p.ma_san_pham, p.ten_san_pham,
        COALESCE(k.so_luong_ton,0) AS so_luong_ton,
        COALESCE(k.muc_ton_toi_thieu,0) AS muc_ton_toi_thieu,
        CASE WHEN k.ma_bien_the IS NULL OR k.so_luong_ton <= k.muc_ton_toi_thieu
          THEN 1 ELSE 0 END AS canh_bao_ton_kho
     FROM BIEN_THE_SAN_PHAM b
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     LEFT JOIN TON_KHO_SAN_PHAM k ON k.ma_bien_the = b.ma_bien_the
     WHERE p.loai_san_pham = 'DONG_GOI' AND p.dang_ban = 1 AND b.dang_ban = 1
       ${lowCondition}
     ORDER BY canh_bao_ton_kho DESC, so_luong_ton ASC, b.ma_bien_the ASC
     LIMIT ?`,
    [limit],
  );
  const [counts] = await pool.query(
    `SELECT COUNT(*) AS tong_bien_the_dang_ban,
       COALESCE(SUM(CASE WHEN k.ma_bien_the IS NULL OR k.so_luong_ton <= k.muc_ton_toi_thieu
         THEN 1 ELSE 0 END), 0) AS so_bien_the_sap_het
     FROM BIEN_THE_SAN_PHAM b
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     LEFT JOIN TON_KHO_SAN_PHAM k ON k.ma_bien_the = b.ma_bien_the
     WHERE p.loai_san_pham='DONG_GOI' AND p.dang_ban=1 AND b.dang_ban=1`,
  );
  return { tong_quan: counts[0], danh_sach: items };
}

async function recentOrders({ from, toExclusive, limit }) {
  const [rows] = await pool.execute(
    `SELECT d.ma_don_hang, d.ma_don, d.ngay_dat, d.trang_thai_don,
       d.hinh_thuc_nhan, d.tong_tien, t.phuong_thuc, t.trang_thai_thanh_toan
     FROM DON_HANG d LEFT JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
     WHERE d.ngay_dat >= ? AND d.ngay_dat < ?
     ORDER BY d.ngay_dat DESC, d.ma_don_hang DESC LIMIT ?`,
    [from, toExclusive, limit],
  );
  return rows;
}

module.exports = {
  overview,
  revenue,
  topProducts,
  categories,
  paymentMethods,
  orderStatuses,
  inventory,
  recentOrders,
};

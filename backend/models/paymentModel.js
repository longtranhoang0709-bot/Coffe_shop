"use strict";
const pool = require("../config/db");
const vnpay = require("../services/vnpayService");

function notFound() {
  throw vnpay.invalid("Khong tim thay don hang hop le.", 404);
}
function strictId(v) {
  return Number.isSafeInteger(v) && v > 0;
}

async function getPendingOrder(conn, identity) {
  let rows;
  if (identity.userId) {
    if (!strictId(identity.ma_don_hang))
      throw vnpay.invalid("ma_don_hang phai la so nguyen duong.");
    [rows] = await conn.execute(
      `SELECT d.ma_don_hang,d.ma_don,d.ma_nguoi_dung,d.trang_thai_don,d.tong_tien,
       t.ma_thanh_toan,t.phuong_thuc,t.trang_thai_thanh_toan,t.ma_giao_dich_vnpay,t.so_tien
       FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
       WHERE d.ma_don_hang=? AND d.ma_nguoi_dung=? FOR UPDATE`,
      [identity.ma_don_hang, identity.userId],
    );
  } else {
    if (
      typeof identity.ma_don !== "string" ||
      !/^CS[0-9A-Za-z-]{10,50}$/.test(identity.ma_don) ||
      typeof identity.sdt_nguoi_nhan !== "string" ||
      !/^\+?[0-9 .()-]{9,20}$/.test(identity.sdt_nguoi_nhan)
    ) {
      throw vnpay.invalid(
        "Khach vang lai can ma_don va sdt_nguoi_nhan hop le.",
      );
    }
    [rows] = await conn.execute(
      `SELECT d.ma_don_hang,d.ma_don,d.ma_nguoi_dung,d.trang_thai_don,d.tong_tien,
       t.ma_thanh_toan,t.phuong_thuc,t.trang_thai_thanh_toan,t.ma_giao_dich_vnpay,t.so_tien
       FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
       WHERE d.ma_don=? AND d.sdt_nguoi_nhan=? AND d.ma_nguoi_dung IS NULL FOR UPDATE`,
      [identity.ma_don, identity.sdt_nguoi_nhan],
    );
  }
  if (!rows.length) notFound();
  return rows[0];
}

async function startPayment(identity, ip) {
  vnpay.config(); // Cau hinh phai hop le TRUOC khi ghi CSDL.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const order = await getPendingOrder(conn, identity);
    if (order.phuong_thuc !== "VNPAY")
      throw vnpay.invalid("Don nay khong chon phuong thuc VNPAY.", 409);
    if (order.trang_thai_don !== "CHO_XAC_NHAN")
      throw vnpay.invalid("Chi tao link cho don dang CHO_XAC_NHAN.", 409);
    if (order.trang_thai_thanh_toan !== "CHUA_THANH_TOAN")
      throw vnpay.invalid("Don khong con o trang thai cho thanh toan.", 409);
    if (String(order.so_tien) !== String(order.tong_tien)) {
      // MySQL decimal strings should match; handle formatting independently.
      if (
        vnpay.amountToVnp(order.so_tien) !== vnpay.amountToVnp(order.tong_tien)
      )
        throw vnpay.invalid("So tien thanh toan va don hang khong khop.", 409);
    }
    const ref = order.ma_giao_dich_vnpay || vnpay.makeTxnRef(order.ma_don_hang);
    const parsed = vnpay.readTxnRef(ref);
    if (parsed.orderId !== order.ma_don_hang)
      throw vnpay.invalid("Ma giao dich khong khop don hang.", 409);
    const result = vnpay.createPaymentUrl({
      orderCode: order.ma_don,
      amount: order.so_tien,
      txnRef: ref,
      ip,
    });
    if (!order.ma_giao_dich_vnpay) {
      await conn.execute(
        "UPDATE THANH_TOAN SET ma_giao_dich_vnpay=? WHERE ma_thanh_toan=?",
        [ref, order.ma_thanh_toan],
      );
    }
    await conn.commit();
    return {
      ma_don_hang: order.ma_don_hang,
      ma_don: order.ma_don,
      tong_tien: order.tong_tien,
      ma_tham_chieu: ref,
      paymentUrl: result.paymentUrl,
      het_han_luc: result.expireAt,
      ghi_chu:
        "Mo paymentUrl trong trinh duyet. Chi IPN hop le moi cap nhat THANH_CONG.",
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function applyIpn(params) {
  const ref = String(params.vnp_TxnRef);
  // Tra ve ma IPN theo giao thuc VNPAY; khong tiet lo du lieu noi bo.
  const [lookup] = await pool.execute(
    "SELECT ma_don_hang FROM THANH_TOAN WHERE ma_giao_dich_vnpay=? LIMIT 1",
    [ref],
  );
  if (!lookup.length) return { RspCode: "01", Message: "Order not found" };
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = lookup[0].ma_don_hang;
    const [rows] = await conn.execute(
      `SELECT d.ma_don_hang,d.trang_thai_don,d.tong_tien,t.ma_thanh_toan,t.phuong_thuc,
        t.trang_thai_thanh_toan,t.ma_giao_dich_vnpay,t.so_tien
       FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
       WHERE d.ma_don_hang=? FOR UPDATE`,
      [id],
    );
    const item = rows[0];
    if (
      !item ||
      item.ma_giao_dich_vnpay !== ref ||
      item.phuong_thuc !== "VNPAY"
    ) {
      await conn.rollback();
      return { RspCode: "01", Message: "Order not found" };
    }
    const correctAmount = vnpay.amountToVnp(item.so_tien);
    if (
      correctAmount !== params.vnp_Amount ||
      vnpay.amountToVnp(item.tong_tien) !== params.vnp_Amount
    ) {
      await conn.rollback();
      return { RspCode: "04", Message: "Invalid amount" };
    }
    if (item.trang_thai_thanh_toan !== "CHUA_THANH_TOAN") {
      await conn.rollback();
      return { RspCode: "02", Message: "Order already confirmed" };
    }
    if (item.trang_thai_don === "DA_HUY") {
      // Khong cap nhat thanh toan cho don da huy: can doi soat thu cong.
      await conn.rollback();
      console.error("CAN DOI SOAT VNPay: IPN toi don da huy:", id);
      return {
        RspCode: "99",
        Message: "Order cancelled - manual reconciliation required",
      };
    }
    const success =
      params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00";
    if (success && !/^\d{1,20}$/.test(params.vnp_TransactionNo || "")) {
      await conn.rollback();
      return { RspCode: "99", Message: "Missing transaction number" };
    }
    const nextStatus = success ? "THANH_CONG" : "THAT_BAI";
    const [updated] = await conn.execute(
      `UPDATE THANH_TOAN SET trang_thai_thanh_toan=?,
       ngay_thanh_toan=IF(?='THANH_CONG',NOW(),NULL)
       WHERE ma_thanh_toan=? AND trang_thai_thanh_toan='CHUA_THANH_TOAN'`,
      [nextStatus, nextStatus, item.ma_thanh_toan],
    );
    if (updated.affectedRows !== 1) {
      await conn.rollback();
      return { RspCode: "02", Message: "Order already confirmed" };
    }
    await conn.commit();
    return { RspCode: "00", Message: "Confirm Success" };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function findStatus(userId, orderId) {
  const [rows] = await pool.execute(
    `SELECT d.ma_don_hang,d.ma_don,d.trang_thai_don,t.phuong_thuc,
       t.trang_thai_thanh_toan,t.so_tien,t.ngay_thanh_toan
     FROM DON_HANG d JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
     WHERE d.ma_don_hang=? AND d.ma_nguoi_dung=?`,
    [orderId, userId],
  );
  if (!rows.length) notFound();
  return rows[0];
}
module.exports = { startPayment, applyIpn, findStatus };

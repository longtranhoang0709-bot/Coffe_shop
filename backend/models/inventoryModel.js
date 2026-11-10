"use strict";
const pool = require("../config/db");
function fail(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
async function list({ onlyLow = false } = {}) {
  const [rows] = await pool.query(
    `SELECT b.ma_bien_the,b.ma_sku,p.ten_san_pham,b.ten_bien_the,
            b.dang_ban AS bien_the_dang_ban,
            COALESCE(k.so_luong_ton,0) AS so_luong_ton,
            COALESCE(k.muc_ton_toi_thieu,0) AS muc_ton_toi_thieu,
            k.ngay_cap_nhat
     FROM BIEN_THE_SAN_PHAM b JOIN SAN_PHAM p ON p.ma_san_pham=b.ma_san_pham
     LEFT JOIN TON_KHO_SAN_PHAM k ON k.ma_bien_the=b.ma_bien_the
     WHERE p.loai_san_pham='DONG_GOI' ORDER BY p.ma_san_pham,b.ma_bien_the`,
  );
  return onlyLow
    ? rows.filter((r) => Number(r.so_luong_ton) <= Number(r.muc_ton_toi_thieu))
    : rows;
}
async function patch(id, change) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT b.ma_bien_the,p.loai_san_pham FROM BIEN_THE_SAN_PHAM b
       JOIN SAN_PHAM p ON p.ma_san_pham=b.ma_san_pham
       WHERE b.ma_bien_the=? FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw fail(404, "Khong tim thay bien the.");
    if (rows[0].loai_san_pham !== "DONG_GOI")
      throw fail(409, "Chi quan ly ton kho thanh pham DONG_GOI.");
    const [inventory] = await conn.execute(
      "SELECT * FROM TON_KHO_SAN_PHAM WHERE ma_bien_the=? FOR UPDATE",
      [id],
    );
    if (!inventory.length) {
      await conn.execute(
        `INSERT INTO TON_KHO_SAN_PHAM (ma_bien_the,so_luong_ton,muc_ton_toi_thieu) VALUES (?,?,?)`,
        [id, change.so_luong_ton ?? 0, change.muc_ton_toi_thieu ?? 0],
      );
    } else {
      const parts = Object.keys(change).map((k) => `${k}=?`);
      await conn.execute(
        `UPDATE TON_KHO_SAN_PHAM SET ${parts.join(",")}, ngay_cap_nhat=NOW() WHERE ma_bien_the=?`,
        [...Object.values(change), id],
      );
    }
    const [updated] = await conn.execute(
      "SELECT * FROM TON_KHO_SAN_PHAM WHERE ma_bien_the=?",
      [id],
    );
    await conn.commit();
    return updated[0];
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
module.exports = { list, patch };

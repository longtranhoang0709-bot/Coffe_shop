"use strict";
const pool = require("../config/db");
function fail(s, msg) {
  return Object.assign(new Error(msg), { statusCode: s });
}
async function list() {
  const [rows] = await pool.execute(
    "SELECT * FROM MA_GIAM_GIA ORDER BY ma_giam_gia DESC",
  );
  return rows;
}
async function insert(data) {
  const keys = Object.keys(data);
  const [result] = await pool.execute(
    `INSERT INTO MA_GIAM_GIA (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    Object.values(data),
  );
  return { ma_giam_gia: result.insertId, ...data };
}
async function update(id, patch) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT * FROM MA_GIAM_GIA WHERE ma_giam_gia=? FOR UPDATE",
      [id],
    );
    if (!rows.length) throw fail(404, "Khong tim thay ma giam gia.");
    const old = rows[0];
    const merged = { ...old, ...patch };
    if (merged.loai_giam === "PHAN_TRAM" && Number(merged.gia_tri_giam) > 100)
      throw fail(400, "Phan tram giam khong duoc vuot 100.");
    if (
      merged.gioi_han_su_dung !== null &&
      Number(merged.gioi_han_su_dung) < Number(old.so_lan_da_dung)
    ) {
      throw fail(409, "Gioi han moi khong duoc thap hon so luot da dung.");
    }
    if (
      new Date(merged.ngay_ket_thuc).getTime() <=
      new Date(merged.ngay_bat_dau).getTime()
    )
      throw fail(400, "Ngay ket thuc phai sau ngay bat dau.");
    await conn.execute(
      `UPDATE MA_GIAM_GIA SET ${Object.keys(patch)
        .map((k) => `${k}=?`)
        .join(",")}
       WHERE ma_giam_gia=?`,
      [...Object.values(patch), id],
    );
    const [done] = await conn.execute(
      "SELECT * FROM MA_GIAM_GIA WHERE ma_giam_gia=?",
      [id],
    );
    await conn.commit();
    return done[0];
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
module.exports = { list, insert, update };

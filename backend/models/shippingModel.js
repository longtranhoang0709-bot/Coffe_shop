"use strict";
const pool = require("../config/db");
function whereActiveOnly(onlyActive) {
  return onlyActive ? "WHERE dang_ap_dung=1" : "";
}
async function list(onlyActive = true) {
  const [rows] = await pool.query(
    `SELECT ma_khu_vuc,ten_khu_vuc,tinh_thanh,phuong_xa,cho_giao_do_uong,
            cho_giao_dong_goi,phi_giao_hang,dang_ap_dung
     FROM KHU_VUC_GIAO_HANG ${whereActiveOnly(onlyActive)}
     ORDER BY tinh_thanh,phuong_xa,ma_khu_vuc`,
  );
  return rows;
}
async function create(data) {
  const keys = Object.keys(data),
    qs = keys.map(() => "?").join(",");
  const [result] = await pool.execute(
    `INSERT INTO KHU_VUC_GIAO_HANG (${keys.join(",")}) VALUES (${qs})`,
    Object.values(data),
  );
  return { ma_khu_vuc: result.insertId, ...data };
}
async function update(id, data) {
  const fields = Object.keys(data);
  const [result] = await pool.execute(
    `UPDATE KHU_VUC_GIAO_HANG SET ${fields.map((k) => `${k}=?`).join(",")} WHERE ma_khu_vuc=?`,
    [...Object.values(data), id],
  );
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute(
    "SELECT * FROM KHU_VUC_GIAO_HANG WHERE ma_khu_vuc=?",
    [id],
  );
  return rows[0];
}
module.exports = { list, create, update };

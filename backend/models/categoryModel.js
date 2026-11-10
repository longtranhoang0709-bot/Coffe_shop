const pool = require("../config/db");

async function listCategories(includeInactive = false) {
  const [rows] = await pool.execute(
    `SELECT ma_danh_muc, ten_danh_muc, mo_ta, dang_hoat_dong
     FROM DANH_MUC
     ${includeInactive ? "" : "WHERE dang_hoat_dong = 1"}
     ORDER BY ma_danh_muc ASC`,
  );
  return rows;
}

async function getCategory(categoryId) {
  const [rows] = await pool.execute(
    `SELECT ma_danh_muc, ten_danh_muc, mo_ta, dang_hoat_dong
     FROM DANH_MUC WHERE ma_danh_muc = ? LIMIT 1`,
    [categoryId],
  );
  return rows[0] || null;
}

async function createCategory(data) {
  const [result] = await pool.execute(
    `INSERT INTO DANH_MUC (ten_danh_muc, mo_ta, dang_hoat_dong)
     VALUES (?, ?, ?)`,
    [data.ten_danh_muc, data.mo_ta ?? null, data.dang_hoat_dong ? 1 : 0],
  );
  return getCategory(result.insertId);
}

async function updateCategory(categoryId, changes) {
  const keys = Object.keys(changes);
  const allowed = new Set(["ten_danh_muc", "mo_ta", "dang_hoat_dong"]);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) {
    throw new Error("Invalid category update fields");
  }
  const assignments = keys.map((key) => `\`${key}\` = ?`).join(", ");
  const values = keys.map((key) =>
    key === "dang_hoat_dong" ? (changes[key] ? 1 : 0) : changes[key],
  );
  await pool.execute(
    `UPDATE DANH_MUC SET ${assignments} WHERE ma_danh_muc = ?`,
    [...values, categoryId],
  );
  return getCategory(categoryId);
}

async function disableCategory(categoryId) {
  const [result] = await pool.execute(
    "UPDATE DANH_MUC SET dang_hoat_dong = 0 WHERE ma_danh_muc = ?",
    [categoryId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  disableCategory,
};
